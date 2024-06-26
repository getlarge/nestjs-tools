const { ClusterService } = require('../../../dist/packages/cluster');

const clusterService = new ClusterService({
  workers: 2,
  lifetime: 0,
  grace: 250,
});

const worker = () => {
  console.log('ah ha ha ha');

  process.once('SIGTERM', function () {
    console.log('stayin alive');
  });

  // console.log('worker');
  // process.exit();
};

clusterService.clusterize(worker).catch((err) => {
  console.error(err);
  process.exit(1);
});
