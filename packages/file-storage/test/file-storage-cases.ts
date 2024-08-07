import * as dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { FileStorageService, StorageType } from '../src';

dotenv.config({ path: resolve(__dirname, '../.env.test') });

// @ts-expect-error Symbol is not defined
Symbol.asyncDispose ??= Symbol('Symbol.asyncDispose');

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
      CI?: string;
      PREFIX?: string;
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

export async function retry<T>(
  fn: () => Promise<T>,
  condition: (result: unknown) => boolean,
  retries: number,
  ms = 200,
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const result = await fn();
      if (condition(result)) {
        return result;
      }
    } catch (error) {
      attempt++;
      if (!condition(error) || attempt >= retries) {
        throw error;
      }
    } finally {
      await setTimeout(ms);
    }
  }
  throw new Error('Max retries exceeded');
}

export function fileExists(storage: FileStorageService, filePath: string, exists = true): Promise<boolean> {
  return retry(
    () => storage.fileExists({ filePath }),
    (result) => result === exists,
    3,
  );
}

export function readDir(storage: FileStorageService, dirPath: string, exists = true): Promise<string[]> {
  return retry(
    () => storage.readDir({ dirPath }),
    (result) => (result as string[]).length > 0 === exists,
    3,
  );
}

export const delay = async (ms = 100) => {
  if (process.env.CI) {
    await setTimeout(ms);
  }
};

export const createDummyFile = async (
  fileStorage: FileStorageService,
  options: { filePath?: string; content?: string; deleteAfter?: boolean } = {},
): Promise<
  AsyncDisposable & {
    filePath: string;
    content: string;
  }
> => {
  const { filePath = randomUUID(), content = 'dummy', deleteAfter = true } = options;
  await fileStorage.uploadFile({ filePath, content });
  await delay(200);
  return {
    [Symbol.asyncDispose]: async () => {
      if (deleteAfter) {
        await fileStorage.deleteFile({ filePath }).catch((e) => {
          console.warn(e.message);
        });
        await setTimeout(200);
      }
    },
    filePath,
    content,
  };
};
