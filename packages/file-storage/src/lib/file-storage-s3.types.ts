import type {
  DeleteObjectCommandInput,
  DeleteObjectsCommandInput,
  GetObjectCommandInput,
  HeadObjectCommandInput,
  HeadObjectCommandOutput,
  ListObjectsCommandInput,
  ListObjectsCommandOutput,
  PutObjectCommandInput,
  S3,
} from '@aws-sdk/client-s3';

import type {
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

/**
 * Either region or endpoint must be provided
 */
export type FileStorageS3Setup = {
  bucket: string;
  maxPayloadSize: number;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  logger?: S3['config']['logger'];
  [key: string]: unknown;
} & ({ region: string; endpoint?: never } | { endpoint: string; region?: never });

export interface FileStorageS3Config {
  s3: S3;
  bucket: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface FileStorageS3FileExists extends FileStorageFileExists {
  options?: Omit<HeadObjectCommandInput, 'Bucket' | 'Key'>;
}

export interface FileStorageS3MoveFile extends FileStorageMoveFile {
  options?: Omit<DeleteObjectCommandInput, 'Bucket' | 'Key'>;
}

export interface FileStorageS3UploadFile extends FileStorageUploadFile {
  options?: Omit<PutObjectCommandInput, 'Body' | 'Bucket' | 'Key'>;
}

export interface FileStorageS3UploadStream extends FileStorageUploadStream {
  options?: Omit<PutObjectCommandInput, 'Body' | 'Bucket' | 'Key'>;
}

export interface FileStorageS3DownloadFile extends FileStorageDownloadFile {
  options?: Omit<GetObjectCommandInput, 'Bucket' | 'Key'>;
}

export interface FileStorageS3DownloadStream extends FileStorageDownloadStream {
  options?: Omit<GetObjectCommandInput, 'Bucket' | 'Key'>;
}

export interface FileStorageS3DeleteFile extends FileStorageDeleteFile {
  options?: Omit<DeleteObjectCommandInput, 'Bucket' | 'Key'>;
}

export interface FileStorageS3GetFileMeta extends FileStorageGetFileMeta {
  options?: Omit<HeadObjectCommandInput, 'Bucket' | 'Key'>;
}

export type FileStorageS3GetFileMetaOutput = HeadObjectCommandOutput;

export interface FileStorageS3DeleteDir extends FileStorageDeleteDir {
  options?: Omit<DeleteObjectsCommandInput, 'Bucket' | 'Delete'>;
}

export interface FileStorageS3ReadDir<R = string[]> extends FileStorageReadDir<R, ListObjectsCommandOutput> {
  options?: Omit<ListObjectsCommandInput, 'Bucket' | 'Delimiter'>;
}
