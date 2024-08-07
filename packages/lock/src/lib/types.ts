import type { RedisOptions } from 'ioredis';
import type { Settings } from 'redlock';

export type LockResponse = {
  unlock: () => Promise<void>;
  lockId: string;
};

export type LockOptions = Partial<Settings>;

export interface LockServiceOptions {
  redis: RedisOptions;
  lock?: LockOptions;
  // waitUntilInitializedTimeout?: number;
}
