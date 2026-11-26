const { ClusterService } = require('../dist');

const clusterService = new ClusterService({
  lifetime: 0,
  workers: 1,
});

async function primary() {
  await new Promise((r) => setTimeout(r, 500));
  console.log('primary');
}
async function worker(_opts, disconnect) {
  console.log('worker');
  disconnect();
}
clusterService.clusterize(worker, primary).catch((err) => {
  console.error(err);
  process.exit(1);
});
