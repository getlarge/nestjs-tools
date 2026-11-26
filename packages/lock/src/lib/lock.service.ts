import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import IORedis, { Redis } from 'ioredis';
import { createLock, IoredisAdapter, type Lock, type LockHandle } from 'redlock-universal';

import { LOCK_SERVICE_OPTIONS } from './constants';
import { toLockError } from './errors';
import type { AcquiredLock, LockAbortSignal, LockOptions, LockServiceOptions } from './types';

@Injectable()
export class LockService implements OnModuleInit, OnModuleDestroy {
  private readonly defaultLockOptions: Required<LockOptions> = {
    retryCount: 1,
    retryDelay: 200,
  };
  private redis!: Redis;
  private adapter!: IoredisAdapter;

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
    return !!this.redis && validRedisStatus.includes(this.redis.status) && !!this.adapter;
  }

  checkInitialization(): void {
    if (!this.isInitialized) {
      throw new Error('Redis was not yet initialized');
    }
  }

  createConnection(): void {
    this.redis = new IORedis(this.options.redis);
    this.adapter = new IoredisAdapter(this.redis);
  }

  /**
   * Runs `cb` while holding the lock on `key`, extending it automatically until `cb` settles.
   * `signal` is aborted if an extension fails.
   */
  optimistic<T = unknown>(key: string, ttl: number, cb: (signal: LockAbortSignal) => Promise<T>): Promise<T> {
    this.checkInitialization();
    return mapErrors(key, () => this.createLock(key, ttl).using<T>(cb));
  }

  async lock(key: string, ttl: number): Promise<AcquiredLock> {
    this.checkInitialization();
    const lock = this.createLock(key, ttl);
    const handle = await mapErrors(key, () => lock.acquire());
    return this.toAcquiredLock(lock, handle);
  }

  async get(key: string, lockId: string): Promise<AcquiredLock | null> {
    this.checkInitialization();
    const value = await this.redis.get(key);
    if (value !== lockId) {
      return null;
    }
    // The original TTL is unknown here; the remaining one is only informational.
    const ttl = Math.max(await this.redis.pttl(key), 1);
    const lock = this.createLock(key, ttl);
    const handle: LockHandle = { id: lockId, key, value: lockId, acquiredAt: Date.now(), ttl };
    return this.toAcquiredLock(lock, handle);
  }

  async unlock(key: string, lockId: string): Promise<boolean> {
    this.checkInitialization();
    const lock = await this.get(key, lockId);
    if (!lock) {
      throw new Error(`Lock ${key} - ${lockId} not found.`);
    }
    return lock.release();
  }

  async close(): Promise<void> {
    if (this.redis && this.redis.status !== 'end') {
      await this.redis.quit();
    }
  }

  private createLock(key: string, ttl: number): Lock {
    const { retryCount, retryDelay } = { ...this.defaultLockOptions, ...this.options.lock };
    return createLock({ adapter: this.adapter, key, ttl, retryAttempts: retryCount, retryDelay });
  }

  private toAcquiredLock(lock: Lock, handle: LockHandle): AcquiredLock {
    return {
      key: handle.key,
      value: handle.value,
      ttl: handle.ttl,
      release: () => mapErrors(handle.key, () => lock.release(handle)),
      extend: (ttl: number) => mapErrors(handle.key, () => lock.extend(handle, ttl)),
    };
  }
}

async function mapErrors<T>(key: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toLockError(error, key);
  }
}
