import type {
  BigIntOptions,
  BigIntStats,
  Dirent,
  ObjectEncodingOptions,
  StatOptions,
  Stats,
  WriteFileOptions,
} from 'node:fs';

import type {
  FileStorageBaseArgs,
  FileStorageDeleteDir,
  FileStorageDownloadFile,
  FileStorageDownloadStream,
  FileStorageFileExists,
  FileStorageGetFileMeta,
  FileStorageMoveFile,
  FileStorageReadDir,
  FileStorageUploadFile,
  FileStorageUploadStream,
} from './file-storage.types';

export type StreamOptions = {
  flags?: string;
  encoding?: BufferEncoding;
  fd?: number;
  mode?: number;
  autoClose?: boolean;
  emitClose?: boolean;
  start?: number;
  end?: number;
  highWaterMark?: number;
};

export type FileStorageLocalSetup = {
  storagePath: string;
  maxPayloadSize: number;
  [key: string]: unknown;
};

export interface FileStorageLocalFileExists extends FileStorageFileExists {
  options?: StatOptions | BigIntOptions;
}

export interface FileStorageLocalMoveFile extends FileStorageMoveFile {
  newFilePath: string;
}

export interface FileStorageLocalUploadFile extends FileStorageUploadFile {
  options?: WriteFileOptions;
}

export interface FileStorageLocalUploadStream extends FileStorageUploadStream {
  options?: BufferEncoding | StreamOptions;
}

export interface FileStorageLocalDownloadFile extends FileStorageDownloadFile {
  options?:
    | { encoding?: null; flag?: string }
    | { encoding: BufferEncoding; flag?: string }
    | BufferEncoding
    | (ObjectEncodingOptions & { flag?: string })
    | undefined
    | null;
}

export interface FileStorageLocalDownloadStream extends FileStorageDownloadStream {
  options?: BufferEncoding | StreamOptions;
}

export type FileStorageLocalDeleteFile = FileStorageBaseArgs;

export interface FileStorageLocalGetFileMeta extends FileStorageGetFileMeta {
  options?: { bigint?: boolean | undefined };
}
export type FileStorageLocalGetFileMetaOutput = Stats | BigIntStats;

export interface FileStorageLocalDeleteDir extends FileStorageDeleteDir {
  options?: { recursive?: boolean; force?: boolean };
}

export type ReadDirOutput = string[] | Buffer[] | Dirent[];

export interface FileStorageLocalReadDir<R = string[], T = ReadDirOutput> extends FileStorageReadDir<R, T> {
  options?: { encoding: BufferEncoding; withFileTypes?: boolean; recursive?: boolean } | BufferEncoding;
}
