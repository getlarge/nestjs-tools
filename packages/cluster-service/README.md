# ClusterService

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@s1seven/cluster-service.svg?style=flat
[npm-url]: https://npmjs.org/package/@s1seven/cluster-service

The ClusterService class allows you to easily create a cluster of NestJS (or other Node based) applications.

## Installation

```bash
$ npm install --save @s1seven/cluster-service
```

## Usage

```ts
import { ClusterService, ClusterServiceConfig, WorkerFn } from '@s1seven/cluster-service';

const clusterConfig: ClusterServiceConfig = {
  workers: 3,
  delay: 200,
  grace: 1000,
};

const workerFn: WorkerFn = (opts, disconnect, send) => {
  const { workerId } = opts;
  setTimeout(() => {
    send(`Hello from worker ${workerId}`);
    disconnect();
  }, 100);
};

const clusterService = new ClusterService(clusterConfig);
clusterService
  .on('ready', () => {
    clusterService.send('Hello from primary', 1);
  })
  .on('message', (worker, msg) => {
    console.log(worker.id, msg);
  });

clusterService
  .clusterize(workerFn)
  .then((workerId) => {
    console.log({ workerId });
  })
  .catch((e) => {
    clusterService.logger.error(e);
    process.exit(1);
  });
```
