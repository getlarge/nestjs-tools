# Lock

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@getlarge/nestjs-tools-lock.svg?style=flat
[npm-url]: https://npmjs.org/package/@getlarge/nestjs-tools-lock

The Lock Service produces distributed locks to prevent duplicated or conflicting actions from running in a distributed environment.
It is based on [redlock-universal](https://www.npmjs.com/package/redlock-universal) and [ioredis](https://www.npmjs.com/package/ioredis).

## Installation

```bash
npm install --save @getlarge/nestjs-tools-lock ioredis
```

## Setup

```ts
import { LockModule } from '@getlarge/nestjs-tools-lock';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    LockModule.forRoot({
      redis: { host: 'localhost', port: 6379 },
      // optional, these are the defaults
      lock: { retryCount: 1, retryDelay: 200 },
    }),
  ],
})
export class AppModule {}
```

`LockModule.forRootAsync({ useFactory, inject, imports })` is also available.

| Option            | Default | Description                                                         |
| ----------------- | ------- | ------------------------------------------------------------------- |
| `lock.retryCount` | `1`     | Retries after the first failed attempt (total attempts = count + 1) |
| `lock.retryDelay` | `200`   | Delay between attempts, in milliseconds                             |

## Usage

```ts
import { LockAcquisitionError, LockService } from '@getlarge/nestjs-tools-lock';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  constructor(private readonly lockService: LockService) {}

  // Hold the lock for the duration of a routine; it is extended automatically.
  @Cron('*/10 * * * * *')
  async doThis(): Promise<void> {
    try {
      await this.lockService.optimistic('doThis', 2000, async (signal) => {
        // check `signal.aborted` in long-running work: it is set if the lock could not be extended
      });
    } catch (error) {
      if (error instanceof LockAcquisitionError) {
        return; // another instance holds the lock
      }
      throw error;
    }
  }

  // Acquire and release manually.
  @Cron('*/10 * * * * *')
  async doThat(): Promise<void> {
    const lock = await this.lockService.lock('doThat', 2000);
    try {
      // ...
    } finally {
      await lock.release();
    }
  }

  // Release from another process with the lock id.
  async releaseElsewhere(lockId: string): Promise<void> {
    await this.lockService.unlock('doThat', lockId);
  }
}
```

`lock()` resolves to an `AcquiredLock`:

| Member        | Description                                                            |
| ------------- | ---------------------------------------------------------------------- |
| `key`         | The locked key                                                         |
| `value`       | The lock id, to use with `get()` / `unlock()`                          |
| `ttl`         | The TTL in milliseconds                                                |
| `release()`   | Resolves to `true` if released, `false` if it had expired or was taken |
| `extend(ttl)` | Resolves to `true` if the expiry was reset, `false` if no longer held  |

## Errors

All errors raised by the library extend `LockError` (`key`, and the underlying library error in `cause`). Errors thrown by your own `optimistic()` routine are rethrown unchanged.

| Error                  | When                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| `LockAcquisitionError` | The lock is held elsewhere after all retries (`attempts` is set)      |
| `LockReleaseError`     | Redis failed during `release()` (an expired lock resolves to `false`) |
| `LockExtensionError`   | Redis failed during `extend()` (a lost lock resolves to `false`)      |

## Migrating from 1.x

Version 2 replaces [redlock](https://www.npmjs.com/package/redlock) (unmaintained 5.0 beta) with redlock-universal.

- `lock()` and `get()` return an `AcquiredLock` instead of redlock's `Lock`. `value`, `release()` and `extend()` keep their names; `release()` and `extend()` now resolve to a boolean instead of redlock's `ExecutionResult`/`Lock`. `resources`, `expiration` and `attempts` are gone.
- `unlock()` resolves to a boolean instead of an `ExecutionResult`.
- Errors are this package's own classes (`LockError` and subclasses) instead of redlock's `ExecutionError` / `ResourceLockedError`; acquisition failures throw `LockAcquisitionError`.
- `optimistic()` callbacks receive a `LockAbortSignal` (an `AbortSignal` with an optional `error`), equivalent to redlock's `RedlockAbortSignal`.
- `lock` options are limited to `retryCount` and `retryDelay`. `driftFactor`, `retryJitter` and `automaticExtensionThreshold` were removed, and `retryCount: -1` (retry forever) is no longer supported.
- The public `redlock` property and the unused `errorHandler()` method were removed.
