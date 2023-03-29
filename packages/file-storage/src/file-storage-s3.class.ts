import {
  DeleteObjectCommandInput,
  DeleteObjectsCommandInput,
  GetObjectCommandInput,
  HeadObjectCommandInput,
  ListObjectsV2CommandInput,
  PutObjectCommandInput,
  S3,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
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
  bucket: string;
  maxPayloadSize: number;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  [key: string]: unknown;
};

export interface FileStorageS3Config {
  s3: S3;
  bucket: string;
  [key: string]: any;
}

function config(setup: FileStorageS3Setup) {
  const { bucket, maxPayloadSize, credentials, region } = setup;
  const s3 = new S3({
    credentials,
    region,
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
    await s3.headObject({ Key, Bucket, ...options });
    return true;
  }

  async uploadFile(args: FileStorageS3UploadFile): Promise<void> {
    const { filePath, content, options = {}, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(filePath, MethodTypes.WRITE, request, options);
    await new Upload({
      client: s3,
      params: { Bucket, Key, Body: content, ...options },
    }).done();
  }

  async uploadStream(args: FileStorageS3UploadStream): Promise<Writable> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.WRITE, request, options);
    const { s3, bucket: Bucket } = this.config;
    const writeStream = new PassThrough();
    try {
      new Upload({
        client: s3,
        params: {
          Body: writeStream,
          Key,
          Bucket,
          ...options,
        },
      }).done();
    } catch (err) {
      writeStream.destroy(err);
    }
    return writeStream;
  }

  async downloadFile(args: FileStorageS3DownloadFile): Promise<Buffer> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.READ, request, options);
    const { s3, bucket: Bucket } = this.config;
    const readable = (await s3.getObject({ Bucket, Key, ...options })).Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of readable) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
    // in Node 18 - return readable.toArray();
  }

  async downloadStream(args: FileStorageS3DownloadStream): Promise<Readable> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.READ, request, options);
    const { s3, bucket: Bucket } = this.config;
    const object = await s3.getObject({ Bucket, Key, ...options });
    // from https://github.com/aws/aws-sdk-js-v3/issues/1877#issuecomment-755446927
    return object.Body as Readable;
  }

  async deleteFile(args: FileStorageS3DeleteFile): Promise<boolean> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.DELETE, request, options);
    const { s3, bucket: Bucket } = this.config;
    await s3.deleteObject({ Bucket, Key, ...options });
    return true;
  }

  async deleteDir(args: FileStorageDirBaseArgs): Promise<void> {
    const { dirPath, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const listKey = await this.transformFilePath(dirPath, MethodTypes.DELETE, request);
    const listParams: ListObjectsV2CommandInput = {
      Bucket,
      Prefix: listKey,
    };
    // get list of objects in a dir
    const listedObjects = await s3.listObjectsV2(listParams);
    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      return;
    }

    const deleteParams: DeleteObjectsCommandInput = {
      Bucket,
      Delete: {
        Objects: listedObjects.Contents.map(({ Key }) => ({
          Key,
        })),
      },
    };
    await s3.deleteObjects(deleteParams);

    if (listedObjects.IsTruncated) {
      await this.deleteDir({ dirPath });
    }
  }

  async readDir(args: FileStorageDirBaseArgs): Promise<string[]> {
    const { dirPath, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(dirPath, MethodTypes.READ, request);
    const listParams: ListObjectsV2CommandInput = {
      Bucket,
      Delimiter: '/',
    };
    // Passing in / as Key breaks the folder matching
    if (Key !== '/' && Key !== '') {
      listParams.Prefix = addTrailingForwardSlash(Key);
    }
    const listedObjects = await s3.listObjectsV2(listParams);
    const filesAndFilders = [];
    //  add nested folders, CommonPrefixes contains <prefix>/<next nested dir>
    if (listedObjects.CommonPrefixes?.length) {
      const folders = listedObjects.CommonPrefixes.map((prefixObject) => {
        const prefix = removeTrailingForwardSlash(prefixObject.Prefix);
        const key = listParams['Prefix'];
        // If key exists, we are looking for a nested folder such as v0.1.0
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
