import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';

import type { FileStorage } from './file-storage.class';
import {
  FileStorageDeleteDir,
  FileStorageDeleteFile,
  FileStorageDownloadFile,
  FileStorageDownloadStream,
  FileStorageFileExists,
  FileStorageGetFileMeta,
  FileStorageMoveFile,
  FileStorageReadDir,
  FileStorageUploadFile,
  FileStorageUploadStream,
} from './file-storage.types';
import type {
  FileStorageLocalDeleteDir,
  FileStorageLocalDeleteFile,
  FileStorageLocalDownloadFile,
  FileStorageLocalDownloadStream,
  FileStorageLocalFileExists,
  FileStorageLocalGetFileMeta,
  FileStorageLocalGetFileMetaOutput,
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
  FileStorageGoogleGetFileMeta,
  FileStorageGoogleGetFileMetaOutput,
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
  FileStorageS3GetFileMeta,
  FileStorageS3GetFileMetaOutput,
  FileStorageS3MoveFile,
  FileStorageS3ReadDir,
  FileStorageS3UploadFile,
  FileStorageS3UploadStream,
} from './file-storage-s3.types';
import { InjectFileStorageStrategy } from './inject-file-storage.decorator';
import type { FileStorageWritable, StorageType } from './types';

type FileExistsArgs<S extends StorageType> = S extends StorageType.S3
  ? FileStorageS3FileExists
  : S extends StorageType.GC
    ? FileStorageGoogleFileExists
    : S extends StorageType.FS
      ? FileStorageLocalFileExists
      : FileStorageFileExists;

type MoveFileArgs<S extends StorageType> = S extends StorageType.S3
  ? FileStorageS3MoveFile
  : S extends StorageType.GC
    ? FileStorageGoogleMoveFile
    : S extends StorageType.FS
      ? FileStorageLocalMoveFile
      : FileStorageMoveFile;

type UploadFileArgs<S extends StorageType> = S extends StorageType.S3
  ? FileStorageS3UploadFile
  : S extends StorageType.GC
    ? FileStorageGoogleUploadFile
    : S extends StorageType.FS
      ? FileStorageLocalUploadFile
      : FileStorageUploadFile;

type UploadStreamArgs<S extends StorageType> = S extends StorageType.S3
  ? FileStorageS3UploadStream
  : S extends StorageType.GC
    ? FileStorageGoogleUploadStream
    : S extends StorageType.FS
      ? FileStorageLocalUploadStream
      : FileStorageUploadStream;

type DownloadFileArgs<S extends StorageType> = S extends StorageType.S3
  ? FileStorageS3DownloadFile
  : S extends StorageType.GC
    ? FileStorageGoogleDownloadFile
    : S extends StorageType.FS
      ? FileStorageLocalDownloadFile
      : FileStorageDownloadFile;

type DownloadStreamArgs<S extends StorageType> = S extends StorageType.S3
  ? FileStorageS3DownloadStream
  : S extends StorageType.GC
    ? FileStorageGoogleDownloadStream
    : S extends StorageType.FS
      ? FileStorageLocalDownloadStream
      : FileStorageDownloadStream;

type DeleteFileArgs<S extends StorageType> = S extends StorageType.S3
  ? FileStorageS3DeleteFile
  : S extends StorageType.GC
    ? FileStorageGoogleDeleteFile
    : S extends StorageType.FS
      ? FileStorageLocalDeleteFile
      : FileStorageDeleteFile;

type GetFileMetaArgs<S extends StorageType> = S extends StorageType.S3
  ? FileStorageS3GetFileMeta
  : S extends StorageType.GC
    ? FileStorageGoogleGetFileMeta
    : S extends StorageType.FS
      ? FileStorageLocalGetFileMeta
      : FileStorageGetFileMeta;

type GetFileMetaResult<S extends StorageType> = S extends StorageType.S3
  ? FileStorageS3GetFileMetaOutput
  : S extends StorageType.GC
    ? FileStorageGoogleGetFileMetaOutput
    : S extends StorageType.FS
      ? FileStorageLocalGetFileMetaOutput
      : object;

type ReadDirArgs<S extends StorageType, R = string[]> = S extends StorageType.S3
  ? FileStorageS3ReadDir<R>
  : S extends StorageType.GC
    ? FileStorageGoogleReadDir<R>
    : S extends StorageType.FS
      ? FileStorageLocalReadDir<R>
      : FileStorageReadDir<R>;

type DeleteDirArgs<S extends StorageType> = S extends StorageType.S3
  ? FileStorageS3DeleteDir
  : S extends StorageType.GC
    ? FileStorageGoogleDeleteDir
    : S extends StorageType.FS
      ? FileStorageLocalDeleteDir
      : FileStorageDeleteDir;

@Injectable()
export class FileStorageService<S extends StorageType = StorageType> implements Omit<FileStorage, 'transformFilePath'> {
  constructor(@InjectFileStorageStrategy() private readonly fileStorage: FileStorage) {}

  fileExists(args: FileExistsArgs<S>): Promise<boolean> {
    return this.fileStorage.fileExists(args);
  }

  moveFile(args: MoveFileArgs<S>): Promise<void> {
    return this.fileStorage.moveFile(args);
  }

  uploadFile(args: UploadFileArgs<S>): Promise<void> {
    return this.fileStorage.uploadFile(args);
  }

  uploadStream(args: UploadStreamArgs<S>): Promise<FileStorageWritable> {
    return this.fileStorage.uploadStream(args);
  }

  downloadFile(args: DownloadFileArgs<S>): Promise<Buffer> {
    return this.fileStorage.downloadFile(args);
  }

  downloadStream(args: DownloadStreamArgs<S>): Promise<Readable> {
    return this.fileStorage.downloadStream(args);
  }

  deleteFile(args: DeleteFileArgs<S>): Promise<boolean> {
    return this.fileStorage.deleteFile(args);
  }

  getFileMeta(args: GetFileMetaArgs<S>): Promise<GetFileMetaResult<S>> {
    return this.fileStorage.getFileMeta(args);
  }

  readDir<R = string[]>(args: ReadDirArgs<S, R>): Promise<R> {
    return this.fileStorage.readDir(args);
  }

  deleteDir(args: DeleteDirArgs<S>): Promise<void> {
    return this.fileStorage.deleteDir(args);
  }
}
