import { S3 } from 'aws-sdk';
import { DeleteObjectRequest, GetObjectRequest, HeadObjectRequest, PutObjectRequest } from 'aws-sdk/clients/s3';
import { Request } from 'express';
import { PassThrough, Readable, Writable } from 'stream';

import { FileStorage, FileStorageBaseArgs, FileStorageConfig, FileStorageConfigFactory } from './file-storage.class';

export type FileStorageS3Setup = {
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  secretAccessKey?: string;
  s3BucketEndpoint?: boolean;
  maxPayloadSize: number;
  [key: string]: unknown;
};

export interface FileStorageS3Config {
  s3: S3;
  bucket: string;
  [key: string]: any;
}

function config(setup: FileStorageS3Setup) {
  const { accessKeyId, bucket, endpoint, maxPayloadSize, secretAccessKey, s3BucketEndpoint } = setup;
  const s3 = new S3({
    endpoint,
    s3BucketEndpoint,
    accessKeyId,
    secretAccessKey,
  });

  const filePath = (options: { request?: Request; fileName: string }): string => {
    const { fileName } = options;
    return `public/${fileName}`;
  };
  const limits = { fileSize: maxPayloadSize * 1024 * 1024 };
  return {
    s3,
    bucket,
    filePath,
    limits,
  };
}

export interface FileStorageS3FileExists extends FileStorageBaseArgs {
  options?: HeadObjectRequest;
}

export interface FileStorageS3UploadFile extends FileStorageBaseArgs {
  content: string | Uint8Array | Buffer;
  options?: PutObjectRequest;
}

export interface FileStorageS3UploadStream extends FileStorageBaseArgs {
  options?: PutObjectRequest;
}

export interface FileStorageS3DownloadFile extends FileStorageBaseArgs {
  options?: GetObjectRequest;
}

export interface FileStorageS3DownloadStream extends FileStorageBaseArgs {
  options?: GetObjectRequest;
}

export interface FileStorageS3DeleteFile extends FileStorageBaseArgs {
  options?: DeleteObjectRequest;
}

// TODO: control filesize limit
export class FileStorageS3 implements FileStorage {
  config: FileStorageConfig & FileStorageS3Config;

  constructor(setup: FileStorageS3Setup, factory?: FileStorageConfigFactory<FileStorageS3Config>) {
    this.config = typeof factory === 'function' ? factory(setup) : config(setup);
  }

  transformFilePath(fileName: string, request?: Request, options: any = {}): string | Promise<string> {
    return typeof this.config.filePath === 'function'
      ? this.config.filePath({ fileName, request, ...options })
      : fileName;
  }

  async fileExists(args: FileStorageS3FileExists): Promise<boolean> {
    const { filePath, options = {}, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(filePath, request, options);
    await s3.headObject({ Key, Bucket, ...options }).promise();
    return true;
  }

  async uploadFile(args: FileStorageS3UploadFile): Promise<void> {
    const { filePath, content, options = {}, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(filePath, request, options);
    await s3.upload({ Bucket, Key, Body: content, ...options }).promise();
  }

  async uploadStream(args: FileStorageS3UploadStream): Promise<Writable> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, request, options);
    const { s3, bucket: Bucket } = this.config;
    const writeStream = new PassThrough();
    s3.upload({ Bucket, Key, Body: writeStream, ...options });
    return writeStream;
    // ? or return {writeStream, promise: s3.upload({ Bucket, Key, Body: writeStream }).promise()};
  }

  async downloadFile(args: FileStorageS3DownloadFile): Promise<Buffer> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, request, options);
    const { s3, bucket: Bucket } = this.config;
    const object = await s3.getObject({ Bucket, Key, ...options }).promise();
    return object.Body as Buffer;
  }

  async downloadStream(args: FileStorageS3DownloadStream): Promise<Readable> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, request, options);
    const { s3, bucket: Bucket } = this.config;
    return s3.getObject({ Bucket, Key, ...options }).createReadStream();
  }

  async deleteFile(args: FileStorageS3DeleteFile): Promise<boolean> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, request, options);
    const { s3, bucket: Bucket } = this.config;
    await s3.deleteObject({ Bucket, Key, ...options }).promise();
    return true;
  }
}
