/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request } from 'express';
import { Readable, Writable } from 'stream';

import { MethodTypes } from './constants';

// TODO: extend configuration
export interface FileStorageConfig {
  filePath?: (options: {
    request?: Request;
    fileName?: string;
    methodType?: MethodTypes;
    [key: string]: any;
  }) => string | Promise<string>;
  limits?: { fileSize: number };
}

export type FileStorageConfigFactory<T = Record<string, any>, S = Record<string, any>> = (
  setup: S,
) => T & FileStorageConfig;

const defaultErrorMessage = 'Funtion must be implemented';

export interface FileStorageBaseArgs {
  filePath: string;
  request?: Request | any;
}

export interface FileStorageDirBaseArgs {
  dirPath: string;
  request?: Request | any;
}

export type FileStorageTransformPath = (
  fileName: string,
  methodType: MethodTypes,
  request?: Request | any,
  options?: any,
) => string | Promise<string>;

export abstract class FileStorage {
  config?: FileStorageConfig & Record<string, any>;

  constructor(setup: Record<string, any>, factory?: (setup?: Record<string, any>) => any) {
    //
  }

  transformFilePath: FileStorageTransformPath = (
    fileName,
    methodType,
    request,
    options = {},
  ): string | Promise<string> => {
    throw new Error(defaultErrorMessage);
  };

  fileExists(args: FileStorageBaseArgs & { options?: string | any }): Promise<boolean> {
    throw new Error(defaultErrorMessage);
  }

  uploadFile(
    args: FileStorageBaseArgs & {
      content: Buffer | Uint8Array | string;
      options?: string | any;
    },
  ): Promise<void> {
    throw new Error(defaultErrorMessage);
  }

  uploadStream(
    args: FileStorageBaseArgs & {
      options?: string | any;
    },
  ): Promise<Writable> {
    throw new Error(defaultErrorMessage);
  }

  downloadFile(args: FileStorageBaseArgs & { options?: string | any }): Promise<Buffer | string> {
    throw new Error(defaultErrorMessage);
  }

  downloadStream(
    args: FileStorageBaseArgs & {
      options?: string | any;
    },
  ): Promise<Readable> {
    throw new Error(defaultErrorMessage);
  }

  deleteFile(args: FileStorageBaseArgs): Promise<boolean> {
    throw new Error(defaultErrorMessage);
  }

  deleteDir(args: FileStorageDirBaseArgs): Promise<void> {
    throw new Error(defaultErrorMessage);
  }

  readDir(args: FileStorageDirBaseArgs): Promise<string[]> {
    throw new Error(defaultErrorMessage);
  }
}
