// inspired by https://github.com/hunterloftis/throng/blob/master/lib/throng.js
import { Logger } from '@nestjs/common';
import cluster, { Worker } from 'cluster';
import EventEmitter from 'events';
import os from 'os';

export type ClusterServiceConfig = {
  workers?: number;
  showLogs?: boolean;
  delay?: number;
  restartOnExit?: boolean;
  lifetime?: number;
  grace?: number;
  signals?: NodeJS.Signals[];
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noOp = () => {};

export interface ClusterServiceEmissions {
  online: (worker: Worker) => void;
  disconnect: (worker: Worker) => void;
  revive: (worker: Worker) => void;
  message: (worker: Worker, message: any) => void;
  ready: () => void;
  error: (error: Error) => void;
}

export class ClusterService extends EventEmitter {
  readonly logger = new Logger(ClusterService.name);
  private showLogs: boolean;
  private restartOnExit: boolean;
  private delay: number;
  private lifetime: number;
  private grace: number;
  private reviveUntil: number;
  private signals: NodeJS.Signals[];
  private workers: number;
  private running = false;

  private untypedOn = this.on;
  private untypedOnce = this.once;
  private untypedEmit = this.emit;

  on = <K extends keyof ClusterServiceEmissions>(event: K, listener: ClusterServiceEmissions[K]): this =>
    this.untypedOn(event, listener);
  once = <K extends keyof ClusterServiceEmissions>(event: K, listener: ClusterServiceEmissions[K]): this =>
    this.untypedOnce(event, listener);
  emit = <K extends keyof ClusterServiceEmissions>(
    event: K,
    ...args: Parameters<ClusterServiceEmissions[K]>
  ): boolean => this.untypedEmit(event, ...args);

  constructor(private config: ClusterServiceConfig = {}) {
    super({ captureRejections: true });
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
    if (this.showLogs) {
      this.logger.log(message);
    }
  }

  async fork(): Promise<void> {
    for (let i = 0; i < this.workers; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, this.delay));
      cluster.fork();
    }
  }

  async clusterize(
    worker: (
      opts: { workerId?: number },
      disconnect?: () => void,
      send?: (message: any) => void,
    ) => void | Promise<void>,
    master: () => void | Promise<void> = noOp,
  ): Promise<void> {
    if (typeof worker !== 'function') {
      throw new Error('Start function required');
    }
    if (this.isWorker) {
      return await worker({ workerId: this.workerId }, this.disconnect, this.send);
    }

    this.reviveUntil = Date.now() + this.lifetime;
    this.running = true;
    this.listen();
    await master();
    await this.fork();
    this.emit('ready');
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

  shutdown(signal: NodeJS.Signals): () => void {
    return () => {
      this.running = false;
      setTimeout(() => this.forceKill(signal), this.grace).unref();
      Object.values(cluster.workers).forEach((w) => {
        w.process.kill(signal);
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

  forceKill(signal: NodeJS.Signals): void {
    Object.values(cluster.workers).forEach((w) => w.kill(signal));
    this.removeAllListeners();
    this.log('Kill process');
    process.exit();
  }

  kill(workerId: number): void {
    cluster.workers[workerId]?.process?.kill();
  }

  send(msg: any, workerId?: number): void {
    if (typeof workerId === 'number') {
      cluster.workers[workerId]?.send(msg);
    } else {
      cluster.worker.send(msg);
    }
  }

  disconnect(workerId?: number): void {
    setTimeout(() => {
      if (typeof workerId === 'number') {
        cluster.workers[workerId]?.disconnect();
      } else {
        cluster.worker.disconnect();
      }
    }, 50);
  }
}
