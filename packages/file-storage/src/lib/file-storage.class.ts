/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Readable } from 'node:stream';

import { FileStorageWritable, MethodTypes } from './types';

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

const defaultErrorMessage = 'Funtion must be implemented';

type Request = any;

export interface FileStorageBaseArgs {
  filePath: string;
  request?: Request;
}

export interface FileStorageDirBaseArgs {
  dirPath: string;
  request?: Request;
}

export type FileStorageTransformPath = (
  fileName: string,
  methodType: MethodTypes,
  request?: Request,
  options?: any,
) => string | Promise<string>;

export abstract class FileStorage {
  readonly config?: FileStorageConfig & Record<string, any>;

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
  ): Promise<FileStorageWritable> {
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
