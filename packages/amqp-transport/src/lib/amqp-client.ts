/* eslint-disable max-lines */
import { EventHandlers, TypedEventEmitter } from '@getlarge/typed-event-emitter';
import { Logger } from '@nestjs/common/services/logger.service';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import {
  ClientProxy,
  type ReadPacket,
  type RmqRecord,
  type RmqRecordOptions,
  type WritePacket,
} from '@nestjs/microservices';
import {
  DISCONNECTED_RMQ_MESSAGE,
  RQM_DEFAULT_NO_ASSERT,
  RQM_DEFAULT_NOACK,
  RQM_DEFAULT_PERSISTENT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '@nestjs/microservices/constants';
import type { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { AmqpConnectionManager, Channel, ChannelWrapper, connect } from 'amqp-connection-manager';
import type { Connection, ConsumeMessage, Options } from 'amqplib';
import type PromiseBreaker from 'promise-breaker';
import { EmptyError, firstValueFrom, fromEvent, merge, Observable, ReplaySubject } from 'rxjs';
import { first, map, retryWhen, scan, skip, switchMap } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { AMQP_DEFAULT_EXCHANGE_OPTIONS, AMQP_DEFAULT_EXCHANGE_TYPE } from './amqp.constants';
import { AmqpOptions, RmqEvents, RmqStatus } from './amqp.interfaces';
import { AmqpRecordSerializer } from './amqp-record.serializer';

export interface ConsumeMessageEvent extends EventHandlers {
  [correlationId: string]: (event: { content: Buffer; options: Record<string, unknown> }) => Promise<void> | void;
}

const REPLY_QUEUE = 'amq.rabbitmq.reply-to';

export class AmqpClient extends ClientProxy<RmqEvents, string> {
  protected readonly logger = new Logger(ClientProxy.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected connection$!: ReplaySubject<any>;
  protected connection!: Promise<void>;
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
  protected isGlobalPrefetchCount: boolean;
  protected noAssert: boolean;
  protected noQueueAssert: boolean;
  protected noReplyQueueAssert: boolean;
  protected noExchangeAssert: boolean;
  protected responseEmitter!: TypedEventEmitter<ConsumeMessageEvent>;
  protected pendingEventListeners: Array<{
    event: keyof RmqEvents;
    callback: RmqEvents[keyof RmqEvents];
  }> = [];
  protected isInitialConnect = true;

  constructor(protected readonly options: AmqpOptions) {
    super();
    this.urls = this.getOptionsProp(this.options, 'urls') || [RQM_DEFAULT_URL];
    this.queue = this.getOptionsProp(this.options, 'queue') || undefined;
    this.queueOptions = this.getOptionsProp(this.options, 'queueOptions') || RQM_DEFAULT_QUEUE_OPTIONS;
    this.replyQueue = this.getOptionsProp(this.options, 'replyQueue') || REPLY_QUEUE;
    //? use RMQ_DEFAULT_REPLY_QUEUE_OPTIONS
    this.replyQueueOptions = this.getOptionsProp(this.options, 'replyQueueOptions') || RQM_DEFAULT_QUEUE_OPTIONS;
    this.persistent = this.getOptionsProp(this.options, 'persistent') || RQM_DEFAULT_PERSISTENT;
    this.exchange = this.getOptionsProp(this.options, 'exchange') || undefined;
    this.exchangeType = this.getOptionsProp(this.options, 'exchangeType') || AMQP_DEFAULT_EXCHANGE_TYPE;
    this.exchangeOptions = this.getOptionsProp(this.options, 'exchangeOptions') || AMQP_DEFAULT_EXCHANGE_OPTIONS;
    this.prefetchCount = this.getOptionsProp(this.options, 'prefetchCount') || RQM_DEFAULT_PREFETCH_COUNT;
    this.isGlobalPrefetchCount = this.getOptionsProp(this.options, 'isGlobalPrefetchCount') || false;
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
    this.pendingEventListeners = [];
  }

  connect() {
    if (this.client) {
      return this.convertConnectionToPromise();
    }
    this.client = this.createClient();

    this.registerErrorListener(this.client);
    this.registerDisconnectListener(this.client);
    this.registerConnectListener(this.client);
    this.pendingEventListeners.forEach(({ event, callback }) => this.client?.on(event, callback));
    this.pendingEventListeners = [];

    this.responseEmitter = new TypedEventEmitter();
    this.responseEmitter.setMaxListeners(0);

    const connect$ = this.connect$(this.client);
    const withDisconnect$ = this.mergeDisconnectEvent(this.client, connect$).pipe(
      switchMap(() => this.createChannel()),
    );

    const withReconnect$ = fromEvent<{ connection: Connection; url: string }>(
      this.client,
      'connect',
      (event) => event,
    ).pipe(skip(1));
    const source$ = merge(withDisconnect$, withReconnect$);

    this.connection$ = new ReplaySubject(1);
    source$.subscribe(this.connection$);
    this.connection = this.convertConnectionToPromise();
    return this.connection;
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

  public registerErrorListener(client: AmqpConnectionManager): void {
    client.addListener('error', (err) => this.logger.error(err));
  }

  public registerDisconnectListener(client: AmqpConnectionManager): void {
    client.addListener('disconnect', (err) => {
      this._status$.next(RmqStatus.DISCONNECTED);

      if (!this.isInitialConnect) {
        this.connection = Promise.reject('Error: Connection lost. Trying to reconnect...');
        // Prevent unhandled promise rejection
        this.connection.catch(() => {
          //
        });
      }

      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
      this.logger.error(err);
    });
  }

  private registerConnectListener(client: AmqpConnectionManager): void {
    client.addListener('connect', () => {
      this._status$.next(RmqStatus.CONNECTED);
      this.logger.log('Successfully connected to RMQ broker');

      if (this.isInitialConnect) {
        this.isInitialConnect = false;

        if (!this.channel) {
          this.connection = this.createChannel();
        }
      } else {
        this.connection = Promise.resolve();
      }
    });
  }

  createChannel(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.client) {
        return reject(new Error('No client found'));
      }
      this.channel =
        this.client?.createChannel({
          json: false,
          setup: (channel: Channel) => this.setupChannel(channel, resolve),
        }) || null;

      // this.channel
      //   ?.once('connect', () => {
      //     // at this time `setReplyQueue` should have ben called to assert the reply queue
      //     // if replyQueue is still undefined it means that we don't need a reply queue for this client
      //     if (!this.replyQueue) {
      //       return resolve();
      //     }
      //     this.channel
      //       ?.consume(this.replyQueue, (msg) => this.responseEmitter.emit(msg.properties.correlationId, msg), {
      //         noAck,
      //         // prefetch: this.prefetchCount,
      //       })
      //       .then(() => resolve())
      //       .catch((e) => reject(e));
      //   })
      //   .once('error', (err) => {
      //     reject(err);
      //   });
    });
  }

  mergeDisconnectEvent<T = unknown>(instance: AmqpConnectionManager, source$: Observable<T>): Observable<T> {
    const eventToError = (eventType: string) =>
      fromEvent(instance, eventType).pipe(
        map((err) => {
          throw err;
        }),
      );
    const disconnect$ = eventToError('disconnect');
    const urls = this.getOptionsProp(this.options, 'urls', []) as string[];
    const connectFailedEventKey = 'connectFailed';
    const connectFailed$ = eventToError(connectFailedEventKey).pipe(
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

  public async consumeChannel(channel: Channel) {
    const noAck = this.getOptionsProp(this.options, 'noAck', RQM_DEFAULT_NOACK);
    await channel.consume(
      this.replyQueue,
      (msg: ConsumeMessage | null) => (msg ? this.responseEmitter.emit(msg.properties.correlationId, msg) : void 0),
      {
        noAck,
      },
    );
  }

  async setupChannel(channel: Channel, resolve: (value: void | PromiseLike<void>) => void): Promise<void> {
    if (this.exchange && !this.skipExchangeAssert) {
      await channel.assertExchange(this.exchange, this.exchangeType, this.exchangeOptions);
    }
    if (typeof this.queue === 'string' && !this.skipQueueAssert) {
      await channel.assertQueue(this.queue, this.queueOptions);
    }
    await this.setReplyQueue(channel);
    await channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
    await this.consumeChannel(channel);
    resolve();
  }

  override on<
    EventKey extends keyof RmqEvents = keyof RmqEvents,
    EventCallback extends RmqEvents[EventKey] = RmqEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    if (this.client) {
      this.client.addListener(event, callback);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  public unwrap<T>(): T {
    if (!this.client) {
      throw new Error('Not initialized. Please call the "connect" method first.');
    }
    return this.client as T;
  }

  protected parseMessageContent(content: Buffer) {
    const rawContent = content.toString();
    try {
      return JSON.parse(rawContent);
    } catch {
      return rawContent;
    }
  }

  public async handleMessage(packet: unknown, callback: (packet: WritePacket) => unknown): Promise<void>;
  public async handleMessage(
    packet: unknown,
    options: Record<string, unknown>,
    callback: (packet: WritePacket) => unknown,
  ): Promise<void>;
  public async handleMessage(
    packet: unknown,
    options: Record<string, unknown> | ((packet: WritePacket) => unknown) | undefined,
    callback?: (packet: WritePacket) => unknown,
  ): Promise<void> {
    if (isFunction(options)) {
      // eslint-disable-next-line no-param-reassign
      callback = options as (packet: WritePacket) => unknown;
      // eslint-disable-next-line no-param-reassign
      options = undefined;
    }

    const { err, response, isDisposed } = await this.deserializer.deserialize(packet, options);
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

      const listener = (event: { content: Buffer; options: Record<string, unknown> }) =>
        this.handleMessage(this.parseMessageContent(event.content), event.options, callback);
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
        this.channel
          ?.publish(this.exchange, message.pattern, content, publishOptions)
          .catch((err) => callback({ err }));
      } else if (this.queue) {
        this.channel?.sendToQueue(this.queue, content, publishOptions).catch((err) => callback({ err }));
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
