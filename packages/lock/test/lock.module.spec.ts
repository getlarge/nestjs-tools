import { Test, TestingModule } from '@nestjs/testing';

import { LOCK_SERVICE_OPTIONS, LockModule, LockService } from '../src';
import { getRedisClientConfig, mockConfigService } from './config.service.mock';

describe('forRootAsync', () => {
  const options = getRedisClientConfig(mockConfigService as any);

  it('Can create instance with provider method', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LockModule.forRootAsync({
          useFactory: () => options,
        }),
      ],
    }).compile();

    const redisOptions = module.get(LOCK_SERVICE_OPTIONS);
    expect(redisOptions).toHaveProperty('port');
    expect(redisOptions.port).toEqual(options.port);
  });
});

describe('forRoot', () => {
  const options = getRedisClientConfig(mockConfigService as any);

  it('Can create instance ', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LockModule.forRoot(options)],
      providers: [LockService],
    }).compile();

    const lockService = module.get<LockService>(LockService);

    expect(lockService).toBeDefined();
    expect(lockService.options).toBeDefined();
    expect(lockService.options.port).toEqual(options.port);
  });
});
