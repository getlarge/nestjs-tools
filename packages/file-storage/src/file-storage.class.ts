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

export abstract class FileStorage {
  config?: FileStorageConfig & Record<string, any>;

  constructor(setup: Record<string, any>, factory?: (setup?: Record<string, any>) => any) {
    throw new Error('Constructor must be implemented');
  }

  transformFilePath(fileName: string, request?: Request, options?: any): string | Promise<string> {
    throw new Error(defaultErrorMessage);
  }

  fileExists(args: { filePath: string; options?: string | any; request?: Request | any }): Promise<boolean> {
    throw new Error(defaultErrorMessage);
  }

  uploadFile(args: {
    filePath: string;
    content: Buffer | string;
    options?: string | any;
    request?: Request | any;
  }): Promise<void> {
    throw new Error(defaultErrorMessage);
  }

  uploadStream(args: {
    filePath: string;
    options?: string | any;
    request?: Request | any;
  }): Writable | Promise<Writable> {
    throw new Error(defaultErrorMessage);
  }

  downloadFile(args: { filePath: string; options?: string | any; request?: Request | any }): Promise<Buffer | string> {
    throw new Error(defaultErrorMessage);
  }

  downloadStream(args: {
    filePath: string;
    options?: string | any;
    request?: Request | any;
  }): Readable | Promise<Readable> {
    throw new Error(defaultErrorMessage);
  }

  deleteFile(args: { filePath: string; request?: Request | any }): Promise<boolean> {
    throw new Error(defaultErrorMessage);
  }
}
