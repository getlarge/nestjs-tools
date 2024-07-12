# File-storage

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@getlarge/nestjs-tools-file-storage.svg?style=flat
[npm-url]: https://npmjs.org/package/@getlarge/nestjs-tools-file-storage

File storage classes for :

- Node FileSystem
- Amazon S3
- Google Cloud Storage

## Installation

```bash
$ npm install --save @getlarge/nestjs-tools-file-storage
```

## Example

```ts
// module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileStorageLocal, FileStorageModule, FileStorageS3 } from '@getlarge/nestjs-tools-file-storage';

import { AppService } from './env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FileStorageModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const environment = configService.get('NODE_ENV', { infer: true });
        if (environment === Environment.Development) {
          const setup = {
            storagePath: configService.get('STORAGE_PATH'),
            maxPayloadSize: configService.get('MAX_PAYLOAD_SIZE'),
          };
          return new FileStorageLocal(setup);
        }
        const setup = {
          maxPayloadSize: configService.get('MAX_PAYLOAD_SIZE'),
          bucket: configService.get('AWS_S3_BUCKET'),
          region: configService.get('AWS_S3_REGION'),
          credentials: {
            accessKeyId: configService.get('AWS_S3_ACCESS_KEY_ID'),
            secretAccessKey: configService.get('AWS_S3_SECRET_ACCESS_KEY'),
          },
        };
        return new FileStorageS3(setup);
      },
    }),
  ],
  providers: [AppService],
})
export class AppModule {}
```

```ts
// service.ts
import { FileStorageService } from '@getlarge/nestjs-tools-file-storage';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(FileStorageService)
    private readonly fileStorageService: FileStorageService,
  ) {}

  async getFile(): Promise<Uint8Array> {
    const filePath = this.configService.get('FILE_PATH');
    return this.fileStorage.downloadFile({
      filePath,
    });
  }

  setFile(content: string): Promise<void> {
    return this.fileStorage.uploadFile({
      filePath: this.configService.get('FILE_PATH'),
      content,
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
