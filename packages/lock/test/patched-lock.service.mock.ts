import IORedis from 'ioredis';
import { IoredisAdapter } from 'redlock-universal';

import { LockService } from '../src';
import type { LockServiceOptions } from '../src/lib/types';

/**
 * Uses a real Redis (redlock-universal relies on Lua scripts that ioredis-mock cannot run) but delays
 * the connection to exercise waitUntilInitialized.
 */
export class PatchedLockService extends LockService {
  constructor(options: LockServiceOptions) {
    super(options);
  }

  override createConnection() {
    const redis = new IORedis({ ...this.options.redis, lazyConnect: true });
    this['redis'] = redis;
    this['adapter'] = new IoredisAdapter(redis);
    setTimeout(() => void redis.connect(), 200);
  }
}
