import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

export const mockConfigService = {
  get: (key: string) => {
    switch (key) {
      case 'REDIS_URL':
        return 'redis://localhost:6379/0';
      case 'REDIS_PORT':
        return 6379;
      case 'REDIS_HOSTNAME':
        return 'localhost';
      case 'REDIS_DB':
        return 0;
      case 'REDIS_PASSWORD':
        return process.env['REDIS_PASSWORD'] || '';
      case 'REDIS_USERNAME':
        return process.env['REDIS_USERNAME'] || '';
      default:
        return undefined;
    }
  },
};

export function parseRedisUrl(url: string) {
  const redisUrl = new URL(url);
  return {
    protocol: redisUrl.protocol,
    port: +redisUrl.port,
    host: redisUrl.hostname,
    username: redisUrl.username,
    password: redisUrl.password,
  };
}

export function getRedisClientConfig(configService: ConfigService): RedisOptions {
  const url = configService.get('REDIS_URL') || '';
  const { port, host, username, password, protocol } = parseRedisUrl(url);
  const baseOptions: RedisOptions = {
    port: configService.get<number>('REDIS_PORT') || port,
    host: configService.get<string>('REDIS_HOSTNAME') || host,
    db: configService.get<number>('REDIS_DB'),
    ...((configService.get('REDIS_USERNAME') || username) && {
      username: configService.get<string>('REDIS_USERNAME') || username,
    }),
    ...((configService.get('REDIS_PASSWORD') || password) && {
      password: configService.get<string>('REDIS_PASSWORD') || password,
    }),
    retryStrategy(times: number): number {
      return Math.min(times * 500, 2000);
    },
    reconnectOnError(): boolean | 1 | 2 {
      return 1;
    },
  };
  if (protocol.startsWith('rediss')) {
    baseOptions.tls = { rejectUnauthorized: false };
  }
  return baseOptions;
}
