/* eslint-disable max-lines-per-function */
/* eslint-disable sonarjs/no-duplicate-string */
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import os from 'os';
import path from 'path';

import { ClusterService, WorkerFn } from '../src';

const cpuCount = os.cpus().length;

enum Fixtures {
  throws = 'throws',
  exit = 'exit',
  lifetime = 'lifetime',
  infinite = 'infinite',
  cpus = 'cpus',
  primary = 'primary',
  kill = 'kill',
  graceful = 'graceful',
  'graceful-sigusr2' = 'graceful-sigusr2',
  async = 'async',
}

function run(file: string): {
  child: ChildProcessWithoutNullStreams;
  done: Promise<{ out: string; time: number }>;
} {
  const child = spawn('node', [file], { detached: true });
  const startTime = Date.now();
  let out = '';

  child.stdout.on('data', (data) => (out += data.toString()));
  child.stderr.on('data', (data) => (out += data.toString()));

  const done = new Promise<{ out: string; time: number }>((resolve) => {
    child.on('exit', () => {
      resolve({ out, time: Date.now() - startTime });
    });
  });

  return { child, done };
}

function getFixture(name: Fixtures) {
  return path.join(__dirname, '../fixtures', name);
}

function delay(ms = 1000) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('ClusterService', function () {
  it('should throw an error when no worker function is provided', async () => {
    const expectedError = 'Start function required';
    //
    const clusterService = new ClusterService();
    await expect(clusterService.clusterize(undefined)).rejects.toThrowError(new Error(expectedError));
  });

  it('should emit online event when a new worker is online', async () => {
    const workersOnline = { 1: false, 2: false };
    const clusterService = new ClusterService({
      workers: 2,
      lifetime: 0,
      showLogs: true,
    });
    const workerFn: WorkerFn = (opts: { workerId: number }, disconnect) => {
      disconnect();
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let workerCount = 0;
    clusterService.on('online', (worker) => {
      workersOnline[worker.id] = true;
      delay(250).then(() => clusterService.kill(worker.id));
      workerCount += 1;
      // it seems like the order of the workers is not guaranteed
      // expect(worker.id).toBe(workerCount);
    });
    await clusterService.clusterize(workerFn);
    await delay(500);
    clusterService.shutdown('SIGTERM')(false);
    await delay(500);
    expect(workersOnline[1]).toBe(true);
    expect(workersOnline[2]).toBe(true);
  });

  it('should emit disconnect event when a worker is disconnected', async () => {
    let workerOffline = false;
    let workerId: number;
    const clusterService = new ClusterService({
      workers: 1,
      lifetime: 0,
    });
    const workerFn: WorkerFn = (opts, disconnect) => {
      disconnect();
    };
    clusterService.once('online', (worker) => {
      workerId = worker.id;
    });
    clusterService.once('disconnect', () => {
      workerOffline = true;
    });
    await clusterService.clusterize(workerFn);
    await delay(500);
    clusterService.kill(workerId);
    await delay(250);
    clusterService.shutdown('SIGTERM')(false);
    await delay(500);
    expect(workerOffline).toBe(true);
  });

  //! this test has issue (process stuck) when executed with the 2 previous one above
  it.skip('should emit message event when a worker sends a message', async () => {
    const baseMessage = 'hello from worker';
    const clusterService = new ClusterService({
      workers: 1,
      lifetime: 0,
    });
    const workerFn: WorkerFn = (opts, disconnect, send) => {
      send(`${baseMessage} ${opts.workerId} ${process.pid}`);
      disconnect();
    };
    const receivedMessage = await new Promise((resolve, reject) => {
      clusterService.once('message', (worker, msg) => {
        clusterService.kill(worker.id);
        resolve(msg);
      });
      clusterService.clusterize(workerFn).then(() => {
        clusterService.removeAllListeners('message');
        reject(new Error('clusterize should not resolve'));
      });
    });

    clusterService.shutdown('SIGTERM')(false);
    await delay(500);
    expect(receivedMessage).toEqual(expect.stringContaining(baseMessage));
  }, 6000);

  it('should start one worker per CPU when no worker count specified', async () => {
    const { child, done } = run(getFixture(Fixtures.cpus));
    const { out } = await done;
    const workers = out.match(/worker/g).length;
    child.kill();
    expect(workers).toBe(cpuCount);
  }, 8000);

  it('should complete primary before starting workers when using sync primary and worker functions', async () => {
    const { child, done } = run(getFixture(Fixtures.async));
    const { out } = await done;
    child.kill();
    expect(out).toBe('primary\nworker\n');
  }, 9000);

  describe('with a worker function and 3 workers', () => {
    if (process.env.CI) return; // those tests are kind of flaky in Github CI runner...

    it('should start 3 workers that immediately exit, with lifetime of 0', async () => {
      const { done } = run(getFixture(Fixtures.exit));
      const { out, time } = await done;
      const workers = out.match(/worker/g).length;
      expect(workers).toBe(3);
      expect(time).toBeLessThan(100);
    }, 8000);

    it('should start 3 workers repeatedly and keep workers running for at least 500ms, with lifetime of 500ms', async () => {
      const { done } = run(getFixture(Fixtures.lifetime));
      const { out, time } = await done;
      const workers = out.match(/worker/g).length;
      expect(workers).toBeGreaterThanOrEqual(3);
      expect(time).toBeGreaterThan(500);
    }, 8000);

    it('should start 3 workers repeatedly and keep workers running until killed externally, with no lifetime specified', async () => {
      // const delay = 2000;
      const delay = 5000;
      const { child, done } = run(getFixture(Fixtures.infinite));
      setTimeout(() => child.kill(), delay);
      const { out } = await done;
      const workers = out.match(/worker/g).length;
      expect(workers).toBeGreaterThanOrEqual(3);
      // expect(time).toBeGreaterThanOrEqual(delay - 1000);
      // expect(time).toBeLessThan(delay);
    }, 8000);
  });

  describe('with a primary function and two workers', () => {
    let output: string;

    beforeAll(async () => {
      const { done } = run(getFixture(Fixtures.primary));
      const { out } = await done;
      output = out;
    }, 8000);

    it('should start one primary', () => {
      const primary = output.match(/primary/g).length;
      expect(primary).toBe(1);
    });

    it('should start two workers', () => {
      const workers = output.match(/worker/g).length;
      expect(workers).toBe(2);
    });
  });

  describe('signal handling', () => {
    if (process.platform === 'win32') return; // windows does not support signal-based process shutdown
    if (process.env.CI) return; // those tests are kind of flaky in Github CI runner...

    it('should start 2 workers and allow them to shut down, when SIGTERM with 2 workers that exit gracefully', async () => {
      const { child, done } = run(getFixture(Fixtures.graceful));
      // const delay = 750;
      const delay = 5000;
      setTimeout(() => child.kill(), delay);
      const { out } = await done;
      const workers = out.match(/worker/g).length;
      expect(workers).toBe(2);
      const exits = out.match(/exiting/g).length;
      expect(exits).toBe(2);
    }, 10000);

    it('should start 2 workers and notify them that they should exit, when SIGTERM with 2 workers that fail to exit', async () => {
      const { child, done } = run(getFixture(Fixtures.kill));
      // const delay = 1000;
      const delay = 5000;
      setTimeout(() => child.kill(), delay);
      const { out } = await done;
      const workers = out.match(/ah ha ha ha/g)?.length;
      expect(workers).toBe(2);
      const exits = out.match(/stayin alive/g)?.length;
      expect(exits).toBe(2);
      //   expect(duration).toBeGreaterThanOrEqual(1250);
      //   expect(duration).toBeLessThan(1350);
    }, 10000);

    it('should start 2 workers and allow them to shut down when SIGINT on the process group (Ctrl+C) with 2 workers that exit gracefully', async () => {
      // const delay = 1000;
      const delay = 5000;
      const { child, done } = run(getFixture(Fixtures.graceful));
      setTimeout(() => process.kill(-child.pid, 'SIGINT'), delay);
      const { out } = await done;
      const workers = out.match(/worker/g).length;
      expect(workers).toBe(2);
      const exits = out.match(/exiting/g).length;
      expect(exits).toBe(2);
    }, 10000);

    it('should start 2 workers and allow them to shut down when using custom shutdown signal with 2 workers that exit gracefully', async () => {
      // const delay = 750;
      const delay = 5000;
      const { child, done } = run(getFixture(Fixtures['graceful-sigusr2']));
      setTimeout(() => child.kill('SIGUSR2'), delay);
      const { out } = await done;
      const workers = out.match(/worker/g).length;
      expect(workers).toBe(2);
      const exits = out.match(/exiting/g).length;
      expect(exits).toBe(2);
    }, 10000);
  });
});
