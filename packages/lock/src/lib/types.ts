import type { RedisOptions } from 'ioredis';

export interface LockOptions {
  /**
   * Number of retries after the first failed acquisition attempt (total attempts = retryCount + 1).
   * @default 1
   */
  retryCount?: number;
  /**
   * Delay in milliseconds between acquisition attempts.
   * @default 200
   */
  retryDelay?: number;
}

export interface LockServiceOptions {
  redis: RedisOptions;
  lock?: LockOptions;
}

/**
 * Signal passed to `LockService.optimistic` routines. It is aborted when the lock can no longer be
 * extended; `error` then holds the reason.
 */
export type LockAbortSignal = AbortSignal & { readonly error?: Error };

/**
 * A lock held on `key`. `value` is the lock id: pass it to `LockService.get` / `LockService.unlock`
 * to release the lock from another process.
 */
export interface AcquiredLock {
  readonly key: string;
  readonly value: string;
  readonly ttl: number;
  /** Releases the lock. Resolves to `false` when the lock had already expired or was taken over. */
  release(): Promise<boolean>;
  /** Resets the lock expiry to `ttl` milliseconds. Resolves to `false` when the lock is no longer held. */
  extend(ttl: number): Promise<boolean>;
}
