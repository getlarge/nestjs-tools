# Boot

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@s1seven/nestjs-tools-boot.svg?style=flat
[npm-url]: https://npmjs.org/package/@s1seven/nestjs-tools-boot

The ApplicationBootstrap class is provided to avoid boilerplate for bootrapping NestJS application, by simply providing a configuration object and listening to boot events.

## Installation

```bash
$ npm install --save @s1seven/nestjs-tools-boot
```

## Usage

```ts
import { ConfigService } from '@nestjs/config';
import type { SecuritySchemeObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Transport } from '@nestjs/microservices';
import { ApplicationBoot, ClusterServiceConfig, ClusterService, SetupOptions } from '@s1seven/nestjs-tools-boot';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './path-to-your-custom-filter';

function config(app: NestExpressApplication) {
  const configService = app.get(ConfigService);
  const proxyHostname = configService.get<string>('PROXY_SERVER_HOST');
  const proxyServerPort = configService.get<number>('PROXY_HTTP_SERVER_PORT');
  let defaultProxyServerUrl: string;
  if (proxyHostname && proxyServerPort) {
    defaultProxyServerUrl =
      proxyServerPort === 443
        ? `https://${proxyHostname}:${proxyServerPort}`
        : `http://${proxyHostname}:${proxyServerPort}`;
  }

  const clientOptions = {
    reconnectPeriod: 1000,
    keepalive: 30,
    clean: true,
  };

  return {
    environment: configService.get<string>('NODE_ENV'),
    brokerUrl: configService.get<string>('BROKER_URL', 'mqtt://localhost:1883'),
    microservices: [
      {
        transport: Transport.MQTT,
        options: clientOptions,
      },
    ],
    proxyServerUrl: configService.get<string>('PROXY_SERVER_URL', defaultProxyServerUrl),
    proxyServerUrls: configService.get<string[]>('PROXY_SERVER_URLS', [defaultProxyServerUrl]),
    serverHostname: configService.get<string>('HOSTNAME', 'localhost'),
    serverPort: configService.get<number>('PORT', 8000),
    serverUrl: configService.get<string>('SERVER_URL', 'http://localhost:8000'),
    swaggerPath: configService.get<string>('SWAGGER_PATH', 'api'),
    asyncApiPath: configService.get<string>('ASYNC_API_PATH', 'async-api'),
  };
}

type Config = Readonly<ReturnType<typeof config>>;

const bootOptions = {
  serviceName: 'Service',
  serviceDescription: 'Microservice description',
  serviceVersion: JSON.parse(readFileSync(join('package.json'), 'utf8')).version || '0.0.1',
  config,
  AppModule,
  openApi: {
    filePath: resolve('./openapi.json'),
    extraModels: [],
    externalDocs: [{ description: 'Platform docs', url: 'https://developers.s1seven.com/' }],
    contacts: [{ name: 'S1Seven development team', url: 'https://s1seven.com', email: 'developers@s1seven.com' }],
    securitySchemes: [
      {
        name: 'bearer',
        scheme: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        } as SecuritySchemeObject,
      },
      {
        name: 'Authentication',
        scheme: {
          type: 'apiKey',
          in: 'cookie',
          name: 'Authentication',
        } as SecuritySchemeObject,
      },
    ],
    tags: [
      {
        resource: 'Health',
        description: 'Check status of the server and its dependencies ( Memory, Disk storage, Network, ...)',
      },
    ],
  },
  globalFilters: [new HttpErrorFilter()],
  enableShutdownHooks: true,
  corsOptions: true,
  cookieParserOptions: true,
  compressionOptions: true,
  helmetOptions: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      },
    },
  },
};

function bootstrap(opts: { workerId?: number }, disconnect: () => void) {
  const setup: SetupOptions = {
    preSetup: (app: NestExpressApplication) => {
      console.log('pre-setup');
    },
    postSetup: (app: NestExpressApplication) => {
      console.log('post-setup');
    },
    postInit: (app: NestExpressApplication) => {
      console.log('post-init');
    },
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

function clusterConfig(): ClusterServiceConfig {
  return {
    workers: +process.env.MAX_WORKERS || 3,
    delay: 1000,
  };
}

const environment = process.env.NODE_ENV;
const devEnvironments = ['development', 'test'];
if (devEnvironments.includes(environment)) {
  bootstrap(null, () => {
    process.exit(1);
  });
} else {
  const clusterService = new ClusterService(clusterConfig());
  clusterService.clusterize(bootstrap).catch((e) => {
    clusterService.logger.error(e);
    process.exit(1);
  });
}
```
