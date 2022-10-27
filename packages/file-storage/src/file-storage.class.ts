/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request } from 'express';
import { Readable, Writable } from 'stream';

// TODO: extend configuration
export interface FileStorageConfig {
  filePath?: (options: { request?: Request; fileName?: string; [key: string]: any }) => string | Promise<string>;
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

export abstract class FileStorage {
  config?: FileStorageConfig & Record<string, any>;

  constructor(setup: Record<string, any>, factory?: (setup?: Record<string, any>) => any) {
    //
  }

  transformFilePath(fileName: string, request?: Request, options?: any): string | Promise<string> {
    throw new Error(defaultErrorMessage);
  }

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
  ): Writable | Promise<Writable> {
    throw new Error(defaultErrorMessage);
  }

  downloadFile(args: FileStorageBaseArgs & { options?: string | any }): Promise<Buffer | string> {
    throw new Error(defaultErrorMessage);
  }

  downloadStream(
    args: FileStorageBaseArgs & {
      options?: string | any;
    },
  ): Readable | Promise<Readable> {
    throw new Error(defaultErrorMessage);
  }

  deleteFile(args: FileStorageBaseArgs): Promise<boolean> {
    throw new Error(defaultErrorMessage);
  }
}
