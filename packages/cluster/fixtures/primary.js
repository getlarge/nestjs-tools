const { ClusterService } = require('../../../dist/packages/cluster');

const clusterService = new ClusterService({
  workers: 2,
  lifetime: 0,
});

const worker = () => {
  console.log('worker');
  process.exit();
};

const primary = () => {
  console.log('primary');
};

clusterService.clusterize(worker, primary).catch((err) => {
  console.error(err);
  process.exit(1);
});
