import type { BigIntOptions, ObjectEncodingOptions, StatOptions, WriteFileOptions } from 'node:fs';

import type { FileStorageBaseArgs, FileStorageDirBaseArgs, FileStorageReadDirBaseArgs } from './file-storage.class';

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

export interface FileStorageLocalFileExists extends FileStorageBaseArgs {
  options?: StatOptions | BigIntOptions;
}

export interface FileStorageLocalMoveFile extends FileStorageBaseArgs {
  newFilePath: string;
}

export interface FileStorageLocalUploadFile extends FileStorageBaseArgs {
  content: string | Uint8Array | Buffer;
  options?: WriteFileOptions;
}

export interface FileStorageLocalUploadStream extends FileStorageBaseArgs {
  options?: BufferEncoding | StreamOptions;
}

export interface FileStorageLocalDownloadFile extends FileStorageBaseArgs {
  options:
    | { encoding?: null; flag?: string }
    | { encoding: BufferEncoding; flag?: string }
    | BufferEncoding
    | (ObjectEncodingOptions & { flag?: string })
    | undefined
    | null;
  // options?: Record<string, any> | BufferEncoding | null;
}

export interface FileStorageLocalDownloadStream extends FileStorageBaseArgs {
  options?: BufferEncoding | StreamOptions;
}

export interface FileStorageLocalDeleteDir extends FileStorageDirBaseArgs {
  options?: { recursive?: boolean; force?: boolean };
}

export interface FileStorageLocalReadDir<R = string> extends FileStorageReadDirBaseArgs<R> {
  options?: { encoding: BufferEncoding; withFileTypes?: boolean; recursive?: boolean } | BufferEncoding;
}
