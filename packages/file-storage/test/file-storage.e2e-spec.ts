/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
import { Test, TestingModule } from '@nestjs/testing';
import * as dotenv from 'dotenv';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { FileStorage, FileStorageModule, FileStorageModuleOptions, StorageType } from '../src';
import { FILE_STORAGE_STRATEGY_TOKEN } from '../src/constants';

dotenv.config({ path: resolve(__dirname, '../.env.test') });

// TODO: test S3 without loading credentials explicitly but implicitly from env variables
// process.env.AWS_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
// process.env.AWS_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;

const storagePath = 'store';
const path = resolve(storagePath);
const testFileName = 'test.txt';
const testFileContent = 'this is a test';
const dirPath = '';
const nestedDir = 'nested';
const nestedFileName = 'nested.txt';
const nestedFilePath = `${path}/${nestedDir}`;

const testMap: {
  description: string;
  storageType: StorageType;
  options: FileStorageModuleOptions;
}[] = [
  {
    description: 'file-storage-fs',
    storageType: StorageType.FS,
    options: {
      [StorageType.FS]: { setup: { storagePath, maxPayloadSize: 1 } },
    },
  },
  {
    description: 'file-storage-S3',
    storageType: StorageType.S3,
    options: {
      [StorageType.S3]: {
        setup: {
          storagePath,
          maxPayloadSize: 1,
          bucket: process.env.S3_BUCKET,
          region: process.env.S3_REGION,
          // endpoint: process.env.S3_ENDPOINT,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
        },
      },
    },
  },
];

testMap.forEach((testSuite) => {
  const { description, storageType, options } = testSuite;

  describe(description, () => {
    let fileStorage: FileStorage;

    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [FileStorageModule.forRoot(storageType, options)],
      }).compile();

      fileStorage = module.get(FILE_STORAGE_STRATEGY_TOKEN);
      if (storageType === StorageType.FS) await mkdir(path, { recursive: true });
      // ensure S3 bucket is empty
      if (storageType === StorageType.S3) await fileStorage.deleteDir({ dirPath });
    });

    afterAll(async () => {
      if (storageType === StorageType.FS) await rm(path, { recursive: true, force: true });
      if (storageType === StorageType.S3) await fileStorage.deleteDir({ dirPath });
    });

    it('readDir returns an empty array when no files exist', async () => {
      const res = await fileStorage.readDir({ dirPath });
      expect(res.length).toBe(0);
    });

    it('uploadFile uploads a file', async () => {
      await fileStorage.uploadFile({ filePath: testFileName, content: 'this is a test' });
      const result = await fileStorage.readDir({ dirPath });
      expect(result.length).toBe(1);
      expect(result[0]).toBe(testFileName);
    });

    it('calling fileExists on a filepath that exists returns true', async () => {
      const fileExists = await fileStorage.fileExists({ filePath: testFileName });
      expect(fileExists).toBe(true);
    });

    it('calling fileExists on a filepath that doesnt exist throws an error', async () => {
      await expect(fileStorage.fileExists({ filePath: 'fileDoesntExist' })).rejects.toThrow();
    });

    it('deleteFile deletes a file', async () => {
      await fileStorage.deleteFile({ filePath: testFileName });
      const result = await fileStorage.readDir({ dirPath });
      expect(result.length).toBe(0);
    });

    it('uploadStream uploads a file', async () => {
      const upload = await fileStorage.uploadStream({ filePath: testFileName });
      const entry = Readable.from(Buffer.from(testFileContent));
      await pipeline(entry, upload);
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 200);
      await once(upload, 'done', { signal: ac.signal }).finally(() => clearTimeout(t));
      const result = await fileStorage.readDir({ dirPath });
      expect(result.length).toBe(1);
    });

    it('downloadFile downloads a file', async () => {
      const file = await fileStorage.downloadFile({ filePath: testFileName });
      expect(file.toString()).toBe(testFileContent);
    });

    it('downloadStream downloads a file', async () => {
      const download = await fileStorage.downloadStream({ filePath: testFileName });
      expect(download).toBeInstanceOf(Readable);
      // this makes the assumption that the stream is readable and all the data is available in one read
      for await (const chunk of download) {
        expect(chunk.toString()).toBe(testFileContent);
      }
    });

    it('uploads a file to a nested folder', async () => {
      if (storageType === StorageType.FS) await mkdir(nestedFilePath, { recursive: true });

      await fileStorage.uploadFile({ filePath: `${nestedDir}/${nestedFileName}`, content: 'this is a nested file' });
      const result = await fileStorage.readDir({ dirPath: nestedDir });
      expect(result.length).toBe(1);
      expect(result[0]).toBe(nestedFileName);
    });

    it('readDir returns an array of files and folders in a dir', async () => {
      const result = await fileStorage.readDir({ dirPath });
      expect(result.length).toBe(2);
      expect(result).toEqual([nestedDir, testFileName]);
    });

    it('deleteDir deletes a dir', async () => {
      await fileStorage.deleteDir({ dirPath });
      expect(await fileStorage.readDir({ dirPath })).toEqual([]);
    });
  });
});
