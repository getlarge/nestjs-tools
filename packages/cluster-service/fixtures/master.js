const { ClusterService } = require('../dist');

const clusterService = new ClusterService({
  workers: 2,
  lifetime: 0,
});

const worker = () => {
  console.log('worker');
  process.exit();
};

const master = () => {
  console.log('master');
};

clusterService.clusterize(worker, master);
