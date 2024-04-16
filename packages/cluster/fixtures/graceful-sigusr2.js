const { ClusterService } = require('../../../dist/packages/cluster');

const clusterService = new ClusterService({
  workers: 2,
  signals: ['SIGUSR2'],
});

const worker = (_opts, disconnect) => {
  let exited = false;
  console.log('worker');
  process.on('SIGUSR2', exit);

  async function exit() {
    if (exited) return;
    exited = true;
    console.log(`exiting`);
    disconnect();
  }
};

clusterService.clusterize(worker).catch((err) => {
  console.error(err);
  process.exit(1);
});
