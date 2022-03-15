import { Logger } from '@nestjs/common/services/logger.service';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
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
import { fromEvent, lastValueFrom, merge, Observable } from 'rxjs';
import { first, map, share, switchMap } from 'rxjs/operators';

import {
  AMQP_DEFAULT_EXCHANGE_OPTIONS,
  AMQP_DEFAULT_EXCHANGE_TYPE,
  CONNECT_FAILED_EVENT,
  CONNECT_FAILED_EVENT_MSG,
} from './amqp.constants';
import { AmqpOptions } from './amqp.interfaces';

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

  async consumeChannel(): Promise<void> {
    const noAck = this.getOptionsProp(this.options, 'noAck', RQM_DEFAULT_NOACK);
    await this.channel.assertQueue(this.replyQueue, this.queueOptions);
    const replyQueue = this.replyQueue;
    //? const q = await this.channel.assertQueue(this.replyQueue, {});
    //? const replyQueue = q.queue;
    this.channel.addSetup((channel: Channel) =>
      channel.consume(replyQueue, (msg) => this.responseEmitter.emit(msg.properties.correlationId, msg), {
        noAck,
      }),
    );
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
    );
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
    return connect(this.urls as any, { connectionOptions: socketOptions });
  }

  mergeDisconnectEvent<T = any>(instance: AmqpConnectionManager, source$: Observable<T>): Observable<T> {
    const close$ = fromEvent(instance, DISCONNECT_EVENT).pipe(
      map((err: any) => {
        throw err;
      }),
    );
    const fail$ = fromEvent(instance, CONNECT_FAILED_EVENT).pipe(
      map((err: any) => {
        throw err;
      }),
    );
    return merge(source$, close$, fail$).pipe(first());
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
      await this.consumeChannel();
    }
    resolve();
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
      const listener = ({ content }: { content: any }) => this.handleMessage(JSON.parse(content.toString()), callback);
      Object.assign(message, { id: correlationId });
      const serializedPacket = this.serializer.serialize(message);
      this.responseEmitter.on(correlationId, listener);
      const msg = Buffer.from(JSON.stringify(serializedPacket));
      const publishOptions: Options.Publish = {
        correlationId,
        persistent: this.persistent,
      };
      if (this.replyQueue) {
        publishOptions.replyTo = this.replyQueue;
      }
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

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    const serializedPacket = this.serializer.serialize(packet);
    const content = Buffer.from(JSON.stringify(serializedPacket));
    const publishOptions: Options.Publish = {
      persistent: this.persistent,
    };
    return new Promise<void>((resolve, reject) =>
      this.exchange
        ? this.channel.publish(this.exchange, packet.pattern, content, publishOptions)
        : this.channel.sendToQueue(this.queue, content, publishOptions, (err: unknown) =>
            err ? reject(err) : resolve(),
          ),
    );
  }
}
