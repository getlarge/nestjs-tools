import { EventHandlers, TypedEventEmitter } from '@getlarge/typed-event-emitter';
import { Logger } from '@nestjs/common/services/logger.service';
import {
  ClientProxy,
  type ReadPacket,
  type RmqRecord,
  type RmqRecordOptions,
  type WritePacket,
} from '@nestjs/microservices';
import {
  CONNECT_EVENT,
  DISCONNECT_EVENT,
  DISCONNECTED_RMQ_MESSAGE,
  ERROR_EVENT,
  RQM_DEFAULT_NO_ASSERT,
  RQM_DEFAULT_NOACK,
  RQM_DEFAULT_PERSISTENT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '@nestjs/microservices/constants';
import type { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { AmqpConnectionManager, Channel, ChannelWrapper, connect } from 'amqp-connection-manager';
import { Connection, ConsumeMessage, Options } from 'amqplib';
import type PromiseBreaker from 'promise-breaker';
import { EmptyError, firstValueFrom, fromEvent, merge, Observable, ReplaySubject } from 'rxjs';
import { first, map, retryWhen, scan, skip, switchMap } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import {
  AMQP_DEFAULT_EXCHANGE_OPTIONS,
  AMQP_DEFAULT_EXCHANGE_TYPE,
  CONNECT_FAILED_EVENT,
  CONNECT_FAILED_EVENT_MSG,
} from './amqp.constants';
import { AmqpOptions } from './amqp.interfaces';
import { AmqpRecordSerializer } from './amqp-record.serializer';

export interface ConsumeMessageEvent extends EventHandlers {
  [correlationId: string]: (msg: ConsumeMessage) => Promise<void> | void;
}

export class AmqpClient extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected connection$!: ReplaySubject<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected connection!: Promise<any>;
  protected client: AmqpConnectionManager | null = null;
  protected channel: ChannelWrapper | null = null;
  protected urls: string[] | RmqUrl[];
  protected queue?: string;
  protected queueOptions: Options.AssertQueue;
  protected replyQueue: string;
  protected replyQueueOptions: Options.AssertQueue;
  protected persistent: boolean;
  protected exchange?: string;
  protected exchangeType: string;
  protected exchangeOptions?: Options.AssertExchange;
  protected prefetchCount: number;
  protected noAssert: boolean;
  protected noQueueAssert: boolean;
  protected noReplyQueueAssert: boolean;
  protected noExchangeAssert: boolean;
  protected responseEmitter!: TypedEventEmitter<ConsumeMessageEvent>;

  constructor(protected readonly options: AmqpOptions) {
    super();
    this.urls = this.getOptionsProp(this.options, 'urls') || [RQM_DEFAULT_URL];
    this.queue = this.getOptionsProp(this.options, 'queue') || undefined;
    this.queueOptions = this.getOptionsProp(this.options, 'queueOptions') || RQM_DEFAULT_QUEUE_OPTIONS;
    this.replyQueue = this.getOptionsProp(this.options, 'replyQueue') || '';
    //? use RMQ_DEFAULT_REPLY_QUEUE_OPTIONS
    this.replyQueueOptions = this.getOptionsProp(this.options, 'replyQueueOptions') || RQM_DEFAULT_QUEUE_OPTIONS;
    this.persistent = this.getOptionsProp(this.options, 'persistent') || RQM_DEFAULT_PERSISTENT;
    this.exchange = this.getOptionsProp(this.options, 'exchange') || undefined;
    this.exchangeType = this.getOptionsProp(this.options, 'exchangeType') || AMQP_DEFAULT_EXCHANGE_TYPE;
    this.exchangeOptions = this.getOptionsProp(this.options, 'exchangeOptions') || AMQP_DEFAULT_EXCHANGE_OPTIONS;
    this.prefetchCount = this.getOptionsProp(this.options, 'prefetchCount') || RQM_DEFAULT_PREFETCH_COUNT;
    this.noAssert = this.getOptionsProp(this.options, 'noAssert') || RQM_DEFAULT_NO_ASSERT;
    this.noQueueAssert = this.getOptionsProp(this.options, 'noQueueAssert') || RQM_DEFAULT_NO_ASSERT;
    this.noReplyQueueAssert = this.getOptionsProp(this.options, 'noReplyQueueAssert') || RQM_DEFAULT_NO_ASSERT;
    this.noExchangeAssert = this.getOptionsProp(this.options, 'noExchangeAssert') || RQM_DEFAULT_NO_ASSERT;
    this.initializeSerializer(options);
    this.initializeDeserializer(options);
    if (!this.queue && !this.exchange) {
      throw new Error('No queue or exchange defined');
    }
  }

  private get skipQueueAssert(): boolean {
    return this.noAssert || this.noQueueAssert;
  }

  private get skipReplyQueueAssert(): boolean {
    return this.noAssert || this.noReplyQueueAssert;
  }

  private get skipExchangeAssert(): boolean {
    return this.noAssert || this.noExchangeAssert;
  }

  close(): void {
    this.channel?.close();
    this.client?.close();
    this.channel = null;
    this.client = null;
  }

  connect() {
    if (this.client) {
      return this.convertConnectionToPromise();
    }
    this.client = this.createClient();
    this.handleError(this.client);
    this.handleDisconnectError(this.client);

    this.responseEmitter = new TypedEventEmitter();
    this.responseEmitter.setMaxListeners(0);

    const connect$ = this.connect$(this.client);
    const withDisconnect$ = this.mergeDisconnectEvent(this.client, connect$).pipe(
      switchMap(() => this.createChannel()),
    );

    const withReconnect$ = fromEvent<{ connection: Connection; url: string }>(
      this.client,
      CONNECT_EVENT,
      ({ connection, url }) => ({
        connection,
        url,
      }),
    ).pipe(skip(1));
    const source$ = merge(withDisconnect$, withReconnect$);

    this.connection$ = new ReplaySubject(1);
    source$.subscribe(this.connection$);

    return this.convertConnectionToPromise();
  }

  async convertConnectionToPromise() {
    try {
      return await firstValueFrom(this.connection$);
    } catch (err) {
      if (err instanceof EmptyError) {
        return;
      }
      throw err;
    }
  }

  createClient(): AmqpConnectionManager {
    const socketOptions = this.getOptionsProp(this.options, 'socketOptions');
    return connect(this.urls, { connectionOptions: socketOptions });
  }

  handleError(client: AmqpConnectionManager): void {
    client.addListener(ERROR_EVENT, (err) => this.logger.error(err));
  }

  handleDisconnectError(client: AmqpConnectionManager): void {
    client.addListener(DISCONNECT_EVENT, (err) => {
      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
      this.logger.error(err.err);
      this.close();
    });
    client.addListener(CONNECT_FAILED_EVENT, (err) => {
      this.logger.error(CONNECT_FAILED_EVENT_MSG);
      this.logger.error(err.err);
      this.close();
    });
  }

  async createChannel(): Promise<void> {
    const noAck = this.getOptionsProp(this.options, 'noAck', RQM_DEFAULT_NOACK);
    if (!this.client) {
      throw new Error('No client found');
    }
    const channel = this.client.createChannel({
      json: false,
      setup: (channel: Channel) => this.setupChannel(channel),
    });
    this.channel = channel;

    return new Promise<void>((resolve, reject) => {
      channel
        .once('connect', () => {
          // at this time `setReplyQueue` should have ben called to assert the reply queue
          // if replyQueue is still undefined it means that we don't need a reply queue for this client
          if (!this.replyQueue) {
            return resolve();
          }
          channel
            .consume(this.replyQueue, (msg) => this.responseEmitter.emit(msg.properties.correlationId, msg), {
              noAck,
              prefetch: this.prefetchCount,
            })
            .then(() => resolve())
            .catch((e) => reject(e));
        })
        .once('error', (err) => {
          reject(err);
        });
    });
  }

  mergeDisconnectEvent<T = unknown>(instance: AmqpConnectionManager, source$: Observable<T>): Observable<T> {
    const eventToError = (eventType: string) =>
      fromEvent(instance, eventType).pipe(
        map((err) => {
          throw err;
        }),
      );
    const disconnect$ = eventToError(DISCONNECT_EVENT);
    const urls = this.getOptionsProp(this.options, 'urls', []) as string[];
    const connectFailed$ = eventToError(CONNECT_FAILED_EVENT).pipe(
      retryWhen((e) =>
        e.pipe(
          scan((errorCount, error) => {
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

  async setReplyQueue(channel: Channel): Promise<void> {
    if (!this.skipReplyQueueAssert) {
      // autogenerate replyQueue name when it is empty and replace the property replyQueue with this name (amq.gen-****)
      const q = await channel.assertQueue(this.replyQueue, this.replyQueueOptions);
      this.replyQueue = q.queue;
    }
  }

  async setupChannel(channel: Channel): Promise<void> {
    if (this.exchange && !this.skipExchangeAssert) {
      await channel.assertExchange(this.exchange, this.exchangeType, this.exchangeOptions);
    }
    if (typeof this.queue === 'string' && !this.skipQueueAssert) {
      await channel.assertQueue(this.queue, this.queueOptions);
    }
    await this.setReplyQueue(channel);
  }

  protected parseMessageContent(content: Buffer) {
    const rawContent = content.toString();
    try {
      return JSON.parse(rawContent);
    } catch {
      return rawContent;
    }
  }

  async handleMessage(msg: ConsumeMessage, callback: (packet: WritePacket) => unknown): Promise<void> {
    // TODO: retrieve deserialize options from msg
    const packet = this.parseMessageContent(msg.content);
    const { err, response, isDisposed } = await this.deserializer.deserialize(packet, msg.properties);
    // TODO: if (this.replyQueueOptions.exclusive) {
    //   await this.channel.cancel(msg.fields.consumerTag);
    // }
    if (isDisposed || err) {
      callback?.({
        err,
        response,
        isDisposed: true,
      });
    }
    callback?.({
      err,
      response,
    });
  }

  protected getSerializedContent(message: ReadPacket): { content: Buffer; options: RmqRecordOptions } {
    const { options = {}, ...rest }: ReadPacket & Partial<RmqRecord> = this.serializer.serialize(message);
    return { content: Buffer.from(JSON.stringify(rest)), options };
  }

  protected publish(message: ReadPacket, callback: (packet: WritePacket) => unknown): () => void {
    try {
      const correlationId: string = uuid();
      const listener = (msg: ConsumeMessage) => this.handleMessage(msg, callback);
      this.responseEmitter.on(correlationId, listener);

      Object.assign(message, { id: correlationId });
      const { content, options } = this.getSerializedContent(message);

      const publishOptions: Options.Publish = {
        persistent: this.persistent,
        replyTo: this.replyQueue,
        ...options,
        headers: this.mergeHeaders(options?.headers),
        correlationId,
      };
      if (this.exchange) {
        this.channel?.publish(this.exchange, message.pattern, content, publishOptions);
      } else if (this.queue) {
        this.channel?.sendToQueue(this.queue, content, publishOptions);
      }
      return () => this.responseEmitter.removeListener(correlationId, listener);
    } catch (err) {
      callback({ err });
      //? this.responseEmitter.removeListener(correlationId, listener)
      return () => void 0;
    }
  }
  protected dispatchEvent<T = unknown>(packet: ReadPacket): Promise<T> {
    const { content, options } = this.getSerializedContent(packet);
    const publishOptions: Options.Publish = {
      persistent: this.persistent,
      ...options,
      headers: this.mergeHeaders(options?.headers),
    };

    return new Promise<T>((resolve, reject) => {
      const cb: PromiseBreaker.Callback = (err: Error | null | undefined, result: T) =>
        err ? reject(err) : resolve(result);
      return this.exchange
        ? this.channel?.publish(this.exchange, packet.pattern, content, publishOptions, cb)
        : this.channel?.sendToQueue(this.queue as string, content, publishOptions, cb);
    });
  }

  protected override initializeSerializer(options: AmqpOptions) {
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
