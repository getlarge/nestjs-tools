import { Injectable } from '@nestjs/common';
import { finished, type Readable } from 'node:stream';

import type { FileStorage, FileStorageConfig, FileStorageConfigFactory } from './file-storage.class';
import type {
  FileStorageGoogleConfig,
  FileStorageGoogleDeleteDir,
  FileStorageGoogleDeleteFile,
  FileStorageGoogleDownloadFile,
  FileStorageGoogleDownloadStream,
  FileStorageGoogleFileExists,
  FileStorageGoogleMoveFile,
  FileStorageGoogleReadDir,
  FileStorageGoogleSetup,
  FileStorageGoogleUploadFile,
  FileStorageGoogleUploadStream,
} from './file-storage-google.types';
import { loadPackage } from './helpers';
import { FileStorageWritable, MethodTypes } from './types';

function config(setup: FileStorageGoogleSetup) {
  const { bucketName, maxPayloadSize, projectId } = setup;
  const loaderFn = (): { Storage: typeof import('@google-cloud/storage').Storage } => require('@google-cloud/storage');
  const { Storage } = loadPackage('@google-cloud/storage', FileStorageGoogle.name, loaderFn);
  const storage = new Storage({
    ...(projectId ? { projectId } : {}),
  });

  const filePath = (options: { request?: Request; fileName: string }): string => {
    return options.fileName;
  };
  const limits = { fileSize: maxPayloadSize * 1024 * 1024 };
  return {
    storage,
    bucket: bucketName,
    filePath,
    limits,
  };
}

// TODO: import @google-cloud/storage dynamically
@Injectable()
export class FileStorageGoogle implements FileStorage {
  readonly config: FileStorageConfig & FileStorageGoogleConfig;

  constructor(
    setup: FileStorageGoogleSetup,
    factory?: FileStorageConfigFactory<FileStorageGoogleConfig, FileStorageGoogleSetup>,
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
      ? this.config.filePath({ fileName, methodType, request, ...options })
      : fileName;
  }

  async fileExists(args: FileStorageGoogleFileExists): Promise<boolean> {
    const { storage, bucket } = this.config;
    const { options = {}, request } = args;
    const filePath = await this.transformFilePath(args.filePath, MethodTypes.READ, request, options);
    const [exists] = await storage.bucket(bucket).file(filePath, options).exists(options);
    return exists;
  }

  async moveFile(args: FileStorageGoogleMoveFile): Promise<void> {
    const { storage, bucket } = this.config;
    const { options = {}, request } = args;
    const oldFilePath = await this.transformFilePath(args.filePath, MethodTypes.READ, request, options);
    const newFilePath = await this.transformFilePath(args.newFilePath, MethodTypes.WRITE, request, options);
    await storage.bucket(bucket).file(oldFilePath).move(newFilePath, options);
  }

  async uploadFile(args: FileStorageGoogleUploadFile & { content: Buffer | string }): Promise<void> {
    const { storage, bucket } = this.config;
    const { options = {}, request } = args;
    const filePath = await this.transformFilePath(args.filePath, MethodTypes.WRITE, request, options);
    const file = storage.bucket(bucket).file(filePath, options);
    await file.save(args.content, options);
  }

  async uploadStream(args: FileStorageGoogleUploadStream & { stream: Readable }): Promise<FileStorageWritable> {
    const { storage, bucket } = this.config;
    const { options = {}, request } = args;
    const filePath = await this.transformFilePath(args.filePath, MethodTypes.WRITE, request, options);
    const file = storage.bucket(bucket).file(filePath, options);
    const writeStream = file.createWriteStream(options);
    finished(writeStream, (err) => writeStream.emit('done', err));
    return writeStream;
  }

  async downloadFile(args: FileStorageGoogleDownloadFile): Promise<Buffer> {
    const { storage, bucket } = this.config;
    const { options = {}, request } = args;
    const filePath = await this.transformFilePath(args.filePath, MethodTypes.READ, request, options);
    const [content] = await storage.bucket(bucket).file(filePath).download(options);
    return content;
  }

  async downloadStream(args: FileStorageGoogleDownloadStream): Promise<Readable> {
    const { storage, bucket } = this.config;
    const { options = {}, request } = args;
    const filePath = await this.transformFilePath(args.filePath, MethodTypes.READ, request, options);
    const readStream = storage.bucket(bucket).file(filePath, options).createReadStream(options);
    return readStream;
  }

  async deleteFile(args: FileStorageGoogleDeleteFile): Promise<boolean> {
    try {
      const { storage, bucket } = this.config;
      const { options = {}, request } = args;
      const filePath = await this.transformFilePath(args.filePath, MethodTypes.DELETE, request, options);
      await storage.bucket(bucket).file(filePath).delete(options);
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteDir(args: FileStorageGoogleDeleteDir): Promise<void> {
    const { storage, bucket } = this.config;
    const { options = {}, request } = args;
    const prefix = await this.transformFilePath(args.dirPath, MethodTypes.DELETE, request, options);
    await storage.bucket(bucket).deleteFiles({ ...options, prefix });
  }

  // TODO: make filepaths compliant with the other readDir implementations
  async readDir(args: FileStorageGoogleReadDir): Promise<string[]> {
    const { storage, bucket } = this.config;
    const { options = {}, request } = args;
    const prefix = await this.transformFilePath(args.dirPath, MethodTypes.READ, request, options);
    const [files] = await storage
      .bucket(bucket)
      .getFiles({ includeTrailingDelimiter: false, includeFoldersAsPrefixes: false, ...options, prefix });
    return files.map((file) => (prefix ? file.name.replace(prefix, '').replace('/', '') : file.name));
  }
}
