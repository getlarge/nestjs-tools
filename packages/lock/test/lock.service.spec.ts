/* eslint-disable sonarjs/no-identical-functions */
import { LockService } from '../src';
import { getRedisClientConfig, mockConfigService } from './config.service.mock';

describe('Lock Service', () => {
  let lockService: LockService;

  beforeAll(() => {
    const options = getRedisClientConfig(mockConfigService as any);
    lockService = new LockService(options);
    lockService.onModuleInit();
  });

  afterAll(() => {
    lockService.onModuleDestroy();
  });

  it('lock() - sets lock', async () => {
    const { unlock } = await lockService.lock('testLock', 1000);
    expect(typeof unlock).toBe('function');
  });

  it('lock() - does not set lock if it already exists', async () => {
    const { unlock } = await lockService.lock('testLock', 1000);
    expect(unlock).toBe(false);
  });

  it('lock() - unlocks', async () => {
    const { unlock } = await lockService.lock('unlock', 1000);
    const res = await unlock();
    expect(res).toBeUndefined();
  });

  it('lock() - expect to close connection when module is destroyed', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const spy = jest.spyOn(lockService, 'close').mockImplementation(() => {});
    //
    lockService.onModuleDestroy();
    expect(spy).toBeCalled();
    spy.mockRestore();
  });
});

describe('Lock Service - unlocking with id', () => {
  let lockService: LockService;
  let lockId: string;

  beforeAll(() => {
    const options = getRedisClientConfig(mockConfigService as any);
    lockService = new LockService(options);
    lockService.onModuleInit();
  });

  afterAll(() => {
    lockService.onModuleDestroy();
  });

  it('lock() - sets lock and gets lock id', async () => {
    const { lockId: id } = await lockService.lock('customlock', 20000);
    lockId = id;
    expect(typeof lockId).toBe('string');
  }, 5000);

  it('unlock() - does not unlock with wrong id', async () => {
    const result = await lockService.unlock('customlock', 'wrongid');
    expect(result).toBe(0);
  }, 5000);

  it('unlock() - unlocks', async () => {
    const result = await lockService.unlock('customlock', lockId);
    expect(result).toBe(1);
  }, 5000);
});
