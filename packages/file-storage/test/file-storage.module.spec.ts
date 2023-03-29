import { Test, TestingModule } from '@nestjs/testing';

import {
  FileStorage,
  FileStorageLocal,
  FileStorageModule,
  FileStorageModuleOptions,
  FileStorageS3,
  FileStorageService,
  StorageType,
} from '../src';
import { FILE_STORAGE_STRATEGY_TOKEN } from '../src/constants';

class FileStorageTest extends FileStorage {
  constructor() {
    super({});
  }
}

describe('forRootAsync', () => {
  it('Can create FileStorage instance with provider method', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        FileStorageModule.forRootAsync({
          useFactory: (): FileStorageTest => new FileStorageTest(),
        }),
      ],
    }).compile();

    const fileStorage = module.get(FILE_STORAGE_STRATEGY_TOKEN);
    const fileStorageService = module.get(FileStorageService);

    expect(fileStorage).toBeInstanceOf(FileStorage);
    expect(fileStorageService).toBeInstanceOf(FileStorageService);
  });

  it('Can create FileStorage instance with async provider method', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        FileStorageModule.forRootAsync({
          useFactory: async (): Promise<FileStorageTest> => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return new FileStorageTest();
          },
        }),
      ],
    }).compile();

    const fileStorage = module.get(FILE_STORAGE_STRATEGY_TOKEN);
    const fileStorageService = module.get(FileStorageService);

    expect(fileStorage).toBeInstanceOf(FileStorage);
    expect(fileStorageService).toBeInstanceOf(FileStorageService);
  });
});

describe('forRoot', () => {
  it('Can create FileStorageLocal instance from options', async () => {
    const storageType: StorageType = StorageType.FS;
    const options: FileStorageModuleOptions = {
      [storageType]: { setup: { storagePath: '', maxPayloadSize: 1 } },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [FileStorageModule.forRoot(storageType, options)],
    }).compile();

    const fileStorage = module.get(FILE_STORAGE_STRATEGY_TOKEN);
    const fileStorageService = module.get(FileStorageService);

    expect(fileStorage).toBeInstanceOf(FileStorageLocal);
    expect(fileStorageService).toBeInstanceOf(FileStorageService);
  });

  it('Can create FileStorageS3 instance from options', async () => {
    const storageType: StorageType = StorageType.S3;
    const options: FileStorageModuleOptions = {
      [storageType]: {
        setup: {
          bucket: 'bucket',
          credentials: {
            accessKeyId: 'access key',
            secretAccessKey: 'secret access key',
          },
          maxPayloadSize: 1,
          region: 'eu-central-1',
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [FileStorageModule.forRoot(storageType, options)],
    }).compile();

    const fileStorage = module.get(FILE_STORAGE_STRATEGY_TOKEN);
    const fileStorageService = module.get(FileStorageService);

    expect(fileStorage).toBeInstanceOf(FileStorageS3);
    expect(fileStorageService).toBeInstanceOf(FileStorageService);
  });
});
