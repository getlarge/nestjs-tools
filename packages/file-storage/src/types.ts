import { InjectionToken, ModuleMetadata } from '@nestjs/common';

import { FileStorage, FileStorageConfigFactory } from './file-storage.class';
import { FileStorageLocalSetup } from './file-storage-fs.class';
import { FileStorageS3Config, FileStorageS3Setup } from './file-storage-s3.class';

export enum StorageType {
  FS = 'FS',
  S3 = 'S3',
}

export interface FileStorageLocalOptions<ExtraConfig extends Record<string, unknown>> {
  setup: FileStorageLocalSetup;
  factory?: FileStorageConfigFactory<ExtraConfig, FileStorageLocalSetup>;
}

export interface FileStorageS3Options<ExtraConfig extends Record<string, unknown>> {
  setup: FileStorageS3Setup;
  factory?: FileStorageConfigFactory<FileStorageS3Config & ExtraConfig, FileStorageS3Setup>;
}

export interface FileStorageModuleOptions<ExtraConfig extends Record<string, unknown> = Record<string, unknown>> {
  [StorageType.FS]?: FileStorageLocalOptions<ExtraConfig>;
  [StorageType.S3]?: FileStorageS3Options<ExtraConfig>;
}

export interface FileStorageModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => Promise<FileStorage> | FileStorage;
  // useClass?: FileStorage;
  // useExisting?: FileStorage;
  inject?: InjectionToken[];
}
