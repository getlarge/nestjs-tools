import { Request } from 'express';
import {
  BigIntOptions,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  ObjectEncodingOptions,
  readFile,
  stat,
  StatOptions,
  unlink,
  writeFile,
  WriteFileOptions,
} from 'fs';
import { resolve as resolvePath } from 'path';
import { Readable, Writable } from 'stream';
import { promisify } from 'util';

import { FileStorage, FileStorageConfig, FileStorageConfigFactory } from './file-storage.class';

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

export type FileStorageLocalSetup = { storagePath: string; maxPayloadSize: number; [key: string]: unknown };

function config(setup: FileStorageLocalSetup) {
  const { maxPayloadSize, storagePath } = setup;
  const filePath = (options: { req?: Request; fileName: string }): string => {
    const { fileName } = options;
    if (!existsSync(storagePath)) {
      mkdirSync(storagePath, { recursive: true });
    }
    return resolvePath(storagePath, fileName);
  };
  const limits = { fileSize: maxPayloadSize * 1024 * 1024 };
  return { filePath, limits };
}

// TODO: control filesize limit
export class FileStorageLocal implements FileStorage {
  config: FileStorageConfig & Record<string, any>;
  setup: { storagePath: string; maxPayloadSize: number };

  constructor(setup: FileStorageLocalSetup, factory?: FileStorageConfigFactory) {
    this.config = typeof factory === 'function' ? factory(setup) : config(setup);
  }

  transformFilePath(fileName: string, request?: Request, options: any = {}): string | Promise<string> {
    return typeof this.config.filePath === 'function'
      ? this.config.filePath({ fileName, request, ...options })
      : fileName;
  }

  async fileExists(args: {
    filePath: string;
    options?: StatOptions | BigIntOptions;
    request?: Request | any;
  }): Promise<boolean> {
    const { filePath, options = {}, request } = args;
    const fileName = await this.transformFilePath(filePath, request, options);
    return new Promise<boolean>((resolve, reject) => stat(fileName, (err) => (err ? reject(err) : resolve(true))));
  }

  async uploadFile(args: {
    filePath: string;
    content: string | Uint8Array | Buffer;
    options?: WriteFileOptions;
    request?: Request | any;
  }): Promise<void> {
    const { filePath, content, options, request } = args;
    const fileName = await this.transformFilePath(filePath, request, options);
    return promisify(writeFile)(fileName, content, options);
  }

  async uploadStream(args: {
    filePath: string;
    options?: BufferEncoding | StreamOptions;
    request?: Request | any;
  }): Promise<Writable> {
    const { filePath, options, request } = args;
    const fileName = await this.transformFilePath(filePath, request, options);
    return createWriteStream(fileName, options);
  }

  downloadFile(args: {
    filePath: string;
    options: { encoding?: null; flag?: string };
    request?: Request | any;
  }): Promise<Buffer>;

  downloadFile(args: {
    filePath: string;
    options: { encoding: BufferEncoding; flag?: string } | BufferEncoding;
    request?: Request | any;
  }): Promise<string>;

  downloadFile(args: {
    filePath: string;
    options: (ObjectEncodingOptions & { flag?: string }) | BufferEncoding | undefined | null;
    request?: Request | any;
  }): Promise<string | Buffer>;

  downloadFile(args: { filePath: string; request?: Request | any }): Promise<Buffer>;

  async downloadFile(args: {
    filePath: string;
    options?: Record<string, any> | BufferEncoding | null;
    request?: Request | any;
  }) {
    const { filePath, options, request } = args;
    const fileName = await this.transformFilePath(filePath, request, options);
    return promisify(readFile)(fileName, options);
  }

  async downloadStream(args: {
    filePath: string;
    options?: BufferEncoding | StreamOptions;
    request?: Request | any;
  }): Promise<Readable> {
    const { filePath, options, request } = args;
    const fileName = await this.transformFilePath(filePath, request, options);
    return createReadStream(fileName, options);
  }

  async deleteFile(args: { filePath: string; request?: Request | any }): Promise<boolean> {
    const { filePath, request } = args;
    const fileName = await this.transformFilePath(filePath, request);
    return new Promise((resolve, reject) =>
      unlink(fileName, (err) => (err && err.message === 'EENOENT' ? reject(err) : resolve(true))),
    );
  }
}
