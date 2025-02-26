import {
  BigIntStats,
  createReadStream,
  createWriteStream,
  Dirent,
  ObjectEncodingOptions,
  stat,
  Stats,
  unlink,
} from 'node:fs';
import { access, mkdir, readdir, readFile, rename, rm, stat as statPromise, writeFile } from 'node:fs/promises';
import { dirname, normalize, resolve as resolvePath, sep } from 'node:path';
import { finished, Readable } from 'node:stream';

import type { FileStorage } from './file-storage.class';
import type { FileStorageBaseArgs, FileStorageConfig, FileStorageConfigFactory } from './file-storage.types';
import type {
  FileStorageLocalDeleteDir,
  FileStorageLocalDownloadFile,
  FileStorageLocalDownloadStream,
  FileStorageLocalFileExists,
  FileStorageLocalGetFileMeta,
  FileStorageLocalReadDir,
  FileStorageLocalSetup,
  FileStorageLocalUploadFile,
  FileStorageLocalUploadStream,
  ReadDirOutput,
} from './file-storage-fs.types';
import { FileStorageWritable, MethodTypes, Request } from './types';

function config(setup: FileStorageLocalSetup) {
  const { maxPayloadSize, storagePath } = setup;
  const filePath = async (options: { req?: Request; methodType: MethodTypes; fileName: string }): Promise<string> => {
    const { fileName, methodType } = options;
    // Normalize and resolve the path to prevent path traversal
    const safeFileName = normalize(fileName).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = resolvePath(storagePath, safeFileName);
    // Ensure the resolved path starts with the intended storagePath to prevent path traversal
    if (!fullPath.startsWith(resolvePath(storagePath + sep))) {
      throw new Error('Invalid file path');
    }

    if (methodType === MethodTypes.WRITE) {
      const storageDir = dirname(fullPath);
      const storageExists = await access(storageDir)
        .then(() => true)
        .catch(() => false);
      if (!storageExists) {
        await mkdir(storageDir, { recursive: true });
      }
    }
    return Promise.resolve(fullPath);
  };
  const limits = { fileSize: maxPayloadSize * 1024 * 1024 };
  return { filePath, limits };
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
    return new Promise<boolean>((resolve) => stat(fileName, (err) => (err ? resolve(false) : resolve(true))));
  }

  async moveFile(args: FileStorageBaseArgs & { newFilePath: string }): Promise<void> {
    const { filePath, newFilePath, request } = args;
    const oldFileName = await this.transformFilePath(filePath, MethodTypes.READ, request);
    const newFileName = await this.transformFilePath(newFilePath, MethodTypes.WRITE, request);
    await rename(oldFileName, newFileName);
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

  async getFileMeta(
    args: FileStorageLocalGetFileMeta & {
      options: { bigint: false | undefined };
    },
  ): Promise<Stats>;
  async getFileMeta(
    args: FileStorageLocalGetFileMeta & {
      options: { bigint: true };
    },
  ): Promise<BigIntStats>;
  async getFileMeta(args: FileStorageLocalGetFileMeta): Promise<Stats | BigIntStats> {
    const { filePath, options, request } = args;
    const fileName = await this.transformFilePath(filePath, MethodTypes.READ, request);
    return statPromise(fileName, options);
  }

  async deleteDir(args: FileStorageLocalDeleteDir): Promise<void> {
    const { options = { recursive: true, force: true }, dirPath, request } = args;
    const dirName = await this.transformFilePath(dirPath, MethodTypes.DELETE, request);
    return rm(dirName, options);
  }

  async readDir<R = string[]>(args: FileStorageLocalReadDir<R>): Promise<R> {
    const defaultSerializer = (v: ReadDirOutput) =>
      v.map((val) => {
        if (val instanceof Buffer) {
          return val.toString();
        } else if (val instanceof Dirent) {
          return val.name;
        }
        return val;
      });
    const { dirPath, request, serializer = defaultSerializer, options = {} } = args;
    try {
      const transformedDirPath = await this.transformFilePath(dirPath, MethodTypes.READ, request);
      const result = await readdir(transformedDirPath, options);
      return serializer(result) as R;
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err['code'] === 'ENOENT') {
        // ? return undefined or null?
        return [] as R;
      }
      throw err;
    }
  }
}
