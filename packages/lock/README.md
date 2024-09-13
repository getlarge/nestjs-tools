# Lock

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@getlarge/nestjs-tools-lock.svg?style=flat
[npm-url]: https://npmjs.org/package/@getlarge/nestjs-tools-lock

The Lock Service produce distributed locks to prevent duplicated/conflicted actions to be executed in a distributed environment.
It is based on [Redlock](https://www.npmjs.com/package/redlock) module.

## Installation

```bash
npm install --save @getlarge/nestjs-tools-lock
```

## Usage

### Inside a CronJob service

```ts
import { LockService } from '@getlarge/nestjs-tools-lock';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService implements OnModuleDestroy {
  constructor(private lockService: LockService) {}

  onModuleDestroy() {
    this.lockService.close();
  }

  // using returned unlock function
  @Cron('*/10 * * * * *')
  async doThis(): Promise<void> {
    const lockKey = 'doThis';
    const { unlock } = await this.lockService.lock(lockKey, 2000);
    if (typeof unlock !== 'function') {
      return;
    }
    unlock();
  }

  // using lock id
  @Cron('*/10 * * * * *')
  async doThat(): Promise<void> {
    const lockKey = 'doThat';
    await this.lockService.optimist(lockKey, 2000);
    const { lockId } = await this.lockService.lock(lockKey, 2000);
    this.lockService.unlock(lockKey, lockId);
  }
}
```
