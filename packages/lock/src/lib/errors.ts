import * as redlock from 'redlock-universal';

/** Base class for errors raised by `LockService`. The underlying library error, if any, is in `cause`. */
export class LockError extends Error {
  readonly cause?: unknown;

  constructor(
    message: string,
    readonly key: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/**
 * The lock is held elsewhere and could not be acquired within the configured retries.
 * Redis failures during acquisition are not contention: they throw a plain `LockError`.
 */
export class LockAcquisitionError extends LockError {
  constructor(
    key: string,
    readonly attempts: number,
    cause?: unknown,
  ) {
    super(`Failed to acquire lock "${key}" after ${attempts} attempt(s)`, key, cause);
  }
}

/** Redis failed while releasing the lock. A lock that had already expired is not an error: `release()` resolves to `false`. */
export class LockReleaseError extends LockError {
  constructor(key: string, cause?: unknown) {
    super(`Failed to release lock "${key}"`, key, cause);
  }
}

/** Redis failed while extending the lock. A lock that is no longer held is not an error: `extend()` resolves to `false`. */
export class LockExtensionError extends LockError {
  constructor(key: string, cause?: unknown) {
    super(`Failed to extend lock "${key}"`, key, cause);
  }
}

// redlock-universal reports contention and Redis failures with the same LockAcquisitionError;
// only its cause tells them apart ("Lock \"<key>\" is already held", or "Lock already held" in lean mode).
const LOCK_HELD_MESSAGE = /^Lock (".*" is )?already held$/;

/** True when `error` means the lock is held by someone else, as opposed to a Redis failure. */
export function isLockContention(error: unknown): error is redlock.LockAcquisitionError {
  if (!(error instanceof redlock.LockAcquisitionError)) {
    return false;
  }
  const cause = (error as { cause?: unknown }).cause;
  return cause instanceof Error && LOCK_HELD_MESSAGE.test(cause.message);
}

/** Maps redlock-universal errors to this package's errors; anything else is returned unchanged. */
export function toLockError(error: unknown, key: string): unknown {
  if (isLockContention(error)) {
    return new LockAcquisitionError(error.key, error.attempts, error);
  }
  if (error instanceof redlock.LockAcquisitionError) {
    const cause = (error as { cause?: unknown }).cause;
    const reason = cause instanceof Error ? `: ${cause.message}` : '';
    return new LockError(`Failed to acquire lock "${error.key}"${reason}`, error.key, cause ?? error);
  }
  if (error instanceof redlock.LockReleaseError) {
    return new LockReleaseError(error.key, error);
  }
  if (error instanceof redlock.LockExtensionError) {
    return new LockExtensionError(error.key, error);
  }
  if (error instanceof redlock.RedlockError) {
    return new LockError(error.message, key, error);
  }
  return error;
}
