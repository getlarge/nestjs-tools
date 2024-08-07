import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import IORedis, { Redis } from 'ioredis';
import Redlock, { ExecutionResult, Lock, RedlockAbortSignal, ResourceLockedError } from 'redlock';

import { LOCK_SERVICE_OPTIONS } from './constants';
import { LockOptions, LockServiceOptions } from './types';

@Injectable()
export class LockService implements OnModuleInit, OnModuleDestroy {
  private readonly defaultLockOptions: LockOptions = {
    retryCount: 1,
    retryDelay: 200,
    // automaticExtensionThreshold: 500,
  };
  private redis!: Redis;
  redlock!: Redlock;

  constructor(@Inject(LOCK_SERVICE_OPTIONS) readonly options: LockServiceOptions) {}

  async onModuleInit(): Promise<void> {
    this.createConnection();
    await this.waitUntilInitialized();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  private async waitUntilInitialized(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const signal = controller.signal;

      const interval = setInterval(() => {
        if (this.isInitialized) {
          controller.abort();
          resolve();
        }
      }, 150);

      const timer = setTimeout(() => {
        if (!this.isInitialized) {
          controller.abort();
          reject(new Error('Initialization timed out'));
        }
      }, timeout);

      signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearTimeout(timer);
      });
    });
  }

  get isInitialized(): boolean {
    const validRedisStatus = ['connected', 'ready'];
    return !!this.redis && validRedisStatus.includes(this.redis.status) && !!this.redlock;
  }

  checkInitialization(): void {
    if (!this.isInitialized) {
      throw new Error('Redis was not yet initialized');
    }
  }

  errorHandler(error: unknown) {
    // Ignore cases where a resource is explicitly marked as locked on a client.
    if (error instanceof ResourceLockedError) {
      return;
    }
    // Log all other errors.
    console.error(error);
  }

  createConnection(): void {
    this.redis = new IORedis(this.options.redis);
    this.redlock = new Redlock([this.redis], { ...this.defaultLockOptions, ...(this.options.lock || {}) });
    // this.redlock.on('error', this.errorHandler);
  }

  optimistic<T = unknown>(key: string, ttl: number, cb: (signal: RedlockAbortSignal) => Promise<T>): Promise<T> {
    this.checkInitialization();
    return this.redlock.using<T>([key], ttl, cb);
  }

  lock(key: string, ttl: number): Promise<Lock> {
    this.checkInitialization();
    return this.redlock.acquire([key], ttl);
  }

  async get(key: string, lockId: string): Promise<Lock | null> {
    this.checkInitialization();
    const value = await this.redis.get(key);
    // provide fake data for attempts and expiration as this lock would be used for release only
    return value !== lockId ? null : new Lock(this.redlock, [key], lockId, [], 100);
  }

  async unlock(key: string, lockId: string): Promise<ExecutionResult> {
    this.checkInitialization();
    const lock = await this.get(key, lockId);
    if (!lock) {
      throw new Error(`Lock ${key} - ${lockId} not found.`);
    }
    return this.redlock.release(lock);
  }

  close(): Promise<void> {
    this.redlock?.removeAllListeners('error');
    return this.redlock?.quit();
  }
}
