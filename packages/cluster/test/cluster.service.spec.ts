/* eslint-disable max-lines-per-function */
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { ClusterService, WorkerFn } from '../src';

const cpuCount = cpus().length;

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
  return join(__dirname, '../fixtures', name);
}

describe('ClusterService', function () {
  it('should throw an error when no worker function is provided', async () => {
    const expectedError = 'Start function required';
    //
    const clusterService = new ClusterService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(clusterService.clusterize('not_a_function' as any)).rejects.toThrow(new Error(expectedError));
  });

  it('should emit online event when a new worker is online', async () => {
    const workersOnline: Record<number, boolean> = { 1: false, 2: false };
    const clusterService = new ClusterService({
      workers: 2,
      lifetime: 0,
      showLogs: true,
    });
    const abortController = new AbortController();
    let _workerCount = 0;
    const workerFn: WorkerFn = (opts, disconnect) => {
      disconnect?.();
    };
    //
    await clusterService.clusterize(workerFn);
    //
    setTimeout(1000, { signal: abortController.signal }).then(() => abortController.abort());
    for await (const [worker] of clusterService.wait('online', {
      signal: abortController.signal,
    })) {
      workersOnline[worker.id] = true;
      _workerCount += 1;
      if (_workerCount === 2) {
        break;
      }
    }
    for (const workerId of Object.keys(workersOnline)) {
      clusterService.kill(Number(workerId));
    }
    clusterService.shutdown('SIGTERM')(false);
    abortController.abort();
    expect(Object.values(workersOnline).every((s) => s === true)).toBe(true);
  });

  it('should emit disconnect event when a worker is disconnected', async () => {
    const clusterService = new ClusterService({
      workers: 1,
      lifetime: 0,
    });
    const workerFn: WorkerFn = (opts, disconnect) => {
      disconnect?.();
    };
    const abortController = new AbortController();
    //
    const p1 = clusterService.waitOnce('online').then(([worker]) => worker.id);
    const p2 = clusterService
      .waitOnce('disconnect', {
        signal: abortController.signal,
      })
      .then(() => true);
    await clusterService.clusterize(workerFn);
    //
    const workerId = await p1;
    clusterService.kill(workerId);
    clusterService.shutdown('SIGTERM')(false);
    setTimeout(500, { signal: abortController.signal }).then(() => abortController.abort());
    const workerOffline = await p2;
    abortController.abort();
    expect(workerOffline).toBe(true);
  });

  it('should emit message event when a worker sends a message', async () => {
    const baseMessage = 'hello from worker';
    const clusterService = new ClusterService({
      workers: 1,
      lifetime: 0,
    });
    const workerFn: WorkerFn = (opts, disconnect, send) => {
      // this send method is not triggered by the test
      send(`${baseMessage} ${opts.workerId} ${process.pid}`);
      disconnect?.();
    };
    const abortController = new AbortController();
    //
    const p2 = clusterService
      .waitOnce('online', {
        signal: abortController.signal,
      })
      .then(([worker]) => {
        const p = clusterService.waitOnce('message', {
          signal: abortController.signal,
        });
        worker.emit('message', `${baseMessage} ${worker.id} ${process.pid}`);
        return p;
      })
      .then(([worker, msg]) => ({ worker, msg }));
    await clusterService.clusterize(workerFn);
    //
    const { msg } = await p2;
    clusterService.shutdown('SIGTERM')(false);
    setTimeout(500, { signal: abortController.signal }).then(() => abortController.abort());
    abortController.abort();
    expect(msg).toEqual(expect.stringContaining(baseMessage));
  });

  it('should start one worker per CPU when no worker count specified', async () => {
    const { child, done } = run(getFixture(Fixtures.cpus));
    const { out } = await done;
    const workers = out.match(/worker/g)?.length;
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
    if (process.env['CI']) return; // those tests are kind of flaky in Github CI runner...

    it('should start 3 workers that immediately exit, with lifetime of 0', async () => {
      const { done } = run(getFixture(Fixtures.exit));
      const { out, time } = await done;
      const workers = out.match(/worker/g)?.length;
      expect(workers).toBe(3);
      expect(time).toBeLessThan(200);
    }, 8000);

    it('should start 3 workers repeatedly and keep workers running for at least 500ms, with lifetime of 500ms', async () => {
      const { done } = run(getFixture(Fixtures.lifetime));
      const { out, time } = await done;
      const workers = out.match(/worker/g)?.length;
      expect(workers).toBeGreaterThanOrEqual(3);
      expect(time).toBeGreaterThan(500);
    }, 8000);

    it('should start 3 workers repeatedly and keep workers running until killed externally, with no lifetime specified', async () => {
      const delay = 2000;
      const { child, done } = run(getFixture(Fixtures.infinite));
      setTimeout(delay).then(() => child.kill());
      const { out } = await done;
      const workers = out.match(/worker/g)?.length;
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
      const primary = output.match(/primary/g)?.length;
      expect(primary).toBe(1);
    });

    it('should start two workers', () => {
      const workers = output.match(/worker/g)?.length;
      expect(workers).toBe(2);
    });
  });

  describe('signal handling', () => {
    if (process.platform === 'win32') return; // windows does not support signal-based process shutdown
    if (process.env['CI']) return; // those tests are kind of flaky in Github CI runner...
    const delay = 1000;

    it('should start 2 workers and allow them to shut down, when SIGTERM with 2 workers that exit gracefully', async () => {
      const { child, done } = run(getFixture(Fixtures.graceful));
      setTimeout(delay).then(() => child.kill());
      const { out } = await done;
      const workers = out.match(/worker/g)?.length;
      expect(workers).toBe(2);
      const exits = out.match(/exiting/g)?.length;
      expect(exits).toBe(2);
    });

    it('should start 2 workers and notify them that they should exit, when SIGTERM with 2 workers that fail to exit', async () => {
      const { child, done } = run(getFixture(Fixtures.kill));
      setTimeout(delay).then(() => child.kill());
      const { out } = await done;
      const workers = out.match(/ah ha ha ha/g)?.length;
      expect(workers).toBe(2);
      const exits = out.match(/stayin alive/g)?.length;
      expect(exits).toBe(2);
      // expect(time).toBeGreaterThanOrEqual(1250);
      //   expect(time).toBeLessThan(1350);
    });

    it('should start 2 workers and allow them to shut down when SIGINT on the process group (Ctrl+C) with 2 workers that exit gracefully', async () => {
      const { child, done } = run(getFixture(Fixtures.graceful));
      setTimeout(delay).then(() => (child.pid ? process.kill(-child.pid, 'SIGINT') : void 0));

      const { out } = await done;
      const workers = out.match(/worker/g)?.length;
      expect(workers).toBe(2);
      const exits = out.match(/exiting/g)?.length;
      expect(exits).toBe(2);
    });

    it('should start 2 workers and allow them to shut down when using custom shutdown signal with 2 workers that exit gracefully', async () => {
      const { child, done } = run(getFixture(Fixtures['graceful-sigusr2']));
      setTimeout(delay).then(() => child.kill('SIGUSR2'));
      const { out } = await done;
      const workers = out.match(/worker/g)?.length;
      expect(workers).toBe(2);
      const exits = out.match(/exiting/g)?.length;
      expect(exits).toBe(2);
    });
  });
});
