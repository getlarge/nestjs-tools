/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
import { Test, TestingModule } from '@nestjs/testing';
import { randomBytes, randomUUID } from 'node:crypto';
import { once, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { FileStorage, FileStorageModule } from '../src';
import { FILE_STORAGE_STRATEGY_TOKEN } from '../src/lib/constants';
import { createDummyFile, delay, fileExists, readDir, testMap } from './file-storage-cases';

const { description, storageType, options } = testMap[1];

describe(description, () => {
  let fileStorage: FileStorage;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FileStorageModule.forRoot(storageType, options)],
    }).compile();

    fileStorage = module.get(FILE_STORAGE_STRATEGY_TOKEN);
    await fileStorage.deleteDir({ dirPath: '' });
  });

  afterAll(async () => {
    await fileStorage.deleteDir({ dirPath: '' });
  });

  it('calling fileExists on a filepath that exists returns true', async () => {
    await using file = await createDummyFile(fileStorage);
    //
    const fileExists = await fileStorage.fileExists({ filePath: file.filePath });
    expect(fileExists).toBe(true);
  });

  it("calling fileExists on a filepath that doesn't exist return false", async () => {
    const fileExists = await fileStorage.fileExists({ filePath: 'fileDoesntExist' });
    //
    expect(fileExists).toBe(false);
  });

  it('readDir returns an empty array when no files exist', async () => {
    const res = await fileStorage.readDir({ dirPath: '' });
    expect(res.length).toBe(0);
  });

  it('uploadFile uploads a file', async () => {
    await using file = await createDummyFile(fileStorage);
    //
    const exist = await fileExists(fileStorage, file.filePath, true);
    expect(exist).toBe(true);
  });

  it('moveFile moves a file to a new location and remove the previous one', async () => {
    const oldFileName = 'oldFileName.txt';
    const newFileName = 'newFileName.txt';
    await createDummyFile(fileStorage, { filePath: oldFileName, deleteAfter: false });
    //
    try {
      await fileStorage.moveFile({ filePath: oldFileName, newFilePath: newFileName });
      //
      const oldFileExists = await fileExists(fileStorage, oldFileName, false);
      expect(oldFileExists).toBe(false);
      const newFileExists = await fileExists(fileStorage, newFileName, true);
      expect(newFileExists).toBe(true);
    } finally {
      await fileStorage.deleteFile({ filePath: newFileName });
    }
  }, 7000);

  it('deleteFile deletes a file', async () => {
    await using file = await createDummyFile(fileStorage);
    //
    await fileStorage.deleteFile({ filePath: file.filePath });
    //
    const oldFileExists = await fileExists(fileStorage, file.filePath, false);
    expect(oldFileExists).toBe(false);
  });

  it('uploadStream uploads a file', async () => {
    const filePath = randomUUID();
    const content = randomBytes(1024);
    //
    try {
      const upload = await fileStorage.uploadStream({ filePath });
      const entry = Readable.from(content);
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 2500);
      const listener = once(upload, 'done', { signal: ac.signal }).finally(() => clearTimeout(t));
      await pipeline(entry, upload);
      await listener;
      //
      const exist = await fileExists(fileStorage, filePath, true);
      expect(exist).toBe(true);
    } finally {
      await fileStorage.deleteFile({ filePath });
    }
  });

  it('downloadFile downloads a file', async () => {
    await using file = await createDummyFile(fileStorage);
    //
    const buffer = await fileStorage.downloadFile({ filePath: file.filePath });
    //
    expect(buffer.toString()).toEqual(file.content);
  });

  it('downloadStream downloads a file', async () => {
    await using file = await createDummyFile(fileStorage);
    //
    const stream = await fileStorage.downloadStream({ filePath: file.filePath });
    //
    expect(stream).toBeInstanceOf(Readable);
    // this makes the assumption that when the stream is readable, all the data is available in one read
    await once(stream, 'readable');
    const chunk = stream.read();
    expect(chunk.toString()).toBe(file.content);
  });

  it('uploads a file to a nested directory', async () => {
    const nestedDir = 'nested';
    const nestedFileName = 'nested.txt';
    const filePath = `${nestedDir}/${nestedFileName}`;
    //
    try {
      await fileStorage.uploadFile({ filePath, content: 'this is a nested file' });
      //
      const result = await readDir(fileStorage, nestedDir, true);
      expect(result.find((fileName) => fileName === nestedFileName)).not.toBeUndefined();
    } finally {
      await fileStorage.deleteFile({ filePath });
    }
  });

  it('readDir returns an array of files and folders in a directory', async () => {
    const dirPath = '';
    const filePath = randomUUID();
    const nestedFilePath = `nest/${randomUUID()}`;
    const content = randomBytes(1024);
    await fileStorage.uploadFile({ filePath, content });
    await fileStorage.uploadFile({ filePath: nestedFilePath, content });
    await delay(1000);
    //
    const result = await fileStorage.readDir({ dirPath });
    //
    expect(result.length).toBeGreaterThanOrEqual(2);
    const parts = nestedFilePath.split('/');
    const expected = [parts.shift(), filePath];
    expect(result.every((item) => expected.includes(item))).toBe(true);
  }, 7000);

  it('deleteDir deletes a directory', async () => {
    const dirPath = '';
    //
    await fileStorage.deleteDir({ dirPath });
    //
    const result = await readDir(fileStorage, dirPath, false);
    expect(result).toEqual([]);
  }, 7000);
});
