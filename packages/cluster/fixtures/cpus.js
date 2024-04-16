const { ClusterService } = require('../../../dist/packages/cluster');

const clusterService = new ClusterService({
  lifetime: 0,
});

const worker = () => {
  console.log('worker');
  process.exit();
};
clusterService.clusterize(worker).catch((err) => {
  console.error(err);
  process.exit(1);
});
