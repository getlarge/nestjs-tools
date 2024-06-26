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
import { PassThrough, Readable } from 'node:stream';

import {
  FileStorage,
  FileStorageBaseArgs,
  FileStorageConfig,
  FileStorageConfigFactory,
  FileStorageDirBaseArgs,
} from './file-storage.class';
import { FileStorageWritable, MethodTypes, Request } from './types';

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

function config(setup: FileStorageS3Setup) {
  const { bucket, maxPayloadSize, credentials, endpoint, logger } = setup;
  const region = setup.region ?? FileStorageS3.extractRegionFromEndpoint(endpoint ?? '');
  if (!region) {
    throw new Error('AWS region is missing');
  }
  const s3 = new S3({
    /**
     * We cannot really make calls without credentials unless we use a workaround
     * @see https://github.com/aws/aws-sdk-js-v3/issues/2321
     */
    ...(credentials ? { credentials } : {}),
    region,
    ...(logger ? { logger } : {}),
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

function removeTrailingForwardSlash(x?: string) {
  return x?.endsWith('/') ? x?.slice(0, -1) : x;
}

function addTrailingForwardSlash(x: string) {
  return x.endsWith('/') ? x : `${x}/`;
}

// TODO: control filesize limit
export class FileStorageS3 implements FileStorage {
  readonly config: FileStorageConfig & FileStorageS3Config;

  constructor(setup: FileStorageS3Setup, factory?: FileStorageConfigFactory<FileStorageS3Config, FileStorageS3Setup>) {
    this.config = typeof factory === 'function' ? factory(setup) : config(setup);
  }

  static extractRegionFromEndpoint(endpoint: string): string | null {
    const match = endpoint?.match(/(?<=\.)[^.]+(?=\.amazonaws\.com)/);
    return match?.length ? match[0] : null;
  }

  transformFilePath(
    fileName: string,
    methodType: MethodTypes,
    request?: Request,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  async uploadStream(args: FileStorageS3UploadStream): Promise<FileStorageWritable> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.WRITE, request, options);
    const { s3, bucket: Bucket } = this.config;
    const writeStream = new PassThrough();
    new Upload({
      client: s3,
      params: {
        Body: writeStream,
        Key,
        Bucket,
        ...options,
      },
    })
      .done()
      .then(() => {
        writeStream.emit('done');
      })
      .catch((err) => {
        writeStream.emit('done', err);
      });
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
    if (!listedObjects.Contents?.length) {
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

  // TODO: indicate if the item is a file or a directory
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
        const prefix = removeTrailingForwardSlash(prefixObject.Prefix) ?? '';
        const key = listParams['Prefix'];
        // If key exists, we are looking for a nested folder
        return key ? prefix.slice(key.length) : prefix;
      });
      filesAndFilders.push(...folders);
    }
    // adds filenames
    if (listedObjects.Contents?.length && listedObjects.Prefix) {
      const files = listedObjects.Contents.filter((file) => !!file.Key).map((file) =>
        file.Key?.replace(listedObjects.Prefix as string, ''),
      ) as string[];
      filesAndFilders.push(...files);
    }
    return filesAndFilders;
  }
}
