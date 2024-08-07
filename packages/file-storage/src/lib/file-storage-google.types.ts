import type {
  CreateReadStreamOptions,
  CreateWriteStreamOptions,
  DeleteFilesOptions,
  DownloadOptions,
  FileMetadata,
  FileOptions,
  GetFilesOptions,
  GetFilesResponse,
  MoveOptions,
  SaveOptions,
  Storage,
} from '@google-cloud/storage';
import type {
  DeleteOptions,
  ExistsOptions,
  GetMetadataOptions,
} from '@google-cloud/storage/build/cjs/src/nodejs-common/service-object';

import type {
  FileStorageDeleteDir,
  FileStorageDeleteFile,
  FileStorageDownloadFile,
  FileStorageDownloadStream,
  FileStorageFileExists,
  FileStorageGetFileMeta,
  FileStorageMoveFile,
  FileStorageReadDir,
  FileStorageUploadFile,
  FileStorageUploadStream,
} from './file-storage.types';

// TODO: add authentication options
export interface FileStorageGoogleSetup {
  maxPayloadSize: number;
  projectId?: string;
  bucketName: string;
  keyFilename?: string;
}

export interface FileStorageGoogleConfig {
  storage: Storage;
  bucket: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface FileStorageGoogleFileExists extends FileStorageFileExists {
  options?: ExistsOptions & FileOptions;
}

export interface FileStorageGoogleMoveFile extends FileStorageMoveFile {
  options?: FileOptions & MoveOptions;
}

export interface FileStorageGoogleUploadFile extends FileStorageUploadFile {
  options?: FileOptions & SaveOptions;
}

export interface FileStorageGoogleUploadStream extends FileStorageUploadStream {
  options?: CreateWriteStreamOptions & FileOptions;
}

export interface FileStorageGoogleDownloadFile extends FileStorageDownloadFile {
  options?: DownloadOptions & FileOptions;
}

export interface FileStorageGoogleDownloadStream extends FileStorageDownloadStream {
  options?: CreateReadStreamOptions & FileOptions;
}

export interface FileStorageGoogleDeleteFile extends FileStorageDeleteFile {
  options?: DeleteOptions & FileOptions;
}

export interface FileStorageGoogleGetFileMeta extends FileStorageGetFileMeta {
  options?: GetMetadataOptions & FileOptions;
}

export type FileStorageGoogleGetFileMetaOutput = FileMetadata;

export interface FileStorageGoogleDeleteDir extends FileStorageDeleteDir {
  options?: Omit<DeleteFilesOptions, 'prefix'> & FileOptions;
}

export interface FileStorageGoogleReadDir<R = string[]> extends FileStorageReadDir<R, GetFilesResponse> {
  options?: Omit<GetFilesOptions, 'prefix'> & FileOptions;
}
