import { createReadStream, createWriteStream, ObjectEncodingOptions, stat, unlink } from 'node:fs';
import { access, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { normalize, resolve as resolvePath, sep } from 'node:path';
import { finished, Readable } from 'node:stream';

import type {
  FileStorage,
  FileStorageBaseArgs,
  FileStorageConfig,
  FileStorageConfigFactory,
  FileStorageDirBaseArgs,
} from './file-storage.class';
import type {
  FileStorageLocalDownloadFile,
  FileStorageLocalDownloadStream,
  FileStorageLocalFileExists,
  FileStorageLocalSetup,
  FileStorageLocalUploadFile,
  FileStorageLocalUploadStream,
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
    if (!fullPath.startsWith(storagePath + sep)) {
      throw new Error('Invalid file path');
    }

    if (methodType === MethodTypes.WRITE) {
      const storageExists = await access(storagePath).catch(() => false);
      !storageExists && (await mkdir(storagePath, { recursive: true }));
    }
    return Promise.resolve(resolvePath(storagePath, fileName));
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
