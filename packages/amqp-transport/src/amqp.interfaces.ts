import { Deserializer, Serializer } from '@nestjs/microservices';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { Options } from 'amqplib';
import { TcpSocketConnectOpts } from 'net';
import { ConnectionOptions } from 'tls';

export interface AmqpOptions {
  urls?: string[] | RmqUrl[];
  queue?: string;
  prefetchCount?: number;
  isGlobalPrefetchCount?: boolean;
  queueOptions?: Options.AssertQueue;
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
  } & { heartbeatIntervalInSeconds: 30; reconnectTimeInSeconds: 1 };
  noAck?: boolean;
  serializer?: Serializer;
  deserializer?: Deserializer;
  replyQueue?: string;
  persistent?: boolean;
  exchange?: string;
  exchangeType?: 'direct' | 'fanout' | 'topic';
  exchangeOptions?: Options.AssertExchange;
  headers?: Record<string, string>;
}
