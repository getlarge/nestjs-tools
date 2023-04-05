const { ClusterService } = require('../dist');

const clusterService = new ClusterService({
  lifetime: 0,
  workers: 1,
});

async function master() {
  await new Promise((r) => setTimeout(r, 500));
  console.log('master');
}
async function worker(_opts, disconnect) {
  console.log('worker');
  disconnect();
}
clusterService.clusterize(worker, master);
