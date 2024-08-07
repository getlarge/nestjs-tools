import IORedisMock from 'ioredis-mock';
import Redlock from 'redlock';

import { LockService } from '../src';
import { LockServiceOptions } from '../src/lib/types';

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
    /**
     * Emulate the delay of the connection to test waitUntilInitialized
     */
    setTimeout(() => {
      this['redis'].status = 'ready';
    }, 200);
  }
}
