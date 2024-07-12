# File-storage

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@getlarge/nestjs-tools-file-storage.svg?style=flat
[npm-url]: https://npmjs.org/package/@getlarge/nestjs-tools-file-storage

File storage classes for :

- Node FileSystem
- Amazon S3

NOTE: release `@getlarge/nestjs-tools-file-storage@0.6.2` has some breaking changes as we now use AWS SDK v3:

- `accessKeyId` and `secretAccessKey` should be passed to `FileStorageS3Setup` as properties of a `credentials` object.
- The `s3BucketEndpoint` property has been removed.
- In AWS SDK v3, the `endpoint` property has been replaced by `region`. For compatibility, we currently extract the region from an `endpoint` url if it is present and the `region` property is not, but you should update to `region` as this may change in future updates.

## Installation

```bash
$ npm install --save @getlarge/nestjs-tools-file-storage
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
} from '@getlarge/nestjs-tools-file-storage';
import { S3 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
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
  const { bucket, maxPayloadSize, credentials, region } = setup;
  const s3 = new S3({
    credentials,
    region,
  });
  const filePath = async (options: { request?: Request; fileName: string }): Promise<string> => {
    const { fileName } = options;
    const fileExists = await s3
      .headObject({ Key: fileName, Bucket: bucket })
      .promise()
      .then(() => true)
      .catch(() => false);
    if (!fileExists && fileName === secretKeyPath) {
      await new Upload({
        client: s3,
        params: { Bucket: bucket, Key: fileName, Body: '' },
      }).done();
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
      const setup: FileStorageS3Setup = {
        secretKeyPath: configService.get<string>('SECRET_KEY_PATH'),
        maxPayloadSize: configService.get<number>('MAX_PAYLOAD_SIZE'),
        region: configService.get<string>('S3_REGION'),
        bucket: configService.get<string>('S3_BUCKET'),
        credentials: {
          secretAccessKey: configService.get<string>('S3_SECRET_ACCESS_KEY'),
          accessKeyId: configService.get<string>('S3_ACCESS_KEY_ID'),
        },
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

## Testing

To run the tests, you need to have a `.env.test` file in the root of the project following the structure of the `.env.test.sample` file.
You should also authenticate to external services.

### AWS

I highly recommend configuring the [AWS Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/quick-start-default-idc.html) to manage your AWS credentials for development. You can use the `aws` CLI to authenticate, find more information [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html/).

Once done authenticated with the CLI, set the `AWS_PROFILE` environment variable to the profile you want to use.

### Google Cloud

The recommended approach is to setup (Application Default Credentials)[https://cloud.google.com/docs/authentication/provide-credentials-adc#local-dev].
You can use the `gcloud` CLI to authenticate, more information [here](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login).

## Troubleshooting

If, after upgrading, you get the following error:

```
/usr/local/bin/node[57897]: ../src/node_http_parser.cc:517:static void node::(anonymous namespace)::Parser::Execute(const FunctionCallbackInfo<v8::Value> &): Assertion `parser->current_buffer_.IsEmpty()' failed.
```

You need to update to node v18.6 or higher. This is due to an issue with the node `http` module.
More information can be found [here](https://github.com/nodejs/node/issues/39671) and [here](https://github.com/aws/aws-sdk-js-v3/issues/2843).
