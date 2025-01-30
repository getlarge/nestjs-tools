import { ExecutionError } from 'redlock';

import { LockService } from '../src';
import { getRedisClientConfig, mockConfigService } from './config.service.mock';
import { PatchedLockService } from './patched-lock.service.mock';

describe('Lock Service', () => {
  let lockService: LockService;

  beforeAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redis = getRedisClientConfig(mockConfigService as any);
    lockService = new PatchedLockService({ redis, lock: { retryCount: 0 } });
    await lockService.onModuleInit();
  });

  afterAll(async () => {
    await lockService.onModuleDestroy();
  });

  it('lock() - sets lock', async () => {
    const lock = await lockService.lock('testLock', 1000);
    expect(typeof lock.release).toBe('function');
  });

  it('lock() - does not set lock if it already exists', async () => {
    const expectedError = new ExecutionError(
      'The operation was unable to achieve a quorum during its retry window.',
      [],
    );
    //
    await expect(lockService.lock('testLock', 1000)).rejects.toThrow(expectedError);
  });

  it('lock() - unlocks', async () => {
    const lock = await lockService.lock('unlock', 1000);
    const res = await lock.release();
    const attempts = await Promise.all(res.attempts);
    expect(attempts.length).toBe(1);
  });

  it('lock() - expect to close connection when module is destroyed', async () => {
    const spy = jest.spyOn(lockService, 'close').mockImplementation(() => Promise.resolve());
    //
    await lockService.onModuleDestroy();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('Lock Service - unlocking with id', () => {
  let lockService: LockService;
  let lockId: string;

  beforeAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redis = getRedisClientConfig(mockConfigService as any);
    lockService = new PatchedLockService({ redis, lock: { retryCount: 0 } });
    await lockService.onModuleInit();
  });

  afterAll(async () => {
    await lockService.onModuleDestroy();
  });

  it('lock() - sets lock and gets lock id', async () => {
    const { value } = await lockService.lock('customlock', 20000);
    lockId = value;
    expect(typeof lockId).toBe('string');
  }, 5000);

  it('get() - find existing lock', async () => {
    const lock = await lockService.get('customlock', lockId);
    expect(typeof lock?.value).toBe('string');
    expect(lock?.value).toBe(lockId);
  }, 5000);

  it('unlock() - does not unlock with wrong id', async () => {
    await expect(lockService.unlock('customlock', 'wrongid')).rejects.toThrow();
  }, 5000);

  it('unlock() - unlocks when lock id is correct', async () => {
    const result = await lockService.unlock('customlock', lockId);
    expect(result.attempts.length).toBe(1);
  }, 5000);
});
