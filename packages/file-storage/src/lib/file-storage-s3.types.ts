import type {
  DeleteObjectCommandInput,
  DeleteObjectsCommandInput,
  GetObjectCommandInput,
  HeadObjectCommandInput,
  ListObjectsCommandInput,
  PutObjectCommandInput,
  S3,
} from '@aws-sdk/client-s3';

import type { FileStorageBaseArgs, FileStorageDirBaseArgs, FileStorageReadDirBaseArgs } from './file-storage.class';

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

export interface FileStorageS3FileExists extends FileStorageBaseArgs {
  options?: Omit<HeadObjectCommandInput, 'Bucket' | 'Key'>;
}

export interface FileStorageS3MoveFile extends FileStorageBaseArgs {
  newFilePath: string;
  options?: Omit<DeleteObjectCommandInput, 'Bucket' | 'Key'>;
}

export interface FileStorageS3UploadFile extends FileStorageBaseArgs {
  content: string | Uint8Array | Buffer;
  options?: Omit<PutObjectCommandInput, 'Body' | 'Bucket' | 'Key'>;
}

export interface FileStorageS3UploadStream extends FileStorageBaseArgs {
  options?: Omit<PutObjectCommandInput, 'Body' | 'Bucket' | 'Key'>;
}

export interface FileStorageS3DownloadFile extends FileStorageBaseArgs {
  options?: Omit<GetObjectCommandInput, 'Bucket' | 'Key'>;
}

export interface FileStorageS3DownloadStream extends FileStorageBaseArgs {
  options?: Omit<GetObjectCommandInput, 'Bucket' | 'Key'>;
}

export interface FileStorageS3DeleteFile extends FileStorageBaseArgs {
  options?: Omit<DeleteObjectCommandInput, 'Bucket' | 'Key'>;
}

export interface FileStorageS3DeleteDir extends FileStorageDirBaseArgs {
  options?: Omit<DeleteObjectsCommandInput, 'Bucket' | 'Delete'>;
}

export interface FileStorageS3ReadDir<R = string> extends FileStorageReadDirBaseArgs<R> {
  options?: Omit<ListObjectsCommandInput, 'Bucket' | 'Delimiter'>;
}
