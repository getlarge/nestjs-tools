import { DynamicModule, Module, Provider } from '@nestjs/common';

import { FILE_STORAGE_STRATEGY_TOKEN } from './constants';
import { FileStorage } from './file-storage.class';
import { FileStorageService } from './file-storage.service';
import { FileStorageLocal } from './file-storage-fs.class';
import { FileStorageGoogle } from './file-storage-google.class';
import { FileStorageGoogleSetup } from './file-storage-google.types';
import { FileStorageS3 } from './file-storage-s3.class';
import { FileStorageS3Setup } from './file-storage-s3.types';
import {
  FileStorageGoogleOptions,
  FileStorageLocalOptions,
  FileStorageModuleAsyncOptions,
  FileStorageModuleOptions,
  FileStorageS3Options,
  StorageType,
} from './types';

export function getFileStorageStrategy<S extends StorageType, E extends Record<string, unknown>>(
  storageType: S,
  config: FileStorageModuleOptions<E>[S],
): FileStorageLocal | FileStorageS3 | FileStorageGoogle;
export function getFileStorageStrategy<
  S extends StorageType = StorageType.FS,
  E extends Record<string, unknown> = Record<string, unknown>,
>(storageType: S, config: FileStorageModuleOptions<E>[S]): FileStorageLocal;
export function getFileStorageStrategy<
  S extends StorageType = StorageType.S3,
  E extends Record<string, unknown> = Record<string, unknown>,
>(storageType: S, config: FileStorageModuleOptions<E>[S]): FileStorageS3;
export function getFileStorageStrategy<
  S extends StorageType = StorageType.G,
  E extends Record<string, unknown> = Record<string, unknown>,
>(storageType: S, config: FileStorageModuleOptions<E>[S]): FileStorageGoogle;
export function getFileStorageStrategy<S extends StorageType, E extends Record<string, unknown>>(
  storageType: S,
  config: FileStorageModuleOptions<E>[S],
): FileStorageLocal | FileStorageS3 | FileStorageGoogle {
  const { setup, factory } = config as FileStorageModuleOptions<E>[S];
  switch (storageType) {
    case StorageType.FS:
      return new FileStorageLocal(
        setup as FileStorageLocalOptions<E>['setup'],
        factory as FileStorageLocalOptions<E>['factory'],
      );
    case StorageType.S3:
      return new FileStorageS3(setup as FileStorageS3Setup, factory as FileStorageS3Options<E>['factory']);
    case StorageType.G:
      return new FileStorageGoogle(setup as FileStorageGoogleSetup, factory as FileStorageGoogleOptions<E>['factory']);
    default:
      throw new TypeError(`Invalid storage type: ${storageType}`);
  }
}

@Module({})
export class FileStorageModule {
  public static forRoot(
    storageType: StorageType.FS | StorageType.S3 | StorageType.G,
    options: Partial<FileStorageModuleOptions<Record<string, unknown>>> = {
      [StorageType.FS]: { setup: { storagePath: 'store', maxPayloadSize: 1 } },
    },
    isGlobal?: boolean,
  ): DynamicModule {
    if (!(storageType in options)) {
      throw new TypeError(`${storageType} options is missing.`);
    }
    const fileStorage = getFileStorageStrategy(
      storageType,
      options[storageType] as FileStorageModuleOptions<Record<string, unknown>>[StorageType],
    );
    const providers: [Provider<FileStorage>, Provider<FileStorageService>] = [
      {
        provide: FILE_STORAGE_STRATEGY_TOKEN,
        useValue: fileStorage,
      },
      FileStorageService,
    ];
    return {
      module: FileStorageModule,
      global: isGlobal,
      providers,
      exports: providers,
    };
  }

  public static forRootAsync(options: FileStorageModuleAsyncOptions, isGlobal?: boolean): DynamicModule {
    const { inject = [], imports = [], useFactory } = options;
    const providers: [Provider<FileStorage | Promise<FileStorage>>, Provider<FileStorageService>] = [
      {
        provide: FILE_STORAGE_STRATEGY_TOKEN,
        useFactory,
        inject,
      },
      FileStorageService,
    ];

    return {
      module: FileStorageModule,
      global: isGlobal,
      imports,
      providers,
      exports: providers,
    };
  }
}
