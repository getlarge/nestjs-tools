import type {
  DeleteObjectCommandInput,
  GetObjectCommandInput,
  HeadObjectCommandInput,
  PutObjectCommandInput,
  S3,
} from '@aws-sdk/client-s3';

import type { FileStorageBaseArgs } from './file-storage.class';

/**
 * Either region or endpoint must be provided
 */
export type FileStorageS3Setup = {
  bucket: string;
  maxPayloadSize: number;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
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
  options?: HeadObjectCommandInput;
}

export interface FileStorageS3UploadFile extends FileStorageBaseArgs {
  content: string | Uint8Array | Buffer;
  options?: PutObjectCommandInput;
}

export interface FileStorageS3UploadStream extends FileStorageBaseArgs {
  options?: PutObjectCommandInput;
}

export interface FileStorageS3DownloadFile extends FileStorageBaseArgs {
  options?: GetObjectCommandInput;
}

export interface FileStorageS3DownloadStream extends FileStorageBaseArgs {
  options?: GetObjectCommandInput;
}

export interface FileStorageS3DeleteFile extends FileStorageBaseArgs {
  options?: DeleteObjectCommandInput;
}
