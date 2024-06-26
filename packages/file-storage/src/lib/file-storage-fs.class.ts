import {
  BigIntOptions,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  ObjectEncodingOptions,
  stat,
  StatOptions,
  unlink,
  WriteFileOptions,
} from 'fs';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import { finished, Readable } from 'node:stream';

import {
  FileStorage,
  FileStorageBaseArgs,
  FileStorageConfig,
  FileStorageConfigFactory,
  FileStorageDirBaseArgs,
} from './file-storage.class';
import { FileStorageWritable, MethodTypes, Request } from './types';

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

function config(setup: FileStorageLocalSetup) {
  const { maxPayloadSize, storagePath } = setup;
  const filePath = (options: { req?: Request; methodType: MethodTypes; fileName: string }): string => {
    const { fileName, methodType } = options;
    if (!existsSync(storagePath) && methodType === MethodTypes.WRITE) {
      mkdirSync(storagePath, { recursive: true });
    }
    return resolvePath(storagePath, fileName);
  };
  const limits = { fileSize: maxPayloadSize * 1024 * 1024 };
  return { filePath, limits };
}

export interface FileStorageLocalFileExists extends FileStorageBaseArgs {
  options?: StatOptions | BigIntOptions;
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

// TODO: control filesize limit
export class FileStorageLocal implements FileStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly config: FileStorageConfig & Record<string, any>;

  constructor(
    setup: FileStorageLocalSetup,
    factory?: FileStorageConfigFactory<FileStorageConfig, FileStorageLocalSetup>,
  ) {
    this.config = typeof factory === 'function' ? factory(setup) : config(setup);
  }

  transformFilePath(
    fileName: string,
    methodType: MethodTypes,
    request?: Request,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any = {},
  ): string | Promise<string> {
    return typeof this.config.filePath === 'function'
      ? this.config.filePath({ fileName, request, methodType, ...options })
      : fileName;
  }

  async fileExists(args: FileStorageLocalFileExists): Promise<boolean> {
    const { filePath, options = {}, request } = args;
    const fileName = await this.transformFilePath(filePath, MethodTypes.READ, request, options);
    return new Promise<boolean>((resolve, reject) => stat(fileName, (err) => (err ? reject(err) : resolve(true))));
  }

  async uploadFile(args: FileStorageLocalUploadFile): Promise<void> {
    const { filePath, content, options, request } = args;
    const fileName = await this.transformFilePath(filePath, MethodTypes.WRITE, request, options);
    return writeFile(fileName, content, options);
  }

  async uploadStream(args: FileStorageLocalUploadStream): Promise<FileStorageWritable> {
    const { filePath, options, request } = args;
    const fileName = await this.transformFilePath(filePath, MethodTypes.WRITE, request, options);
    const writeStream = createWriteStream(fileName, options);
    finished(writeStream, (err) => writeStream.emit('done', err));
    return writeStream;
  }

  downloadFile(args: {
    filePath: string;
    options: { encoding?: null; flag?: string };
    request?: Request;
  }): Promise<Buffer>;
  downloadFile(args: {
    filePath: string;
    options: { encoding: BufferEncoding; flag?: string } | BufferEncoding;
    request?: Request;
  }): Promise<string>;
  downloadFile(args: {
    filePath: string;
    options: (ObjectEncodingOptions & { flag?: string }) | BufferEncoding | undefined | null;
    request?: Request;
  }): Promise<string | Buffer>;
  downloadFile(args: { filePath: string; request?: Request }): Promise<Buffer>;
  async downloadFile(args: FileStorageLocalDownloadFile) {
    const { filePath, options, request } = args;
    const fileName = await this.transformFilePath(filePath, MethodTypes.READ, request, options);
    return readFile(fileName, options);
  }

  async downloadStream(args: FileStorageLocalDownloadStream): Promise<Readable> {
    const { filePath, options, request } = args;
    const fileName = await this.transformFilePath(filePath, MethodTypes.READ, request, options);
    return createReadStream(fileName, options);
  }

  async deleteFile(args: FileStorageBaseArgs): Promise<boolean> {
    const { filePath, request } = args;
    const fileName = await this.transformFilePath(filePath, MethodTypes.DELETE, request);
    return new Promise((resolve, reject) =>
      unlink(fileName, (err) => (err && err.message === 'EENOENT' ? reject(err) : resolve(true))),
    );
  }

  async deleteDir(args: FileStorageDirBaseArgs): Promise<void> {
    const { dirPath, request } = args;
    const dirName = await this.transformFilePath(dirPath, MethodTypes.DELETE, request);
    return rm(dirName, { recursive: true, force: true });
  }

  // TODO: indicate if the item is a file or a directory
  async readDir(args: FileStorageDirBaseArgs): Promise<string[]> {
    const { dirPath, request } = args;
    try {
      const transformedDirPath = await this.transformFilePath(dirPath, MethodTypes.READ, request);
      // we need return await to catch the error
      return await readdir(transformedDirPath);
    } catch (err) {
      if (err instanceof Error && 'code' in err && err['code'] === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }
}
