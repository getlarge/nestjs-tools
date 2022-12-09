/* eslint-disable no-console */
/* run with npx ts-node packages/boot/cluster-example.ts  */
import { ClusterService, ClusterServiceConfig, WorkerFn } from './src';

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
