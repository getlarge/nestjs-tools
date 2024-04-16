import IORedisMock from 'ioredis-mock';
import Redlock from 'redlock';

import { LockService, LockServiceOptions } from '../src';

export class PatchedLockService extends LockService {
  constructor(options: LockServiceOptions) {
    super(options);
  }

  override createConnection() {
    this['redis'] = new IORedisMock(this.options.redis);
    this['redlock'] = new Redlock([this['redis']], {
      ...super['defaultLockOptions'],
      ...(this.options.lock || {}),
    });
  }
}
