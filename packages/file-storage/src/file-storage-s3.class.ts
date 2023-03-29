import { S3 } from 'aws-sdk';
import {
  DeleteObjectRequest,
  DeleteObjectsRequest,
  GetObjectRequest,
  HeadObjectRequest,
  ListObjectsV2Request,
  PutObjectRequest,
} from 'aws-sdk/clients/s3';
import { Request } from 'express';
import { PassThrough, Readable, Writable } from 'stream';

import { MethodTypes } from './constants';
import {
  FileStorage,
  FileStorageBaseArgs,
  FileStorageConfig,
  FileStorageConfigFactory,
  FileStorageDirBaseArgs,
} from './file-storage.class';

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

  transformFilePath(
    fileName: string,
    methodType: MethodTypes,
    request?: Request,
    options: any = {},
  ): string | Promise<string> {
    return typeof this.config.filePath === 'function'
      ? this.config.filePath({ fileName, methodType, request, ...options })
      : fileName;
  }

  async fileExists(args: FileStorageS3FileExists): Promise<boolean> {
    const { filePath, options = {}, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(filePath, MethodTypes.READ, request, options);
    await s3.headObject({ Key, Bucket, ...options }).promise();
    return true;
  }

  async uploadFile(args: FileStorageS3UploadFile): Promise<void> {
    const { filePath, content, options = {}, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(filePath, MethodTypes.WRITE, request, options);
    await s3.upload({ Bucket, Key, Body: content, ...options }).promise();
  }

  async uploadStream(args: FileStorageS3UploadStream): Promise<Writable> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.WRITE, request, options);
    const { s3, bucket: Bucket } = this.config;
    const writeStream = new PassThrough();
    s3.upload({
      Body: writeStream,
      Key,
      Bucket,
      ...options,
    }).send((err) => writeStream.destroy(err));
    //? or s3.upload({ Bucket, Key, Body: writeStream, ...options }, (err) => {
    //   if (err) console.error(err);
    // });
    return writeStream;
  }

  async downloadFile(args: FileStorageS3DownloadFile): Promise<Buffer> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.READ, request, options);
    const { s3, bucket: Bucket } = this.config;
    const object = await s3.getObject({ Bucket, Key, ...options }).promise();
    return object.Body as Buffer;
  }

  async downloadStream(args: FileStorageS3DownloadStream): Promise<Readable> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.READ, request, options);
    const { s3, bucket: Bucket } = this.config;
    return s3.getObject({ Bucket, Key, ...options }).createReadStream();
  }

  async deleteFile(args: FileStorageS3DeleteFile): Promise<boolean> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.DELETE, request, options);
    const { s3, bucket: Bucket } = this.config;
    await s3.deleteObject({ Bucket, Key, ...options }).promise();
    return true;
  }

  async deleteDir(args: FileStorageDirBaseArgs): Promise<void> {
    const { dirPath, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const listKey = await this.transformFilePath(dirPath, MethodTypes.DELETE, request);
    const listParams: ListObjectsV2Request = {
      Bucket,
      Prefix: listKey,
    };
    // get list of objects in a dir
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    if (listedObjects.Contents.length === 0) {
      return;
    }

    const deleteParams: DeleteObjectsRequest = {
      Bucket,
      Delete: {
        Objects: listedObjects.Contents.map(({ Key }) => ({
          Key,
        })),
      },
    };
    await s3.deleteObjects(deleteParams).promise();

    if (listedObjects.IsTruncated) {
      await this.deleteDir({ dirPath });
    }
  }

  // TODO: indicate if the item is a file or a directory
  async readDir(args: FileStorageDirBaseArgs): Promise<string[]> {
    const { dirPath, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(dirPath, MethodTypes.READ, request);
    const listParams: ListObjectsV2Request = {
      Bucket,
      Delimiter: '/',
    };
    // Passing in / as Key breaks the folder matching
    if (Key !== '/' && Key !== '') {
      listParams.Prefix = addTrailingForwardSlash(Key);
    }
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    const filesAndFilders = [];
    //  add nested folders, CommonPrefixes contains <prefix>/<next nested dir>
    if (listedObjects.CommonPrefixes?.length) {
      const folders = listedObjects.CommonPrefixes.map((prefixObject) => {
        const prefix = removeTrailingForwardSlash(prefixObject.Prefix);
        const key = listParams['Prefix'];
        // If key exists, we are looking for a nested folder such as v0.1.0\
        return key
          ? prefix.slice(key.length) // e.g. v0.1.0
          : prefix; // e.g. en10168-schemas
      });
      filesAndFilders.push(...folders);
    }
    // adds filenames
    if (listedObjects.Contents?.length) {
      const files = listedObjects.Contents.map((file) => file.Key.replace(listedObjects.Prefix, ''));
      filesAndFilders.push(...files);
    }
    return filesAndFilders;
  }
}
