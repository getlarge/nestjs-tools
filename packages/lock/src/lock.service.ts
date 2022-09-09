import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import IORedis, { Redis, RedisOptions } from 'ioredis';
import Redlock, { ExecutionResult, Lock, RedlockAbortSignal, ResourceLockedError, Settings } from 'redlock';

import { LOCK_SERVICE_OPTIONS } from './constants';

export type LockResponse = {
  unlock: () => Promise<void>;
  lockId: string;
};

export type LockOptions = Partial<Settings>;

export interface LockServiceOptions {
  redis: RedisOptions;
  lock?: LockOptions;
}

@Injectable()
export class LockService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  redlock: Redlock;
  private readonly defaultLockOptions: LockOptions = {
    retryCount: 1,
    retryDelay: 200,
    // automaticExtensionThreshold: 500,
  };
  constructor(@Inject(LOCK_SERVICE_OPTIONS) readonly options: LockServiceOptions) {}

  onModuleInit(): void {
    this.createConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  errorHandler(error: any) {
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

  isInitialized(): void {
    if (!this.redis || !this.redlock) {
      throw new Error('Redis was not yet initialized');
    }
  }

  optimistic<T = any>(key: string, ttl: number, cb: (signal: RedlockAbortSignal) => Promise<T>): Promise<T> {
    this.isInitialized();
    return this.redlock.using<T>([key], ttl, cb);
  }

  lock(key: string, ttl: number): Promise<Lock> {
    this.isInitialized();
    return this.redlock.acquire([key], ttl);
  }

  async get(key: string, lockId: string): Promise<Lock> {
    this.isInitialized();
    const value = await this.redis.get(key);
    // provide fake data for attempts and expiration as this lock would be used for release only
    return value !== lockId ? null : new Lock(this.redlock, [key], lockId, [], 100);
  }

  async unlock(key: string, lockId: string): Promise<ExecutionResult> {
    this.isInitialized();
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
