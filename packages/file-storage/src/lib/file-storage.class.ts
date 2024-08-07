/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Readable } from 'node:stream';

import {
  FileStorageBaseArgs,
  FileStorageConfig,
  FileStorageDirBaseArgs,
  FileStorageDownloadFile,
  FileStorageDownloadStream,
  FileStorageFileExists,
  FileStorageGetFileMeta,
  FileStorageMoveFile,
  FileStorageReadDir,
  FileStorageTransformPath,
  FileStorageUploadFile,
  FileStorageUploadStream,
} from './file-storage.types';
import { FileStorageWritable } from './types';

const defaultErrorMessage = 'Funtion must be implemented';

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

  fileExists(args: FileStorageFileExists): Promise<boolean> {
    throw new Error(defaultErrorMessage);
  }

  moveFile(args: FileStorageMoveFile): Promise<void> {
    throw new Error(defaultErrorMessage);
  }

  uploadFile(args: FileStorageUploadFile): Promise<void> {
    throw new Error(defaultErrorMessage);
  }

  uploadStream(args: FileStorageUploadStream): Promise<FileStorageWritable> {
    throw new Error(defaultErrorMessage);
  }

  downloadFile(args: FileStorageDownloadFile): Promise<Buffer> {
    throw new Error(defaultErrorMessage);
  }

  downloadStream(args: FileStorageDownloadStream): Promise<Readable> {
    throw new Error(defaultErrorMessage);
  }

  deleteFile(args: FileStorageBaseArgs): Promise<boolean> {
    throw new Error(defaultErrorMessage);
  }

  getFileMeta(args: FileStorageGetFileMeta): Promise<any> {
    throw new Error(defaultErrorMessage);
  }

  // TODO:
  // createDir(args: FileStorageDirBaseArgs): Promise<void> {
  //   throw new Error(defaultErrorMessage);
  // }

  deleteDir(args: FileStorageDirBaseArgs): Promise<void> {
    throw new Error(defaultErrorMessage);
  }

  readDir<R = string[]>(args: FileStorageReadDir<R>): Promise<R> {
    throw new Error(defaultErrorMessage);
  }
}
