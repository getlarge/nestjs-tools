import type { DeleteObjectsCommandInput, ListObjectsCommandInput, ListObjectsCommandOutput } from '@aws-sdk/client-s3';
import type { Options as UploadOptions } from '@aws-sdk/lib-storage';
import { PassThrough, Readable } from 'node:stream';

import type { FileStorage } from './file-storage.class';
import type { FileStorageConfig, FileStorageConfigFactory } from './file-storage.types';
import type {
  FileStorageS3Config,
  FileStorageS3DeleteDir,
  FileStorageS3DeleteFile,
  FileStorageS3DownloadFile,
  FileStorageS3DownloadStream,
  FileStorageS3FileExists,
  FileStorageS3GetFileMeta,
  FileStorageS3GetFileMetaOutput,
  FileStorageS3MoveFile,
  FileStorageS3ReadDir,
  FileStorageS3Setup,
  FileStorageS3UploadFile,
  FileStorageS3UploadStream,
} from './file-storage-s3.types';
import { loadPackage } from './helpers';
import { FileStorageWritable, MethodTypes, Request } from './types';

function config(setup: FileStorageS3Setup) {
  const { bucket, maxPayloadSize, credentials, endpoint, logger } = setup;
  const region = setup.region ?? FileStorageS3.extractRegionFromEndpoint(endpoint ?? '');
  if (!region) {
    throw new Error('AWS region is missing');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loaderFn = (): { S3: typeof import('@aws-sdk/client-s3').S3 } => require('@aws-sdk/client-s3');
  const { S3 } = loadPackage('@aws-sdk/client-s3', FileStorageS3.name, loaderFn);

  const s3 = new S3({
    /**
     * We cannot really make calls without credentials unless we use a workaround
     * @see https://github.com/aws/aws-sdk-js-v3/issues/2321
     */
    ...(credentials ? { credentials } : {}),
    region,
    // Add endpoint configuration for DigitalOcean Spaces and other S3-compatible services
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: false, // Use virtual-hosted-style URLs (required for DigitalOcean Spaces)
        }
      : {}),
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
    // Handle AWS S3 endpoints
    const awsMatch = endpoint?.match(/(?<=\.)[^.]+(?=\.amazonaws\.com)/);
    if (awsMatch?.length) {
      return awsMatch[0];
    }

    // Handle DigitalOcean Spaces endpoints (e.g., nyc3.digitaloceanspaces.com)
    const doMatch = endpoint?.match(/^https?:\/\/([^.]+)\.digitaloceanspaces\.com/);
    if (doMatch && doMatch?.length > 1) {
      return doMatch[1];
    }

    return null;
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
    try {
      await s3.headObject({ ...options, Key, Bucket });
      return true;
    } catch {
      return false;
    }
  }

  async moveFile(args: FileStorageS3MoveFile): Promise<void> {
    const { filePath, newFilePath, options = {}, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(filePath, MethodTypes.READ, request, options);
    const newKey = await this.transformFilePath(newFilePath, MethodTypes.WRITE, request, options);
    await s3.copyObject({ ...options, Bucket, CopySource: `${Bucket}/${Key}`, Key: newKey });
    await s3.deleteObject({ ...options, Key, Bucket });
  }

  private async upload(options: UploadOptions['params']) {
    const { s3, bucket: Bucket } = this.config;
    const { Upload } = await loadPackage(
      '@aws-sdk/lib-storage',
      FileStorageS3.name,
      () => import('@aws-sdk/lib-storage'),
    );
    return new Upload({ client: s3, params: { ...options, Bucket } }).done();
  }

  async uploadFile(args: FileStorageS3UploadFile): Promise<void> {
    const { filePath, content, options = {}, request } = args;
    const { bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(filePath, MethodTypes.WRITE, request, options);
    await this.upload({ ...options, Bucket, Key, Body: content });
  }

  async uploadStream(args: FileStorageS3UploadStream): Promise<FileStorageWritable> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.WRITE, request, options);
    const { bucket: Bucket } = this.config;
    const writeStream = new PassThrough();
    this.upload({ ...options, Bucket, Key, Body: writeStream })
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
    const readable = (await s3.getObject({ ...options, Bucket, Key })).Body as Readable;
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
    const object = await s3.getObject({ ...options, Bucket, Key });
    // from https://github.com/aws/aws-sdk-js-v3/issues/1877#issuecomment-755446927
    return object.Body as Readable;
  }

  async deleteFile(args: FileStorageS3DeleteFile): Promise<boolean> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.DELETE, request, options);
    const { s3, bucket: Bucket } = this.config;
    await s3.deleteObject({ ...options, Bucket, Key });
    return true;
  }

  async getFileMeta(args: FileStorageS3GetFileMeta): Promise<FileStorageS3GetFileMetaOutput> {
    const { filePath, options = {}, request } = args;
    const Key = await this.transformFilePath(filePath, MethodTypes.READ, request, options);
    const { s3, bucket: Bucket } = this.config;
    return s3.headObject({ ...options, Bucket, Key });
  }

  async deleteDir(args: FileStorageS3DeleteDir): Promise<void> {
    const { dirPath, options = {}, request } = args;
    const { s3, bucket: Bucket } = this.config;
    const listKey = await this.transformFilePath(dirPath, MethodTypes.DELETE, request);
    const listParams: ListObjectsCommandInput = {
      Bucket,
      Prefix: listKey,
    };
    // get list of objects in a dir, limited to 1000 items
    const listedObjects = await s3.listObjects(listParams);
    if (!listedObjects.Contents?.length) {
      return;
    }

    const deleteParams = {
      Bucket,
      Delete: {
        Objects: listedObjects.Contents.map(({ Key }) => ({
          Key,
        })),
      },
      ...options,
    } satisfies DeleteObjectsCommandInput;
    await s3.deleteObjects(deleteParams);

    if (listedObjects.IsTruncated) {
      await this.deleteDir({ dirPath });
    }
  }

  async readDir<R = string[]>(args: FileStorageS3ReadDir<R>): Promise<R> {
    const defaultSerializer = (list: ListObjectsCommandOutput) => {
      const { CommonPrefixes, Contents, Prefix } = list;
      const filesAndFilders: string[] = [];
      //  add nested folders, CommonPrefixes contains <prefix>/<next nested dir>
      if (CommonPrefixes?.length) {
        const folders = CommonPrefixes.map((prefixObject) => {
          const prefix = removeTrailingForwardSlash(prefixObject.Prefix) ?? '';
          const key = listParams['Prefix'];
          // If key exists, we are looking for a nested folder
          return (key ? prefix.slice(key.length) : prefix) as string;
        });
        filesAndFilders.push(...folders);
      }

      // adds filenames
      if (Contents?.length && Prefix) {
        const files = Contents.filter((file) => !!file.Key).map((file) => file.Key?.replace(Prefix, '') as string);
        filesAndFilders.push(...files);
      }
      return filesAndFilders;
    };

    const { dirPath, request, serializer = defaultSerializer, options = {} } = args;
    const { s3, bucket: Bucket } = this.config;
    const Key = await this.transformFilePath(dirPath, MethodTypes.READ, request);
    const listParams: ListObjectsCommandInput = {
      ...options,
      Bucket,
      Delimiter: '/',
    };
    // Passing in / as Key breaks the folder matching
    if (Key !== '/' && Key !== '') {
      listParams.Prefix = addTrailingForwardSlash(Key);
    }
    const listedObjects = await s3.listObjects(listParams);
    return serializer(listedObjects) as R;
  }
}
