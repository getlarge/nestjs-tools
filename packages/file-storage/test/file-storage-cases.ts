import * as dotenv from 'dotenv';
import { resolve } from 'node:path';

import { StorageType } from '../src';

dotenv.config({ path: resolve(__dirname, '../.env.test') });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      S3_BUCKET: string;
      S3_REGION: string;
      AWS_ACCESS_KEY_ID?: string;
      AWS_SECRET_ACCESS_KEY?: string;
      AWS_SECRET_SESSION_TOKEN?: string;
      AWS_PROFILE?: string;
      GC_BUCKET: string;
      GC_PROJECT_ID?: string;
    }
  }
}

export const fsStoragePath = resolve('store');

export const testMap = [
  {
    description: 'file-storage-fs',
    storageType: StorageType.FS,
    options: {
      [StorageType.FS]: { setup: { storagePath: fsStoragePath, maxPayloadSize: 1 } },
    },
  },
  {
    description: 'file-storage-S3',
    storageType: StorageType.S3,
    options: {
      [StorageType.S3]: {
        setup: {
          maxPayloadSize: 1,
          bucket: process.env.S3_BUCKET,
          region: process.env.S3_REGION,
          ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                credentials: {
                  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                  sessionToken: process.env.AWS_SECRET_SESSION_TOKEN,
                },
              }
            : {}),
        },
      },
    },
  },
  {
    description: 'file-storage-GC',
    storageType: StorageType.GC,
    options: {
      [StorageType.GC]: {
        setup: {
          maxPayloadSize: 1,
          projectId: process.env.GC_PROJECT_ID,
          bucketName: process.env.GC_BUCKET,
        },
      },
    },
  },
] as const;
