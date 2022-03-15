import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Warlock from 'node-redis-warlock';
import { ClientOpts, createClient, RedisClient } from 'redis';

import { LOCK_SERVICE_OPTIONS } from './constants';

export type LockResponse = {
  unlock: () => Promise<void>;
  lockId: string;
};

@Injectable()
export class LockService implements OnModuleInit, OnModuleDestroy {
  private redis: RedisClient;
  private warlock: any;

  constructor(@Inject(LOCK_SERVICE_OPTIONS) readonly options: ClientOpts) {}

  onModuleInit(): void {
    this.createConnection();
  }

  onModuleDestroy(): void {
    this.close();
  }

  createConnection(): void {
    this.redis = createClient(this.options);
    this.warlock = Warlock(this.redis);
  }

  isInialized(): void {
    if (!this.redis || !this.warlock) {
      throw new Error('Redis was not yet initialized');
    }
  }

  optimistic(key: string, ttl: number, maxAttempts = 2, wait = 1000): Promise<void> {
    this.isInialized();
    return new Promise<void>((resolve, reject) => {
      this.warlock.optimistic(key, ttl, maxAttempts, wait, (err: Error) => (err ? reject(err) : resolve()));
    });
  }

  lock(key: string, ttl: number): Promise<LockResponse> {
    this.isInialized();
    return new Promise<LockResponse>((resolve, reject) => {
      this.warlock.lock(key, ttl, (err: Error, unlock: () => Promise<void>, lockId: string) =>
        err ? reject(err) : resolve({ unlock, lockId }),
      );
    });
  }

  unlock(key: string, lockId: string): Promise<number> {
    this.isInialized();
    return new Promise((resolve, reject) => {
      this.warlock.unlock(key, lockId, (err: Error, result: number) => (err ? reject(err) : resolve(result)));
    });
  }

  close() {
    this.redis?.end(false);
  }
}
