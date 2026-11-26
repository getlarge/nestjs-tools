import { LockAcquisitionError, LockError, LockService } from '../src';
import { getRedisClientConfig, mockConfigService } from './config.service.mock';
import { PatchedLockService } from './patched-lock.service.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const redis = getRedisClientConfig(mockConfigService as any);

describe('Lock Service', () => {
  let lockService: LockService;

  beforeAll(async () => {
    lockService = new PatchedLockService({ redis, lock: { retryCount: 0 } });
    await lockService.onModuleInit();
  });

  afterAll(async () => {
    await lockService.onModuleDestroy();
  });

  it('lock() - sets lock', async () => {
    const lock = await lockService.lock('testLock', 1000);
    expect(lock.key).toBe('testLock');
    expect(typeof lock.value).toBe('string');
    expect(typeof lock.release).toBe('function');
  });

  it('lock() - does not set lock if it already exists', async () => {
    const error = await lockService.lock('testLock', 1000).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LockAcquisitionError);
    expect(error).toBeInstanceOf(LockError);
    expect(error).toMatchObject({ name: 'LockAcquisitionError', key: 'testLock', attempts: 1 });
    expect((error as LockError).cause).toBeInstanceOf(Error);
  });

  it('lock() - releases', async () => {
    const lock = await lockService.lock('unlock', 1000);
    await expect(lock.release()).resolves.toBe(true);
    await expect(lock.release()).resolves.toBe(false);
  });

  it('lock() - extends while held', async () => {
    const lock = await lockService.lock('extend', 1000);
    await expect(lock.extend(5000)).resolves.toBe(true);
    await lock.release();
    await expect(lock.extend(5000)).resolves.toBe(false);
  });

  it('lock() - expect to close connection when module is destroyed', async () => {
    const spy = jest.spyOn(lockService, 'close').mockImplementation(() => Promise.resolve());
    //
    await lockService.onModuleDestroy();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('Lock Service - optimistic', () => {
  let lockService: LockService;

  beforeAll(async () => {
    lockService = new PatchedLockService({ redis, lock: { retryCount: 0 } });
    await lockService.onModuleInit();
  });

  afterAll(async () => {
    await lockService.onModuleDestroy();
  });

  it('optimistic() - runs the routine under the lock and releases it', async () => {
    const result = await lockService.optimistic('optimistic', 1000, async (signal) => {
      expect(signal.aborted).toBe(false);
      await expect(lockService.lock('optimistic', 1000)).rejects.toThrow(LockAcquisitionError);
      return 'done';
    });
    expect(result).toBe('done');
    const lock = await lockService.lock('optimistic', 1000);
    await lock.release();
  });

  it('optimistic() - propagates routine errors unchanged and releases the lock', async () => {
    const routineError = new Error('routine failed');
    await expect(lockService.optimistic('optimistic-error', 1000, () => Promise.reject(routineError))).rejects.toBe(
      routineError,
    );
    const lock = await lockService.lock('optimistic-error', 1000);
    await lock.release();
  });
});

describe('Lock Service - retries', () => {
  let lockService: LockService;

  beforeAll(async () => {
    lockService = new PatchedLockService({ redis, lock: { retryCount: 5, retryDelay: 100 } });
    await lockService.onModuleInit();
  });

  afterAll(async () => {
    await lockService.onModuleDestroy();
  });

  it('lock() - acquires once the holder releases within the retry window', async () => {
    const first = await lockService.lock('retry', 5000);
    setTimeout(() => void first.release(), 150);
    const second = await lockService.lock('retry', 5000);
    expect(second.value).not.toBe(first.value);
    await second.release();
  });
});

describe('Lock Service - extension and logging options', () => {
  let lockService: LockService;
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };

  beforeAll(async () => {
    lockService = new PatchedLockService({
      redis,
      lock: { retryCount: 0, automaticExtensionThreshold: 300, logger },
    });
    await lockService.onModuleInit();
  });

  afterAll(async () => {
    await lockService.onModuleDestroy();
  });

  it('optimistic() - keeps the lock past its TTL using automaticExtensionThreshold and logs it', async () => {
    await lockService.optimistic('extended', 1000, async (signal) => {
      await new Promise((resolve) => setTimeout(resolve, 1300));
      expect(signal.error).toBeUndefined();
      expect(signal.aborted).toBe(false);
      await expect(lockService.lock('extended', 1000)).rejects.toThrow(LockAcquisitionError);
    });
    expect(logger.info).toHaveBeenCalledWith('Atomic extension attempt', expect.objectContaining({ key: 'extended' }));
    const lock = await lockService.lock('extended', 1000);
    await lock.release();
  });
});

describe('Lock Service - retry jitter', () => {
  let lockService: LockService;

  beforeAll(async () => {
    lockService = new PatchedLockService({ redis, lock: { retryCount: 2, retryDelay: 100, retryJitter: 50 } });
    await lockService.onModuleInit();
  });

  afterAll(async () => {
    await lockService.onModuleDestroy();
  });

  it('lock() - waits retryDelay +/- retryJitter between attempts', async () => {
    const first = await lockService.lock('jitter', 5000);
    const start = Date.now();
    const error = await lockService.lock('jitter', 5000).catch((e: unknown) => e);
    const elapsed = Date.now() - start;
    expect(error).toMatchObject({ name: 'LockAcquisitionError', attempts: 3 });
    expect(elapsed).toBeGreaterThanOrEqual(100);
    expect(elapsed).toBeLessThan(500);
    await first.release();
  });
});

describe('Lock Service - unlocking with id', () => {
  let lockService: LockService;
  let lockId: string;

  beforeAll(async () => {
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
    expect(lock?.value).toBe(lockId);
    expect(lock?.key).toBe('customlock');
  }, 5000);

  it('get() - returns null for a wrong id', async () => {
    await expect(lockService.get('customlock', 'wrongid')).resolves.toBeNull();
  }, 5000);

  it('unlock() - does not unlock with wrong id', async () => {
    await expect(lockService.unlock('customlock', 'wrongid')).rejects.toThrow();
  }, 5000);

  it('unlock() - unlocks when lock id is correct', async () => {
    await expect(lockService.unlock('customlock', lockId)).resolves.toBe(true);
    await expect(lockService.get('customlock', lockId)).resolves.toBeNull();
  }, 5000);
});
