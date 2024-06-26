import { InjectionToken, ModuleMetadata } from '@nestjs/common';
import { Writable } from 'node:stream';

import { FileStorage, FileStorageConfigFactory } from './file-storage.class';
import { FileStorageLocalSetup } from './file-storage-fs.class';
import { FileStorageS3Config, FileStorageS3Setup } from './file-storage-s3.class';

export enum StorageType {
  FS = 'FS',
  S3 = 'S3',
}

export enum MethodTypes {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Request = any;

export interface FileStorageLocalOptions<ExtraConfig extends Record<string, unknown>> {
  setup: FileStorageLocalSetup;
  factory?: FileStorageConfigFactory<ExtraConfig, FileStorageLocalSetup>;
}

export interface FileStorageS3Options<ExtraConfig extends Record<string, unknown>> {
  setup: FileStorageS3Setup;
  factory?: FileStorageConfigFactory<FileStorageS3Config & ExtraConfig, FileStorageS3Setup>;
}

export type FileStorageModuleOptions<ExtraConfig extends Record<string, unknown> = Record<string, unknown>> = {
  [StorageType.FS]: FileStorageLocalOptions<ExtraConfig>;
  [StorageType.S3]: FileStorageS3Options<ExtraConfig>;
};

export interface FileStorageModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => Promise<FileStorage> | FileStorage;
  // useClass?: FileStorage;
  // useExisting?: FileStorage;
  inject?: InjectionToken[];
}

interface WritableWithDoneEvent {
  emit(event: 'done', error?: Error): boolean;
  addListener(event: 'done', listener: (error?: Error) => void): this;
  on(event: 'done', listener: (error?: Error) => void): this;
  once(event: 'done', listener: (error?: Error) => void): this;
  prependOnceListener(event: 'done', listener: (error?: Error) => void): this;
  prependListener(event: 'done', listener: (error?: Error) => void): this;
  removeListener(event: 'done', listener: () => void): this;
}

export type FileStorageWritable = Writable & WritableWithDoneEvent;
