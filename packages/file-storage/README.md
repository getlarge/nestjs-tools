# File-storage

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@s1seven/nestjs-tools-file-storage.svg?style=flat
[npm-url]: https://npmjs.org/package/@s1seven/nestjs-tools-file-storage

File storage classes for :

- Node FileSystem
- Amazon S3

## Installation

```bash
$ npm install --save @s1seven/nestjs-tools-file-storage
```

## Example

```ts
import { AppConfigService } from '@app/env';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SymmetricCipher } from '@bigchaindb/wallet-plugins';
import {
  FileStorage,
  FileStorageConfig,
  FileStorageLocal,
  FileStorageLocalSetup,
  FileStorageS3,
  FileStorageS3Config,
  FileStorageS3Setup,
} from '@s1seven/nestjs-tools-file-storage';
import { S3 } from 'aws-sdk';
import { Request } from 'express';
import { isBase64 } from 'class-validator';
import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { decodeBase64 } from 'tweetnacl-util';

function fileStorageConfigFactory(setup: FileStorageLocalSetup & { secretKeyPath: string }): FileStorageConfig {
  const { maxPayloadSize, storagePath, secretKeyPath } = setup;
  const filePath = (options: { req?: Request; fileName: string }): string => {
    const { fileName } = options;
    if (!existsSync(storagePath)) {
      mkdirSync(storagePath, { recursive: true });
    }
    const path = resolve(join(storagePath, fileName));
    if (!existsSync(path) && fileName === secretKeyPath) {
      writeFileSync(path, '');
    }
    return path;
  };
  const limits = { fileSize: maxPayloadSize * 1024 * 1024 };
  return { filePath, limits };
}

function s3StorageConfigFactory(
  setup: FileStoragS3Setup & { secretKeyPath: string },
): FileStorageConfig & FileStorageS3Config {
  const { accessKeyId, bucket, endpoint, maxPayloadSize, secretAccessKey, s3BucketEndpoint, secretKeyPath } = setup;
  const s3 = new S3({
    endpoint,
    s3BucketEndpoint,
    accessKeyId,
    secretAccessKey,
  });
  const filePath = async (options: { request?: Request; fileName: string }): Promise<string> => {
    const { fileName } = options;
    const fileExists = await s3
      .headObject({ Key: fileName, Bucket: bucket })
      .promise()
      .then(() => true)
      .catch(() => false);
    if (!fileExists && fileName === secretKeyPath) {
      await s3.upload({ Key: fileName, Bucket: bucket, Body: '' }).promise();
    }
    return `${fileName}`;
  };

  const limits = { fileSize: maxPayloadSize * 1024 * 1024 };
  return {
    s3,
    bucket,
    filePath,
    limits,
  };
}

@Injectable()
export class StorageService {
  readonly logger = new Logger(StorageService.name);
  readonly fileStorage: FileStorage;

  constructor(@Inject(ConfigService) private readonly configService: AppConfigService) {
    const environment = this.configService.get<Environment>('NODE_ENV');
    if (!environment || environment === 'development' || environment === 'test') {
      const setup: FileStorageLocalSetup = {
        secretKeyPath: configService.get<string>('SECRET_KEY_PATH'),
        storagePath: configService.get<string>('STORAGE_PATH'),
        maxPayloadSize: configService.get<number>('MAX_PAYLOAD_SIZE'),
      };
      this.fileStorage = new FileStorageLocal(setup, fileStorageConfigFactory);
    } else {
      const setup: FileStoragS3Setup = {
        secretKeyPath: configService.get<string>('SECRET_KEY_PATH'),
        maxPayloadSize: configService.get<number>('MAX_PAYLOAD_SIZE'),
        s3BucketEndpoint: configService.get<boolean>('S3_BUCKET_ENDPOINT'),
        endpoint: configService.get<string>('S3_URL'),
        bucket: configService.get<string>('S3_BUCKET'),
        secretAccessKey: configService.get<boolean>('S3_SECRET_ACCESS_KEY'),
        accessKeyId: configService.get<boolean>('S3_ACCESS_KEY_ID'),
      };
      this.fileStorage = new FileStorageS3(setup, s3StorageConfigFactory);
    }
  }

  async getSecret(): Promise<Uint8Array> {
    const secretKey = this.configService.get('SECRET_KEY');
    const secretKeyPath = this.configService.get('SECRET_KEY_PATH');
    const secretBase64 = secretKey
      ? secretKey
      : await this.fileStorage.downloadFile({
          filePath: secretKeyPath,
        });
    if (secretBase64?.length) {
      return decodeBase64(secretBase64.toString());
    }
    return Promise.reject(new Error('Secret file not found'));
  }

  setSecret(secret: string): Promise<void> {
    if (!isBase64(secret)) {
      return Promise.reject(new Error('Secret should be a base64 encoded string'));
    }
    return this.fileStorage.uploadFile({
      filePath: this.configService.get('SECRET_KEY_PATH'),
      content: secret,
    });
  }
}
```
