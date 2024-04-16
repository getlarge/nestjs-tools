const { ClusterService } = require('../../../dist/packages/cluster');

const clusterService = new ClusterService({
  workers: 2,
});

const worker = (_opts, disconnect) => {
  let exited = false;
  console.log('worker');
  process.on('SIGTERM', exit);
  process.on('SIGINT', exit);

  async function exit() {
    if (exited) return;
    exited = true;

    await new Promise((r) => setTimeout(r, 100)); // simulate async cleanup
    console.log('exiting');
    disconnect();
  }
};

clusterService.clusterize(worker).catch((err) => {
  console.error(err);
  process.exit(1);
});
