# Cluster

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@getlarge/nestjs-tools-cluster.svg?style=flat
[npm-url]: https://npmjs.org/package/@getlarge/nestjs-tools-cluster

This package provides a simple way to clusterize a NestJS application.
The `ClusterService` class is a wrapper around the native `cluster` module and provides a simple API to manage the workers' lifecycle.

## Installation

```bash
$ npm install --save @getlarge/nestjs-tools-cluster
```

## Example

```ts
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ClusterService, ClusterServiceConfig } from '@getlarge/cluster-service';
import { cpus } from 'node:os';

import { AppModule } from './app/app.module';

const GLOBAL_API_PREFIX = 'api';
const DEFAULT_PORT = 3000;
const CLUSTER_MODE = process.env.CLUSTER_MODE === 'true';
const MAX_WORKERS = +process.env.MAX_WORKERS || cpus().length;

async function bootstrap(
  opts: { workerId?: number } = {},
  disconnect: () => void = () => process.exit(1),
): Promise<void> {
  /**
   * This is a global variable that will be used to identify the worker id
   * in the application. This is useful for debugging purposes.
   */
  globalThis.__WORKER_ID__ = opts.workerId;

  try {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({
        trustProxy: true,
        bodyLimit: +process.env.MAX_PAYLOAD_SIZE || 1048576,
      }),
      { bufferLogs: true, abortOnError: false },
    );
    app.setGlobalPrefix(GLOBAL_API_PREFIX);
    const configService = app.get(ConfigService);
    const port = configService.get('PORT', { infer: true }) ?? DEFAULT_PORT;

    await app.listen(port, '0.0.0.0', () => {
      Logger.log(`Listening at http://localhost:${port}/${GLOBAL_API_PREFIX}`);
    });
  } catch (error) {
    Logger.error(error);
    disconnect();
  }
}

if (CLUSTER_MODE) {
  const clusterConfig: ClusterServiceConfig = {
    workers: MAX_WORKERS,
    delay: 2000,
    grace: 1000,
  };

  const clusterService = new ClusterService(clusterConfig);
  clusterService.clusterize(bootstrap).catch((e) => {
    clusterService.logger.error(e);
    process.exit(1);
  });
} else {
  void bootstrap({}, () => {
    process.exit(1);
  });
}
```

## Building

Run `nx build nestjs-tools-cluster` to build the library.

## Running unit tests

Run `nx test nestjs-tools-cluster` to execute the unit tests via [Jest](https://jestjs.io).
