import { Deserializer, Serializer } from '@nestjs/microservices';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { Options } from 'amqplib';
import { TcpSocketConnectOpts } from 'net';
import { ConnectionOptions } from 'tls';

export interface AmqpOptions {
  urls?: string[] | RmqUrl[];
  queue?: string;
  queueOptions?: Options.AssertQueue;
  prefetchCount?: number;
  isGlobalPrefetchCount?: boolean;
  maxConnectionAttempts?: number;
  persistent?: boolean;
  replyQueue?: string;
  replyQueueOptions?: Options.AssertQueue;
  exchange?: string;
  exchangeType?: 'direct' | 'fanout' | 'topic';
  exchangeOptions?: Options.AssertExchange;
  noAck?: boolean;
  noAssert?: boolean;
  noQueueAssert?: boolean;
  noReplyQueueAssert?: boolean;
  noExchangeAssert?: boolean;
  deleteChannelOnFailure?: boolean;
  socketOptions?: (ConnectionOptions | TcpSocketConnectOpts) & {
    noDelay?: boolean;
    timeout?: number;
    keepAlive?: boolean;
    keepAliveDelay?: number;
    clientProperties?: any;
    credentials?: {
      mechanism: string;
      username: string;
      password: string;
      response: () => Buffer;
    };
  } & { heartbeatIntervalInSeconds: number; reconnectTimeInSeconds: number };
  serializer?: Serializer;
  deserializer?: Deserializer;
  headers?: Record<string, string>;
}
