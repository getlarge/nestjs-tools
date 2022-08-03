import { Logger } from '@nestjs/common/services/logger.service';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ClientProxy, ReadPacket, RmqRecord, WritePacket } from '@nestjs/microservices';
import {
  DISCONNECT_EVENT,
  DISCONNECTED_RMQ_MESSAGE,
  ERROR_EVENT,
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_NOACK,
  RQM_DEFAULT_PERSISTENT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '@nestjs/microservices/constants';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { AmqpConnectionManager, ChannelWrapper, connect } from 'amqp-connection-manager';
import { Channel, Options } from 'amqplib';
import { EventEmitter } from 'events';
import type PromiseBreaker from 'promise-breaker';
import { EmptyError, fromEvent, lastValueFrom, merge, Observable } from 'rxjs';
import { first, map, retryWhen, scan, share, switchMap } from 'rxjs/operators';

import {
  AMQP_DEFAULT_EXCHANGE_OPTIONS,
  AMQP_DEFAULT_EXCHANGE_TYPE,
  CONNECT_FAILED_EVENT,
  CONNECT_FAILED_EVENT_MSG,
} from './amqp.constants';
import { AmqpOptions } from './amqp.interfaces';
import { AmqpRecordSerializer } from './amqp-record.serializer';

export class AmqpClient extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  protected connection: Promise<any>;
  protected client: AmqpConnectionManager = null;
  protected channel: ChannelWrapper = null;
  protected urls: string[] | RmqUrl[];
  protected queue: string;
  protected queueOptions: Options.AssertQueue;
  protected responseEmitter: EventEmitter;
  protected replyQueue: string;
  protected persistent: boolean;
  protected exchange?: string;
  protected exchangeType?: string;
  protected exchangeOptions?: Options.AssertExchange;

  constructor(protected readonly options: AmqpOptions) {
    super();
    this.urls = this.getOptionsProp(this.options, 'urls') || [RQM_DEFAULT_URL];
    this.queue = this.getOptionsProp(this.options, 'queue') || null;
    this.queueOptions = this.getOptionsProp(this.options, 'queueOptions') || RQM_DEFAULT_QUEUE_OPTIONS;
    this.replyQueue = this.getOptionsProp(this.options, 'replyQueue') || null;
    this.persistent = this.getOptionsProp(this.options, 'persistent') || RQM_DEFAULT_PERSISTENT;
    this.exchange = this.getOptionsProp(this.options, 'exchange') || null;
    this.exchangeType = this.getOptionsProp(this.options, 'exchangeType') || AMQP_DEFAULT_EXCHANGE_TYPE;
    this.exchangeOptions = this.getOptionsProp(this.options, 'exchangeOptions') || AMQP_DEFAULT_EXCHANGE_OPTIONS;
    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  close(): void {
    this.channel && this.channel.close();
    this.client && this.client.close();
    this.channel = null;
    this.client = null;
  }

  connect(): Promise<any> {
    if (this.client) {
      return this.connection;
    }
    this.client = this.createClient();
    this.handleError(this.client);
    this.handleDisconnectError(this.client);

    const connect$ = this.connect$(this.client);
    this.connection = lastValueFrom(
      this.mergeDisconnectEvent(this.client, connect$).pipe(
        switchMap(() => this.createChannel()),
        share(),
      ),
    ).catch((err) => {
      if (err instanceof EmptyError) {
        return;
      }
      throw err;
    });
    return this.connection;
  }

  createChannel(): Promise<void> {
    return new Promise((resolve) => {
      this.channel = this.client.createChannel({
        json: false,
        setup: (channel: Channel) => this.setupChannel(channel, resolve),
      });
    });
  }

  createClient(): AmqpConnectionManager {
    const socketOptions = this.getOptionsProp(this.options, 'socketOptions');
    return connect(this.urls, { connectionOptions: socketOptions });
  }

  mergeDisconnectEvent<T = any>(instance: AmqpConnectionManager, source$: Observable<T>): Observable<T> {
    const eventToError = (eventType: string) =>
      fromEvent(instance, eventType).pipe(
        map((err: any) => {
          throw err;
        }),
      );
    const disconnect$ = eventToError(DISCONNECT_EVENT);
    const urls = this.getOptionsProp(this.options, 'urls', []);
    const connectFailed$ = eventToError(CONNECT_FAILED_EVENT).pipe(
      retryWhen((e) =>
        e.pipe(
          scan((errorCount, error: any) => {
            if (urls.indexOf(error.url) >= urls.length - 1) {
              throw error;
            }
            return errorCount + 1;
          }, 0),
        ),
      ),
    );
    return merge(source$, disconnect$, connectFailed$).pipe(first());
  }

  async setupChannel(channel: Channel, resolve: () => void): Promise<void> {
    const prefetchCount = this.getOptionsProp(this.options, 'prefetchCount') || RQM_DEFAULT_PREFETCH_COUNT;
    const isGlobalPrefetchCount =
      this.getOptionsProp(this.options, 'isGlobalPrefetchCount') || RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT;

    if (this.exchange) {
      await channel.assertExchange(this.exchange, this.exchangeType, this.exchangeOptions);
    } else {
      await channel.assertQueue(this.queue, this.queueOptions);
      await channel.prefetch(prefetchCount, isGlobalPrefetchCount);
    }

    this.responseEmitter = new EventEmitter();
    this.responseEmitter.setMaxListeners(0);
    if (this.replyQueue) {
      // await this.consumeChannel();
      await this.consumeChannel(channel);
    }
    resolve();
  }

  async consumeChannel(channel: Channel): Promise<void> {
    const noAck = this.getOptionsProp(this.options, 'noAck', RQM_DEFAULT_NOACK);
    const replyQueue = this.replyQueue;

    await channel.assertQueue(this.replyQueue, this.queueOptions);
    //? const q = await this.channel.assertQueue(this.replyQueue, {});
    //? const replyQueue = q.queue;
    this.channel.addSetup((channel: Channel) =>
      channel.consume(replyQueue, (msg) => this.responseEmitter.emit(msg.properties.correlationId, msg), {
        noAck,
      }),
    );
  }

  handleError(client: any): void {
    client.addListener(ERROR_EVENT, (err: any) => this.logger.error(err));
  }

  handleDisconnectError(client: any): void {
    client.addListener(DISCONNECT_EVENT, (err: any) => {
      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
      this.logger.error(err);
      this.close();
    });
    client.addListener(CONNECT_FAILED_EVENT, (err: any) => {
      this.logger.error(CONNECT_FAILED_EVENT_MSG);
      this.logger.error(err);
      this.close();
    });
  }

  async handleMessage(packet: unknown, callback: (packet: WritePacket) => any): Promise<void> {
    const { err, response, isDisposed } = await this.deserializer.deserialize(packet);
    if (isDisposed || err) {
      callback({
        err,
        response,
        isDisposed: true,
      });
    }
    callback({
      err,
      response,
    });
  }

  protected publish(message: ReadPacket, callback: (packet: WritePacket) => any): () => void {
    try {
      const correlationId = randomStringGenerator();
      const listener = ({ content }: { content: Buffer }) =>
        this.handleMessage(JSON.parse(content.toString()), callback);
      Object.assign(message, { id: correlationId });
      const serializedPacket: ReadPacket & Partial<RmqRecord> = this.serializer.serialize(message);
      const options = serializedPacket.options;
      delete serializedPacket.options;

      this.responseEmitter.on(correlationId, listener);
      const msg = Buffer.from(JSON.stringify(serializedPacket));
      const publishOptions: Options.Publish = {
        persistent: this.persistent,
        replyTo: this.replyQueue ? this.replyQueue : undefined,
        ...options,
        headers: this.mergeHeaders(options?.headers),
        correlationId,
      };

      if (this.exchange) {
        this.channel.publish(this.exchange, message.pattern, msg, publishOptions);
      } else {
        this.channel.sendToQueue(this.queue, msg, publishOptions);
      }

      return () => this.responseEmitter.removeListener(correlationId, listener);
    } catch (err) {
      callback({ err });
    }
  }

  protected dispatchEvent<T = any>(packet: ReadPacket): Promise<T> {
    const serializedPacket: ReadPacket & Partial<RmqRecord> = this.serializer.serialize(packet);
    const options = serializedPacket.options;
    delete serializedPacket.options;
    const content = Buffer.from(JSON.stringify(serializedPacket));
    const publishOptions: Options.Publish = {
      persistent: this.persistent,
      ...options,
      headers: this.mergeHeaders(options?.headers),
    };
    return new Promise<T>((resolve, reject) => {
      const cb: PromiseBreaker.Callback = (err: unknown, result?: T) => (err ? reject(err) : resolve(result));
      return this.exchange
        ? this.channel.publish(this.exchange, packet.pattern, content, publishOptions, cb)
        : this.channel.sendToQueue(this.queue, content, publishOptions, cb);
    });
  }

  protected initializeSerializer(options: AmqpOptions) {
    this.serializer = options?.serializer ?? new AmqpRecordSerializer();
  }

  protected mergeHeaders(requestHeaders?: Record<string, string>): Record<string, string> | undefined {
    if (!requestHeaders && !this.options?.headers) {
      return undefined;
    }

    return {
      ...this.options?.headers,
      ...requestHeaders,
    };
  }
}
