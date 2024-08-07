import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';

import type { FileStorage, FileStorageBaseArgs, FileStorageDirBaseArgs } from './file-storage.class';
import type {
  FileStorageLocalDownloadFile,
  FileStorageLocalDownloadStream,
  FileStorageLocalFileExists,
  FileStorageLocalMoveFile,
  FileStorageLocalReadDir,
  FileStorageLocalUploadFile,
  FileStorageLocalUploadStream,
} from './file-storage-fs.types';
import type {
  FileStorageGoogleDeleteDir,
  FileStorageGoogleDeleteFile,
  FileStorageGoogleDownloadFile,
  FileStorageGoogleDownloadStream,
  FileStorageGoogleFileExists,
  FileStorageGoogleMoveFile,
  FileStorageGoogleReadDir,
  FileStorageGoogleUploadFile,
  FileStorageGoogleUploadStream,
} from './file-storage-google.types';
import type {
  FileStorageS3DeleteDir,
  FileStorageS3DeleteFile,
  FileStorageS3DownloadFile,
  FileStorageS3DownloadStream,
  FileStorageS3FileExists,
  FileStorageS3MoveFile,
  FileStorageS3ReadDir,
  FileStorageS3UploadFile,
  FileStorageS3UploadStream,
} from './file-storage-s3.types';
import { InjectFileStorageStrategy } from './inject-file-storage.decorator';
import type { FileStorageWritable } from './types';

@Injectable()
export class FileStorageService implements Omit<FileStorage, 'transformFilePath'> {
  constructor(@InjectFileStorageStrategy() private readonly fileStorage: FileStorage) {}

  fileExists(
    args: FileStorageLocalFileExists | FileStorageS3FileExists | FileStorageGoogleFileExists,
  ): Promise<boolean> {
    return this.fileStorage.fileExists(args);
  }

  moveFile(args: FileStorageLocalMoveFile | FileStorageS3MoveFile | FileStorageGoogleMoveFile): Promise<void> {
    return this.fileStorage.moveFile(args);
  }

  uploadFile(args: FileStorageLocalUploadFile | FileStorageS3UploadFile | FileStorageGoogleUploadFile): Promise<void> {
    return this.fileStorage.uploadFile(args);
  }

  uploadStream(
    args: FileStorageLocalUploadStream | FileStorageS3UploadStream | FileStorageGoogleUploadStream,
  ): Promise<FileStorageWritable> {
    return this.fileStorage.uploadStream(args);
  }

  downloadFile(
    args: FileStorageLocalDownloadFile | FileStorageS3DownloadFile | FileStorageGoogleDownloadFile,
  ): Promise<Buffer> {
    return this.fileStorage.downloadFile(args);
  }

  downloadStream(
    args: FileStorageLocalDownloadStream | FileStorageS3DownloadStream | FileStorageGoogleDownloadStream,
  ): Promise<Readable> {
    return this.fileStorage.downloadStream(args);
  }

  deleteFile(args: FileStorageBaseArgs | FileStorageS3DeleteFile | FileStorageGoogleDeleteFile): Promise<boolean> {
    return this.fileStorage.deleteFile(args);
  }

  readDir<R = string[]>(
    args: FileStorageLocalReadDir<R> | FileStorageS3ReadDir<R> | FileStorageGoogleReadDir<R>,
  ): Promise<R> {
    return this.fileStorage.readDir(args);
  }

  deleteDir(args: FileStorageDirBaseArgs | FileStorageS3DeleteDir | FileStorageGoogleDeleteDir): Promise<void> {
    return this.fileStorage.deleteDir(args);
  }
}
