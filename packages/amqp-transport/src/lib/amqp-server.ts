import { isNil, isString, isUndefined } from '@nestjs/common/utils/shared.utils';
import {
  CustomTransportStrategy,
  IncomingEvent,
  IncomingRequest,
  MessageHandler,
  OutgoingResponse,
  RmqContext,
  RmqEvents,
  RmqStatus,
  Server,
  Transport,
} from '@nestjs/microservices';
import {
  DISCONNECTED_RMQ_MESSAGE,
  NO_MESSAGE_HANDLER,
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_NO_ASSERT,
  RQM_DEFAULT_NOACK,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '@nestjs/microservices/constants';
import type { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { AmqpConnectionManager, ChannelWrapper, connect } from 'amqp-connection-manager';
import type { Channel, ConsumeMessage, Message, Options } from 'amqplib';

import {
  AMQP_DEFAULT_EXCHANGE_OPTIONS,
  AMQP_DEFAULT_EXCHANGE_TYPE,
  AMQP_SEPARATOR,
  CONNECT_FAILED_EVENT_MSG,
  RQM_NO_EVENT_HANDLER,
  RQM_NO_MESSAGE_HANDLER,
} from './amqp.constants';
import { AmqpOptions } from './amqp.interfaces';
import { AmqpRecordConsumerDeserializer, AmqpRecordSerializer } from './amqp-record.serializer';

export enum AmqpWildcard {
  SINGLE_LEVEL = '*',
  MULTI_LEVEL = '#',
}

const INFINITE_CONNECTION_ATTEMPTS = -1;

export class AmqpServer extends Server<RmqEvents, RmqStatus> implements CustomTransportStrategy {
  override readonly transportId?: Transport;
  private channel: ChannelWrapper | null = null;
  private server: AmqpConnectionManager | null = null;
  private connectionAttempts = 0;

  private urls: string[] | RmqUrl[];
  private queue: string;
  private queueOptions: Options.AssertQueue;
  private exchange?: string;
  private exchangeType: 'direct' | 'fanout' | 'topic';
  private exchangeOptions?: Options.AssertExchange;
  private prefetchCount: number;
  private isGlobalPrefetchCount: boolean;
  private noAck: boolean;
  private noAssert: boolean;
  private noQueueAssert: boolean;
  private noExchangeAssert: boolean;
  private deleteChannelOnFailure: boolean;

  protected pendingEventListeners: Array<{
    event: keyof RmqEvents;
    callback: RmqEvents[keyof RmqEvents];
  }> = [];

  constructor(
    private options: AmqpOptions,
    transportId: number | Transport = Transport.RMQ,
  ) {
    super();
    this.transportId = transportId;
    this.server = null;
    this.channel = null;
    this.noAck = this.getOptionsProp(this.options, 'noAck') ?? RQM_DEFAULT_NOACK;
    this.urls = this.getOptionsProp(this.options, 'urls') ?? [RQM_DEFAULT_URL];
    this.queue = this.getOptionsProp(this.options, 'queue') ?? '';
    this.queueOptions = this.getOptionsProp(this.options, 'queueOptions') ?? RQM_DEFAULT_QUEUE_OPTIONS;
    this.exchange = this.getOptionsProp(this.options, 'exchange') ?? undefined;
    this.exchangeType = this.getOptionsProp(this.options, 'exchangeType') ?? AMQP_DEFAULT_EXCHANGE_TYPE;
    this.exchangeOptions = this.getOptionsProp(this.options, 'exchangeOptions') ?? AMQP_DEFAULT_EXCHANGE_OPTIONS;
    this.prefetchCount = this.getOptionsProp(this.options, 'prefetchCount') ?? RQM_DEFAULT_PREFETCH_COUNT;
    this.isGlobalPrefetchCount =
      this.getOptionsProp(this.options, 'isGlobalPrefetchCount') ?? RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT;
    this.noAssert = this.getOptionsProp(this.options, 'noAssert') ?? RQM_DEFAULT_NO_ASSERT;
    this.noQueueAssert = this.getOptionsProp(this.options, 'noQueueAssert') ?? RQM_DEFAULT_NO_ASSERT;
    this.noExchangeAssert = this.getOptionsProp(this.options, 'noExchangeAssert') ?? RQM_DEFAULT_NO_ASSERT;
    this.deleteChannelOnFailure = this.getOptionsProp(this.options, 'deleteChannelOnFailure') ?? true;

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  private get skipQueueAssert(): boolean {
    return this.noAssert || this.noQueueAssert;
  }

  private get skipExchangeAssert(): boolean {
    return this.noAssert || this.noExchangeAssert;
  }

  async listen(callback: (err?: unknown, ...optionalParams: unknown[]) => void): Promise<void> {
    try {
      await this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  close(): void {
    this.channel?.close();
    this.server?.close();
    this.pendingEventListeners = [];
  }

  async start(callback?: (error?: unknown) => void): Promise<void> {
    const server = this.createClient();
    this.server = server;
    server.once('connect', () => {
      if (this.channel) {
        return;
      }
      this._status$.next(RmqStatus.CONNECTED);
      this.channel = server.createChannel({
        json: false,
        setup: (channel: Channel) => this.setupChannel(channel, callback),
      });
    });

    const maxConnectionAttempts = this.getOptionsProp(
      this.options,
      'maxConnectionAttempts',
      INFINITE_CONNECTION_ATTEMPTS,
    );

    this.registerConnectListener();
    this.registerDisconnectListener();
    this.pendingEventListeners.forEach(({ event, callback }) => this.server?.on(event, callback));
    this.pendingEventListeners = [];

    const connectFailedEvent = 'connectFailed';

    this.server.on(connectFailedEvent, (error) => {
      this._status$.next(RmqStatus.DISCONNECTED);
      this.logger.error(CONNECT_FAILED_EVENT_MSG);
      if (error['err']) {
        this.logger.error(error['err']);
      }
      const isReconnecting = !!this.channel;
      if (maxConnectionAttempts === INFINITE_CONNECTION_ATTEMPTS || isReconnecting) {
        return;
      }
      if (++this.connectionAttempts === maxConnectionAttempts) {
        this.close();
        callback?.(error['err'] ?? new Error(CONNECT_FAILED_EVENT_MSG));
      }
    });
  }

  createClient(): AmqpConnectionManager {
    const socketOptions = this.getOptionsProp(this.options, 'socketOptions');
    return connect(this.urls, {
      connectionOptions: socketOptions,
      heartbeatIntervalInSeconds: socketOptions?.heartbeatIntervalInSeconds,
      reconnectTimeInSeconds: socketOptions?.reconnectTimeInSeconds,
    });
  }

  private registerConnectListener() {
    this.server?.on('connect', () => {
      this._status$.next(RmqStatus.CONNECTED);
    });
  }

  private registerDisconnectListener() {
    this.server?.on('disconnect', (err) => {
      this._status$.next(RmqStatus.DISCONNECTED);
      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
      this.logger.error(err);
    });
  }

  async deleteChannel(channel: Channel, callback?: (error?: unknown) => void) {
    try {
      const { queue, exchange } = this;
      if (exchange) {
        await channel.deleteExchange(exchange);
        await channel.deleteQueue(queue);
        const registeredPatterns = [...this.messageHandlers.keys()];
        await Promise.all(registeredPatterns.map((pattern) => channel.unbindQueue(queue, exchange, pattern)));
      } else {
        await channel.deleteQueue(queue);
      }
      return true;
    } catch (e) {
      callback?.(e);
      return false;
    }
  }

  async setupChannel(channel: Channel, callback?: (error?: unknown) => void, retried?: boolean): Promise<void> {
    try {
      const { queue, exchange } = this;
      if (exchange && !this.skipExchangeAssert) {
        await channel.assertExchange(exchange, this.exchangeType, this.exchangeOptions);
        const q = await channel.assertQueue(queue, this.queueOptions);
        const registeredPatterns = [...this.messageHandlers.keys()];
        await Promise.all(registeredPatterns.map((pattern) => channel.bindQueue(q.queue, exchange, pattern)));
      } else if (!this.skipQueueAssert) {
        await channel.assertQueue(queue, this.queueOptions);
      }

      await channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
      channel.consume(queue, (msg) => this.handleMessage(msg, channel), {
        noAck: this.noAck,
        consumerTag: this.getOptionsProp(this.options, 'consumerTag', undefined),
      });
      callback?.();
    } catch (e) {
      if (this.deleteChannelOnFailure) {
        const deleted = await this.deleteChannel(channel, callback);
        if (deleted && !retried) {
          return this.setupChannel(channel, callback, true);
        }
      }
      callback?.(e);
    }
  }

  matchAmqpPattern(pattern: string, topic: string): boolean {
    if (!topic) {
      return false;
    }
    const patternSegments = pattern.split(AMQP_SEPARATOR);
    const topicSegments = topic.split(AMQP_SEPARATOR);
    const patternSegmentsLength = patternSegments.length;
    const topicSegmentsLength = topicSegments.length;
    const lastIndex = patternSegmentsLength - 1;
    for (const [i, currentPattern] of patternSegments.entries()) {
      const patternChar = currentPattern[0];
      const currentTopic = topicSegments[i];
      if (!currentTopic && !currentPattern) {
        continue;
      }
      if (!currentTopic && patternChar !== AmqpWildcard.MULTI_LEVEL) {
        return false;
      }
      if (patternChar === AmqpWildcard.MULTI_LEVEL) {
        return i === lastIndex;
      }
      if (patternChar !== AmqpWildcard.SINGLE_LEVEL && currentPattern !== currentTopic) {
        return false;
      }
    }
    return patternSegmentsLength === topicSegmentsLength;
  }

  override getHandlerByPattern(pattern: string): MessageHandler | null {
    const route = this.getRouteFromPattern(pattern);
    if (this.messageHandlers.has(route)) {
      return this.messageHandlers.get(route) || null;
    }
    for (const [key, value] of this.messageHandlers) {
      if (key.indexOf(AmqpWildcard.SINGLE_LEVEL) === -1 && key.indexOf(AmqpWildcard.MULTI_LEVEL) === -1) {
        continue;
      }
      if (this.matchAmqpPattern(key, route)) {
        return value;
      }
    }
    return null;
  }

  override async handleEvent(pattern: string, packet: IncomingRequest | IncomingEvent, context: RmqContext) {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler && !this.noAck) {
      this.channel?.nack(context.getMessage() as Message, false, false);
      return this.logger.warn(RQM_NO_EVENT_HANDLER`${pattern}`);
    }
    return super.handleEvent(pattern, packet, context);
  }

  async handleMessage(message: ConsumeMessage | null, channel: Channel): Promise<void> {
    if (isNil(message)) {
      return;
    }
    const { properties } = message;
    const packet = await this.deserializer.deserialize(message, properties);
    const pattern = isString(packet.pattern) ? packet.pattern : JSON.stringify(packet.pattern);
    const rmqContext = new RmqContext([message, channel, pattern]);
    if (isUndefined((packet as IncomingRequest).id)) {
      return this.handleEvent(pattern, packet, rmqContext);
    }
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      if (!this.noAck) {
        this.logger.warn(RQM_NO_MESSAGE_HANDLER`${pattern}`);
        this.channel?.nack(rmqContext.getMessage() as Message, false, false);
      }
      const status = 'error';
      const noHandlerPacket: OutgoingResponse = {
        id: (packet as IncomingRequest).id,
        err: NO_MESSAGE_HANDLER,
        status,
      };
      return this.sendMessage(noHandlerPacket, properties.replyTo, properties.correlationId);
    }
    const response$ = this.transformToObservable(await handler(packet.data, rmqContext));
    const publish = <T>(data: T) => this.sendMessage(data, properties.replyTo, properties.correlationId);
    if (response$) this.send(response$, publish);
  }

  sendMessage<T = OutgoingResponse>(message: T, replyTo: string, correlationId: string): void {
    const outgoingResponse = this.serializer.serialize(message as unknown as OutgoingResponse);
    const { options, ...rest } = outgoingResponse;
    const buffer = Buffer.from(JSON.stringify(rest));
    this.channel?.sendToQueue(replyTo, buffer, { correlationId, ...options });
  }

  public unwrap<T>(): T {
    if (!this.server) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    return this.server as T;
  }

  public on<
    EventKey extends keyof RmqEvents = keyof RmqEvents,
    EventCallback extends RmqEvents[EventKey] = RmqEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    if (this.server) {
      this.server.addListener(event, callback);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  protected override initializeSerializer(options: AmqpOptions) {
    this.serializer = options?.serializer ?? new AmqpRecordSerializer();
  }

  protected override initializeDeserializer(options: AmqpOptions) {
    this.deserializer = options?.deserializer ?? new AmqpRecordConsumerDeserializer();
  }
}
