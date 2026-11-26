import type { RedisOptions } from 'ioredis';

/** Message-first logger (Console, Winston, Bunyan, Nest's `Logger`-like adapters). */
export interface LockLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

export interface LockCircuitBreakerOptions {
  /** Consecutive Redis failures before the circuit opens (default: 5). */
  failureThreshold?: number;
  /** Time in milliseconds before probing Redis again once open (default: 60000). */
  resetTimeout?: number;
}

export interface LockOptions {
  /** Retries after the first failed attempt; total attempts = `retryCount + 1`, `-1` retries forever (default: 1). */
  retryCount?: number;
  /** Base delay between attempts, in milliseconds (default: 200). */
  retryDelay?: number;
  /** Random +/- variation applied to `retryDelay`, in milliseconds (default: 100). */
  retryJitter?: number;
  /**
   * In `optimistic()`, extend the lock when this many milliseconds of its TTL remain.
   * Defaults to 20% of the TTL. Values below twice the library's extension safety buffer
   * (`min(2000, 10% of TTL)`) are raised to it, because Redis refuses later extensions.
   */
  automaticExtensionThreshold?: number;
  /** `lean` trades logging and circuit breaking for lower memory use (default: `standard`). */
  performance?: 'standard' | 'lean' | 'enterprise';
  /** Structured logging of lock operations (default: none). Ignored in `lean` mode. */
  logger?: LockLogger;
  /**
   * Stops hitting Redis after repeated failures (default: enabled). State is kept per lock call,
   * across its retries. Ignored in `lean` mode.
   */
  circuitBreaker?: boolean | LockCircuitBreakerOptions;
}

export interface LockServiceOptions {
  redis: RedisOptions;
  lock?: LockOptions;
}

/** Aborted when the lock could not be extended; `error` holds the reason. */
export type LockAbortSignal = AbortSignal & { readonly error?: Error };

export interface AcquiredLock {
  readonly key: string;
  /** Unique lock value; pass it to `LockService.get()` / `unlock()` from another process. */
  readonly value: string;
  readonly ttl: number;
  /** Resolves `false` if the lock had already expired or was taken over. */
  release(): Promise<boolean>;
  /** Resolves `false` if the lock is no longer held. */
  extend(ttl: number): Promise<boolean>;
}
