/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
import { Test, TestingModule } from '@nestjs/testing';
import * as dotenv from 'dotenv';
import { mkdir, rm } from 'fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolve } from 'path';

import { FileStorage, FileStorageModule, FileStorageModuleOptions, StorageType } from '../src';
import { FILE_STORAGE_STRATEGY_TOKEN } from '../src/constants';

dotenv.config({ path: resolve(__dirname, '../.env.test') });

const storagePath = 'store';
const path = resolve(storagePath);
const testFileName = 'test.txt';
const iterable = ['a', 'b', 'c'];
const dirPath = '';

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
          accessKeyId: process.env.ACCESS_KEY_ID,
          bucket: process.env.BUCKET,
          endpoint: process.env.ENDPOINT,
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

    it('deleteFile deletes a file', async () => {
      await fileStorage.deleteFile({ filePath: testFileName });
      const result = await fileStorage.readDir({ dirPath });
      expect(result.length).toBe(0);
    });

    it('uploadStream uploads a file', async () => {
      const upload = await fileStorage.uploadStream({ filePath: testFileName });
      const entry = Readable.from(iterable);
      await pipeline(entry, upload).catch((err) => {
        console.error(err);
      });
      const result = await fileStorage.readDir({ dirPath });
      expect(result.length).toBe(1);
      expect(result[0]).toBe(testFileName);
    });

    it('downloadFile downloads a file', async () => {
      const file = await fileStorage.downloadFile({ filePath: testFileName });
      expect(file.toString()).toBe(iterable.join(''));
    });

    it('downloadStream downloads a file', async () => {
      const download = await fileStorage.downloadStream({ filePath: testFileName });
      expect(download).toBeInstanceOf(Readable);
      download.on('data', (chunk) => {
        expect(chunk.toString()).toBe(iterable.join(''));
      });
    });

    it('calling fileExists on a filepath that doesnt exist throws an error', async () => {
      await expect(fileStorage.fileExists({ filePath: 'fileDoesntExist' })).rejects.toThrow();
    });

    it('deleteDir deletes a dir', async () => {
      await fileStorage.deleteDir({ dirPath });
      expect(await fileStorage.readDir({ dirPath })).toEqual([]);
    });

    afterAll(async () => {
      if (storageType === StorageType.FS) await rm(path, { recursive: true, force: true });
    });
  });
});
