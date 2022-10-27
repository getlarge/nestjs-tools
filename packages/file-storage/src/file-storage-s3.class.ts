import { S3 } from 'aws-sdk';
import { DeleteObjectRequest, GetObjectRequest, HeadObjectRequest, PutObjectRequest } from 'aws-sdk/clients/s3';
import { Request } from 'express';
import { PassThrough, Readable, Writable } from 'stream';

import { FileStorage, FileStorageConfig, FileStorageConfigFactory } from './file-storage.class';

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

function removeTrailingForwardSlash(string: string) {
  return string.endsWith('/') ? string.slice(0, -1) : string;
}

function addTrailingForwardSlash(string: string) {
  return string.endsWith('/') ? string : `${string}/`;
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

  async fileExists(args: { filePath: string; options?: HeadObjectRequest; request?: Request | any }): Promise<boolean> {
    const { filePath, options = {}, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(filePath, request, options);
    await s3.headObject({ Key, Bucket, ...options }).promise();
    return true;
  }

  async uploadFile(args: {
    filePath: string;
    content: string | Uint8Array | Buffer;
    options?: PutObjectRequest;
    request?: Request | any;
  }): Promise<void> {
    const { filePath, content, options = {}, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(filePath, request, options);
    await s3.upload({ Bucket, Key, Body: content, ...options }).promise();
  }

  async uploadStream(args: {
    filePath: string;
    options?: PutObjectRequest;
    request?: Request | any;
  }): Promise<Writable> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, request, options);
    const { s3, bucket: Bucket } = this.config;
    const writeStream = new PassThrough();
    s3.upload({ Bucket, Key, Body: writeStream, ...options });
    return writeStream;
    // ? or return {writeStream, promise: s3.upload({ Bucket, Key, Body: writeStream }).promise()};
  }

  async downloadFile(args: { filePath: string; options?: GetObjectRequest; request?: Request | any }): Promise<Buffer> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, request, options);
    const { s3, bucket: Bucket } = this.config;
    const object = await s3.getObject({ Bucket, Key, ...options }).promise();
    return object.Body as Buffer;
  }

  async downloadStream(args: {
    filePath: string;
    options?: GetObjectRequest;
    request?: Request | any;
  }): Promise<Readable> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, request, options);
    const { s3, bucket: Bucket } = this.config;
    return s3.getObject({ Bucket, Key, ...options }).createReadStream();
  }

  async deleteFile(args: {
    filePath: string;
    options?: DeleteObjectRequest;
    request?: Request | any;
  }): Promise<boolean> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, request, options);
    const { s3, bucket: Bucket } = this.config;
    await s3.deleteObject({ Bucket, Key, ...options }).promise();
    return true;
  }

  async deleteDir(args: { dirPath: string; request?: Request }): Promise<void> {
    const { dirPath, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const listKey = await this.transformFilePath(dirPath, request);
    const listParams = {
      Bucket,
      Prefix: listKey,
    };
    // get list of objects in a dir
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    if (listedObjects.Contents.length === 0) return;

    const deleteParams = {
      Bucket,
      Delete: { Objects: [] },
    };
    listedObjects.Contents.forEach(({ Key }) => {
      deleteParams.Delete.Objects.push({ Key });
    });
    await s3.deleteObjects(deleteParams).promise();

    if (listedObjects.IsTruncated) await this.deleteDir({ dirPath });
  }

  async readDir(args: { dirPath: string }) {
    const { dirPath } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(dirPath.toLowerCase());
    const listParams = {
      Bucket,
      Delimiter: '/',
    };
    // Passing in / as Key breaks the folder matching
    if (Key !== '/' && Key !== '') {
      listParams['Prefix'] = addTrailingForwardSlash(Key);
    }
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    const dirContents: string[] = [];

    listedObjects.CommonPrefixes?.forEach((prefixObject) => {
      const prefix = removeTrailingForwardSlash(prefixObject.Prefix);
      const key = listParams['Prefix'];
      // If key exists, we are looking for a nested folder such as v0.1.0
      if (key) {
        const nestedFolderName = prefix.slice(key.length); // e.g. v0.1.0
        dirContents.push(nestedFolderName);
      } else {
        dirContents.push(prefix); // e.g. en10168-schemas
      }
    });

    return dirContents;
  }
}
