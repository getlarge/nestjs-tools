import { ConfigService } from '@nestjs/config';
import { ClientOpts } from 'redis';

export const mockConfigService = {
  get: (key: string) => {
    switch (key) {
      case 'REDIS_URL':
        return 'redis://localhost:6379';
      case 'REDIS_PORT':
        return 6379;
      case 'REDIS_HOSTNAME':
        return 'localhost';
      case 'REDIS_DB':
        return 0;
      case 'REDIS_PASSWORD':
        return process.env.REDIS_PASSWORD || '';
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
    password: redisUrl.password,
  };
}

export function getRedisClientConfig(configService: ConfigService): ClientOpts {
  const { port, host, password, protocol } = parseRedisUrl(configService.get<string>('REDIS_URL'));
  const baseOptions: ClientOpts = {
    port: configService.get<number>('REDIS_PORT') || port,
    host: configService.get<string>('REDIS_HOSTNAME') || host,
    db: configService.get<number>('REDIS_DB'),
  };
  if (configService.get<string>('REDIS_PASSWORD') || password) {
    baseOptions.password = configService.get<string>('REDIS_PASSWORD') || password;
  }
  if (protocol.startsWith('rediss')) {
    baseOptions.tls = { rejectUnauthorized: false };
  }
  return baseOptions;
}
