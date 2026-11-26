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

/** The lock is held elsewhere and could not be acquired within the configured retries. */
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

/** Maps redlock-universal errors to this package's errors; anything else is returned unchanged. */
export function toLockError(error: unknown, key: string): unknown {
  if (error instanceof redlock.LockAcquisitionError) {
    return new LockAcquisitionError(error.key, error.attempts, error);
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
