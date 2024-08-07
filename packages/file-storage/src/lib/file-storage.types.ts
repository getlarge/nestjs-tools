/* eslint-disable @typescript-eslint/no-explicit-any */
import { MethodTypes, Request } from './types';

export interface FileStorageConfig {
  filePath?: (options: {
    request?: Request;
    fileName: string;
    methodType: MethodTypes;
    [key: string]: unknown;
  }) => string | Promise<string>;
  limits?: { fileSize: number };
}

export type FileStorageConfigFactory<T extends Record<string, any>, S extends Record<string, any>> = (
  setup: S,
) => T & FileStorageConfig;

export type FileStorageTransformPath = (
  fileName: string,
  methodType: MethodTypes,
  request?: Request,
  options?: any,
) => string | Promise<string>;

export interface FileStorageBaseArgs {
  filePath: string;
  request?: Request;
}

type Options = string | any;

export interface FileStorageFileExists extends FileStorageBaseArgs {
  options?: Options;
}

export interface FileStorageMoveFile extends FileStorageBaseArgs {
  newFilePath: string;
  options?: Options;
}

export interface FileStorageUploadFile extends FileStorageBaseArgs {
  content: Buffer | Uint8Array | string;
  options?: Options;
}

export interface FileStorageUploadStream extends FileStorageBaseArgs {
  options?: Options;
}

export interface FileStorageDownloadFile extends FileStorageBaseArgs {
  options?: Options;
}

export interface FileStorageDownloadStream extends FileStorageBaseArgs {
  options?: Options;
}

export interface FileStorageDeleteFile extends FileStorageBaseArgs {
  options?: Options;
}

export interface FileStorageGetFileMeta extends FileStorageBaseArgs {
  options?: Options;
}

export interface FileStorageDirBaseArgs {
  dirPath: string;
  request?: Request;
}

export interface FileStorageReadDir<R = string[], T = any> extends FileStorageDirBaseArgs {
  serializer?: (data: T) => R;
}

export interface FileStorageDeleteDir extends FileStorageDirBaseArgs {
  options?: Options;
}
