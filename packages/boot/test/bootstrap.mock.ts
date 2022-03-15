import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';

import { ApplicationBoot, BootOptions, SetupOptions } from '../src';
import { AppModule } from './app.module.mock';
import { ExampleDto } from './example.dto.mock';

export function config(app: INestApplication) {
  const configService = app.get(ConfigService);

  return {
    environment: configService.get<string>('NODE_ENV'),
    brokerUrl: configService.get<string>('BROKER_URL', 'mqtt://localhost:7883'),
    microservices: [
      {
        transport: Transport.MQTT,
        options: {
          url: 'mqtt://localhost:7883',
        } as any,
      },
    ],
    proxyServerUrl: configService.get<string>('PROXY_SERVER_URL'),
    proxyServerUrls: configService.get<string[]>('PROXY_SERVER_URLS'),
    serverHostname: configService.get<string>('HOSTNAME', 'localhost'),
    serverPort: configService.get<number>('PORT', 8000),
    serverUrl: configService.get<string>('SERVER_URL', 'http://localhost:8000'),
    swaggerPath: configService.get<string>('SWAGGER_PATH', 'api'),
    asyncApiPath: configService.get<string>('ASYNC_API_PATH', 'async-api'),
  };
}

export type Config = Readonly<ReturnType<typeof config>>;

export const bootOptions: BootOptions<Config> = {
  serviceName: 'Test',
  serviceDescription: 'Microservice handling authentication',
  serviceVersion: JSON.parse(readFileSync(join('package.json'), 'utf8')).version || '0.0.1',
  config,
  AppModule,
  openApi: {
    customSiteTitle: 'Test API',
    customFavIcon: () => 'favicon.ico',
    enableExplorer: true,
    extraModels: [ExampleDto],
    filePath: () => resolve('./fixtures/openapi.json'),
    externalDocs: [{ description: 'Platform docs', url: 'https://developers.s1seven.com/' }],
    contacts: [{ name: 'S1Seven development team', url: 'https://s1seven.com', email: 'developers@s1seven.com' }],
    securityRequirements: ['bearer'],
    securitySchemes: [
      {
        name: 'bearer',
        scheme: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    ],
    tags: [
      {
        resource: 'Service',
        description: 'Display microservice credentials.',
      },
    ],
  },
  asyncApi: {
    defaultContentType: 'application/json',
    enableExplorer: true,
    extraModels: [ExampleDto],
    filePath: () => resolve('./fixtures/asyncapi.json'),
  },
  staticAssets: [{ path: 'public' }],
  globalFilters: [],
  globalPrefix: 'api',
  enableShutdownHooks: true,
  enableMicroservices: true,
  versioningOptions: true,
  cookieParserOptions: true,
  corsOptions: true,
  compressionOptions: true,
  helmetOptions: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        scriptSrc: ["'self'", "https: 'unsafe-inline'"],
      },
    },
  },
  rateLimitOptions: { max: 1000, windowMs: 900000 },
};

export function bootstrap(opts: { workerId?: number }, disconnect: () => void) {
  const setup: SetupOptions = {
    workerId: opts.workerId,
  };

  const boot = new ApplicationBoot<Config>(bootOptions);
  boot.bootstrap(setup);
  boot
    .on('started', () => {
      boot.logInfo();
    })
    .on('error', (error) => {
      boot.logger.error(error?.message || error);
      disconnect();
    });
}
