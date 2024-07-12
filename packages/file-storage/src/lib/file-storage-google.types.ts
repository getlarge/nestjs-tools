import type {
  CreateReadStreamOptions,
  CreateWriteStreamOptions,
  DeleteFilesOptions,
  DownloadOptions,
  FileOptions,
  GetFilesOptions,
  SaveOptions,
  Storage,
} from '@google-cloud/storage';
import type { DeleteOptions, ExistsOptions } from '@google-cloud/storage/build/cjs/src/nodejs-common/service-object';

import type { FileStorageBaseArgs, FileStorageDirBaseArgs } from './file-storage.class';

// TODO: add authentication options
export interface FileStorageGoogleSetup {
  maxPayloadSize: number;
  projectId?: string;
  bucketName: string;
}

export interface FileStorageGoogleConfig {
  storage: Storage;
  bucket: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface FileStorageGoogleFileExists extends FileStorageBaseArgs {
  options?: ExistsOptions & FileOptions;
}

export interface FileStorageGoogleUploadFile extends FileStorageBaseArgs {
  content: string | Uint8Array | Buffer;
  options?: FileOptions & SaveOptions;
}

export interface FileStorageGoogleUploadStream extends FileStorageBaseArgs {
  options?: CreateWriteStreamOptions & FileOptions;
}

export interface FileStorageGoogleDownloadFile extends FileStorageBaseArgs {
  options?: DownloadOptions & FileOptions;
}

export interface FileStorageGoogleDownloadStream extends FileStorageBaseArgs {
  options?: CreateReadStreamOptions & FileOptions;
}

export interface FileStorageGoogleDeleteFile extends FileStorageBaseArgs {
  options?: DeleteOptions & FileOptions;
}

export interface FileStorageGoogleDeleteDir extends FileStorageDirBaseArgs {
  options?: Omit<DeleteFilesOptions, 'prefix'> & FileOptions;
}

export interface FileStorageGoogleReadDir extends FileStorageDirBaseArgs {
  options?: Omit<GetFilesOptions, 'prefix'> & FileOptions;
}
