import {
  CustomTransportStrategy,
  IncomingRequest,
  MessageHandler,
  OutgoingResponse,
  RmqContext,
  Server,
  Transport,
} from '@nestjs/microservices';
import {
  CONNECT_EVENT,
  DISCONNECT_EVENT,
  DISCONNECTED_RMQ_MESSAGE,
  NO_MESSAGE_HANDLER,
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_NOACK,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '@nestjs/microservices/constants';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { AmqpConnectionManager, ChannelWrapper, connect } from 'amqp-connection-manager';
import { Channel, ConsumeMessage, Options } from 'amqplib';

import {
  AMQP_DEFAULT_EXCHANGE_OPTIONS,
  AMQP_DEFAULT_EXCHANGE_TYPE,
  AMQP_SEPARATOR,
  CONNECT_FAILED_EVENT,
  CONNECT_FAILED_EVENT_MSG,
} from './amqp.constants';
import { AmqpOptions } from './amqp.interfaces';

export enum AmqpWildcard {
  SINGLE_LEVEL = '*',
  MULTI_LEVEL = '#',
}

export class AmqpServer extends Server implements CustomTransportStrategy {
  readonly transportId?: Transport;
  private channel: ChannelWrapper = null;
  private server: AmqpConnectionManager = null;
  private urls: string[] | RmqUrl[];
  private queue: string;
  private queueOptions: Options.AssertQueue;
  private prefetchCount: number;
  private isGlobalPrefetchCount: boolean;
  private exchange?: string;
  private exchangeType?: 'direct' | 'fanout' | 'topic';
  private exchangeOptions?: Options.AssertExchange;

  constructor(private options: AmqpOptions, transportId: number | Transport = Transport.RMQ) {
    super();
    this.transportId = transportId;
    this.server = null;
    this.channel = null;
    this.urls = this.getOptionsProp(this.options, 'urls') || [RQM_DEFAULT_URL];
    this.queue = this.getOptionsProp(this.options, 'queue') || '';
    this.queueOptions = this.getOptionsProp(this.options, 'queueOptions') || RQM_DEFAULT_QUEUE_OPTIONS;
    this.exchange = this.getOptionsProp(this.options, 'exchange') || null;
    this.exchangeType = this.getOptionsProp(this.options, 'exchangeType') || AMQP_DEFAULT_EXCHANGE_TYPE;
    this.exchangeOptions = this.getOptionsProp(this.options, 'exchangeOptions') || AMQP_DEFAULT_EXCHANGE_OPTIONS;
    this.prefetchCount = this.getOptionsProp(this.options, 'prefetchCount') || RQM_DEFAULT_PREFETCH_COUNT;
    this.isGlobalPrefetchCount =
      this.getOptionsProp(this.options, 'isGlobalPrefetchCount') || RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT;
    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  async listen(callback: () => void): Promise<void> {
    await this.start(callback);
  }

  close(): void {
    this.channel && this.channel.close();
    this.server && this.server.close();
  }

  async start(callback: () => void): Promise<void> {
    this.server = this.createClient();
    this.server.on(CONNECT_EVENT, () => {
      if (this.channel) {
        return;
      }
      this.channel = this.server.createChannel({
        json: false,
        setup: (channel: Channel) => this.setupChannel(channel, callback),
      });
    });
    this.server.on(DISCONNECT_EVENT, (err) => {
      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
      this.logger.error(err);
    });
    this.server.on(CONNECT_FAILED_EVENT, (err) => {
      this.logger.error(CONNECT_FAILED_EVENT_MSG);
      this.logger.error(err);
    });
  }

  createClient(): AmqpConnectionManager {
    const socketOptions = this.getOptionsProp(this.options, 'socketOptions');
    return connect(this.urls, { connectionOptions: socketOptions });
  }

  async setupChannel(channel: Channel, callback: () => void): Promise<void> {
    const noAck = this.getOptionsProp(this.options, 'noAck', RQM_DEFAULT_NOACK);
    if (this.exchange) {
      await channel.assertExchange(this.exchange, this.exchangeType, this.exchangeOptions);
      const q = await channel.assertQueue(this.queue, this.queueOptions);
      const registeredPatterns = [...this.messageHandlers.keys()];
      await Promise.all(registeredPatterns.map((pattern) => channel.bindQueue(q.queue, this.exchange, pattern)));
    } else {
      await channel.assertQueue(this.queue, this.queueOptions);
    }

    await channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
    channel.consume(this.queue, (msg) => this.handleMessage(msg, channel), {
      noAck,
    });
    callback();
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
    for (let i = 0; i < patternSegmentsLength; i++) {
      const currentPattern = patternSegments[i];
      const patternChar = currentPattern[0];
      const currentTopic = topicSegments[i];
      if (!currentTopic && !currentPattern) {
        continue;
      }
      if (!currentTopic && currentPattern !== AmqpWildcard.MULTI_LEVEL) {
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

  getHandlerByPattern(pattern: string): MessageHandler | null {
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

  async handleMessage(message: ConsumeMessage, channel: Channel): Promise<void> {
    if (!message) {
      return;
    }
    const { content, properties } = message;
    const rawMessage = JSON.parse(content.toString());
    const packet = await this.deserializer.deserialize(rawMessage);
    const pattern = typeof packet.pattern === 'string' ? packet.pattern : JSON.stringify(packet.pattern);
    const rmqContext = new RmqContext([message, channel, pattern]);
    if (typeof (packet as IncomingRequest).id === 'undefined') {
      return this.handleEvent(pattern, packet, rmqContext);
    }
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      const status = 'error';
      const noHandlerPacket = {
        id: (packet as IncomingRequest).id,
        err: NO_MESSAGE_HANDLER,
        status,
      };
      return this.sendMessage(noHandlerPacket, properties.replyTo, properties.correlationId);
    }
    const response$ = this.transformToObservable(await handler(packet.data, rmqContext));
    const publish = <T>(data: T) => this.sendMessage(data, properties.replyTo, properties.correlationId);
    response$ && this.send(response$, publish);
  }

  sendMessage<T = any>(message: T, replyTo: string, correlationId: string): void {
    const outgoingResponse = this.serializer.serialize(message as unknown as OutgoingResponse);
    const buffer = Buffer.from(JSON.stringify(outgoingResponse));
    this.channel.sendToQueue(replyTo, buffer, { correlationId });
  }
}
