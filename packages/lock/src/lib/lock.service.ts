import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import IORedis, { Redis } from 'ioredis';
import { setTimeout as sleep } from 'node:timers/promises';
import { createLock, executeWithAutoExtension, IoredisAdapter, type Lock, type LockHandle } from 'redlock-universal';

import { LOCK_SERVICE_OPTIONS } from './constants';
import { isLockContention, LockAcquisitionError, toLockError } from './errors';
import type { AcquiredLock, LockAbortSignal, LockOptions, LockServiceOptions } from './types';

type ResolvedLockOptions = Required<Pick<LockOptions, 'retryCount' | 'retryDelay' | 'retryJitter'>> & LockOptions;

/** Mirrors redlock-universal's single-node extension safety buffer: `min(2000ms, 10% of TTL)`. */
function extensionSafetyBuffer(ttl: number): number {
  return Math.min(2000, Math.floor(ttl * 0.1));
}

@Injectable()
export class LockService implements OnModuleInit, OnModuleDestroy {
  private readonly defaultLockOptions = {
    retryCount: 1,
    retryDelay: 200,
    retryJitter: 100,
  } satisfies LockOptions;
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
  async optimistic<T = unknown>(key: string, ttl: number, cb: (signal: LockAbortSignal) => Promise<T>): Promise<T> {
    this.checkInitialization();
    const lock = this.createLock(key, ttl);
    const handle = await this.acquire(lock, key);
    const { automaticExtensionThreshold, logger } = this.lockOptions;
    const threshold =
      automaticExtensionThreshold === undefined
        ? undefined
        : Math.min(Math.max(automaticExtensionThreshold, 2 * extensionSafetyBuffer(ttl)), ttl);
    return executeWithAutoExtension<T>({
      locks: [lock],
      handles: [handle],
      ttl,
      routine: (signal) => cb(signal as LockAbortSignal),
      ...(threshold !== undefined && { extensionThresholdRatio: threshold / ttl }),
      ...(logger && { logger }),
    });
  }

  async lock(key: string, ttl: number): Promise<AcquiredLock> {
    this.checkInitialization();
    const lock = this.createLock(key, ttl);
    const handle = await this.acquire(lock, key);
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

  private get lockOptions(): ResolvedLockOptions {
    return { ...this.defaultLockOptions, ...this.options.lock };
  }

  private createLock(key: string, ttl: number): Lock {
    const { performance, logger, circuitBreaker } = this.lockOptions;
    // Retries are driven by `acquire()` so that `retryJitter` applies.
    return createLock({
      adapter: this.adapter,
      key,
      ttl,
      retryAttempts: 0,
      ...(performance && { performance }),
      ...(logger && { logger }),
      ...(circuitBreaker !== undefined && { circuitBreaker }),
    });
  }

  private async acquire(lock: Lock, key: string): Promise<LockHandle> {
    const { retryCount, retryDelay, retryJitter } = this.lockOptions;
    for (let attempt = 1; ; attempt++) {
      try {
        return await lock.acquire();
      } catch (error) {
        // Only contention is retried; Redis failures surface immediately as `LockError`.
        if (!isLockContention(error)) {
          throw toLockError(error, key);
        }
        if (retryCount >= 0 && attempt > retryCount) {
          throw new LockAcquisitionError(key, attempt, error);
        }
      }
      const jitter = Math.floor((Math.random() * 2 - 1) * retryJitter);
      await sleep(Math.max(retryDelay + jitter, 0));
    }
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
