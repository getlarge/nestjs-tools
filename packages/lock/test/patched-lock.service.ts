import IORedisMock from 'ioredis-mock';
import Redlock from 'redlock';

import { LockService, LockServiceOptions } from '../src';

export class PatchedLockService extends LockService {
  constructor(readonly options: LockServiceOptions) {
    super(options);
  }

  createConnection() {
    this['redis'] = new IORedisMock(this.options.redis);
    this['redlock'] = new Redlock([this['redis']], {
      ...super['defaultLockOptions'],
      ...(this.options.lock || {}),
    });
  }
}
