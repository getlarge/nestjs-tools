// inspired by https://github.com/hunterloftis/throng/blob/master/lib/throng.js
import { EventHandlers, TypedEventEmitter } from '@s1seven/typed-event-emitter';
import cluster, { Worker } from 'node:cluster';
import os from 'node:os';

type Logger = Pick<Console, 'log' | 'info' | 'warn' | 'error'>;

export type ClusterServiceConfig = {
  workers?: number;
  showLogs?: boolean;
  delay?: number;
  restartOnExit?: boolean;
  lifetime?: number;
  grace?: number;
  signals?: NodeJS.Signals[];
  logger?: Logger;
};

export interface ClusterServiceEmissions extends EventHandlers {
  online: (worker: Worker) => void;
  disconnect: (worker: Worker) => void;
  revive: (worker: Worker) => void;
  message: (worker: Worker, message: any) => void;
  ready: () => void;
  error: (error: Error) => void;
}

export type WorkerFn = (
  opts: { workerId?: number },
  disconnect?: (workerId?: number) => void,
  send?: (message: any, workerId?: number) => void,
) => void | Promise<void>;

export type PrimaryFn = () => void | Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noOp: PrimaryFn = () => {};

export class ClusterService extends TypedEventEmitter<ClusterServiceEmissions> {
  readonly logger: Logger;
  private showLogs: boolean;
  private restartOnExit: boolean;
  private delay: number;
  private lifetime: number;
  private grace: number;
  private reviveUntil: number;
  private signals: NodeJS.Signals[];
  private workers: number;
  private running = false;

  constructor(private config: ClusterServiceConfig = {}) {
    super({ captureRejections: true });
    this.logger = this.config.logger || console;
    this.restartOnExit = this.config.restartOnExit || false;
    this.showLogs = this.config.showLogs || false;
    this.workers = typeof this.config.workers === 'number' ? this.config.workers : os.cpus().length;
    this.delay = this.config.delay || 0;
    this.lifetime = typeof this.config.lifetime === 'number' ? this.config.lifetime : Infinity;
    this.grace = typeof this.config.grace === 'number' ? this.config.lifetime : 5000;
    this.signals = this.config.signals || ['SIGTERM', 'SIGINT'];
  }

  /*
   * @deprecated
   */
  get isMaster() {
    return cluster.isPrimary;
  }

  get isPrimary() {
    return cluster.isPrimary;
  }

  get isWorker() {
    return cluster.isWorker;
  }

  get workerId() {
    return cluster.worker?.id;
  }

  log(message: any): void {
    this.showLogs && this.logger.log(message);
  }

  async fork(): Promise<void> {
    for (let i = 0; i < this.workers; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, this.delay));
      cluster.fork();
    }
  }

  async clusterize(workerFn: WorkerFn, primaryFn: PrimaryFn = noOp): Promise<number> {
    if (typeof workerFn !== 'function') {
      throw new TypeError('Start function required');
    }
    if (this.isWorker) {
      await workerFn({ workerId: this.workerId }, this.disconnect, this.send);
      return this.workerId;
    }

    this.reviveUntil = Date.now() + this.lifetime;
    this.running = true;
    this.listen();
    await primaryFn();
    await this.fork();
    this.emit('ready');
    return 0;
  }

  listen(): void {
    cluster.on('online', (worker) => {
      this.log(`Worker ${worker.process.pid} is online`);
      this.emit('online', worker);
    });
    cluster.on('message', (worker, message) => {
      this.emit('message', worker, message);
    });
    cluster.on('disconnect', (worker) => this.revive(worker));
    this.signals.forEach((signal) => process.on(signal, this.shutdown(signal)));
  }

  shutdown(signal: NodeJS.Signals): (killProcess?: boolean) => void {
    return (killProcess = true) => {
      this.running = false;
      setTimeout(() => this.forceKill(signal, killProcess), this.grace).unref();
      Object.values(cluster.workers).forEach((w) => {
        w.process.kill(signal);
        w.removeAllListeners();
      });
    };
  }

  revive(worker: Worker): void {
    this.log(`Worker ${worker.process.pid} is disconnected`);
    this.emit('disconnect', worker);
    if (!this.running) return;
    if (!this.restartOnExit) return;
    if (Date.now() >= this.reviveUntil) return;
    this.emit('revive', worker);
    cluster.fork();
  }

  forceKill(signal: NodeJS.Signals, killProcess = true): void {
    Object.values(cluster.workers).forEach((w) => w.kill(signal));
    this.removeAllListeners();
    this.log('Kill process');
    killProcess && process.exit(0);
  }

  kill(workerId: number): void {
    cluster.workers[workerId]?.process?.kill();
  }

  send(msg: any, workerId?: number): void {
    if (typeof workerId === 'number' && this.isPrimary) {
      cluster.workers[workerId]?.send(msg);
    } else {
      cluster.worker.send(msg);
    }
  }

  disconnect(workerId?: number): void {
    setTimeout(() => {
      if (typeof workerId === 'number' && this.isPrimary) {
        cluster.workers[workerId]?.disconnect();
      } else {
        cluster.worker.disconnect();
      }
    }, 50);
  }
}
