/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
import { Test, TestingModule } from '@nestjs/testing';
import { randomBytes, randomUUID } from 'node:crypto';
import { once, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';

import { FileStorage, FileStorageModule } from '../src';
import { FILE_STORAGE_STRATEGY_TOKEN } from '../src/lib/constants';
import { testMap } from './file-storage-cases';

const { description, storageType, options } = testMap[1];

describe(description, () => {
  let fileStorage: FileStorage;

  const createDummyFile = async (filePath: string = randomUUID(), content = 'this is a test content') => {
    await fileStorage?.uploadFile({ filePath, content });
    await setTimeoutPromise(100);
    return { filePath, content };
  };

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
    const filePath = randomUUID();
    await fileStorage.uploadFile({ filePath, content: 'this is a test' });
    //
    const fileExists = await fileStorage.fileExists({ filePath });
    expect(fileExists).toBe(true);
    await fileStorage.deleteFile({ filePath });
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
    const { filePath } = await createDummyFile();
    //
    const fileExists = await fileStorage.fileExists({ filePath });
    expect(fileExists).toBe(true);
    await fileStorage.deleteFile({ filePath });
  });

  it('moveFile moves a file to a new location and remove the previous one', async () => {
    const oldFileName = 'oldFileName.txt';
    const newFileName = 'newFileName.txt';
    await createDummyFile(oldFileName);
    //
    await fileStorage.moveFile({ filePath: oldFileName, newFilePath: newFileName });
    //
    const oldFileExists = await fileStorage.fileExists({ filePath: oldFileName });
    expect(oldFileExists).toBe(false);
    const newFileExists = await fileStorage.fileExists({ filePath: newFileName });
    expect(newFileExists).toBe(true);
    await fileStorage.deleteFile({ filePath: newFileName });
  });

  it('deleteFile deletes a file', async () => {
    const { filePath } = await createDummyFile();
    //
    await fileStorage.deleteFile({ filePath });
    //
    const oldFileExists = await fileStorage.fileExists({ filePath });
    expect(oldFileExists).toBe(false);
  });

  it('uploadStream uploads a file', async () => {
    const filePath = randomUUID();
    const content = randomBytes(1024);
    //
    const upload = await fileStorage.uploadStream({ filePath });
    const entry = Readable.from(content);
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 2000);
    const listener = once(upload, 'done', { signal: ac.signal }).finally(() => clearTimeout(t));
    await pipeline(entry, upload);
    await listener;
    //
    const fileExists = await fileStorage.fileExists({ filePath });
    expect(fileExists).toBe(true);
    await fileStorage.deleteFile({ filePath });
  });

  it('downloadFile downloads a file', async () => {
    const { filePath, content } = await createDummyFile();
    //
    const file = await fileStorage.downloadFile({ filePath });
    //
    expect(file.toString()).toEqual(content.toString());
    await fileStorage.deleteFile({ filePath });
  });

  it('downloadStream downloads a file', async () => {
    const { filePath, content } = await createDummyFile();
    //
    const stream = await fileStorage.downloadStream({ filePath });
    //
    expect(stream).toBeInstanceOf(Readable);
    // this makes the assumption that when the stream is readable, all the data is available in one read
    await once(stream, 'readable');
    const chunk = stream.read();
    expect(chunk.toString()).toBe(content);
    await fileStorage.deleteFile({ filePath });
  });

  it('uploads a file to a nested directory', async () => {
    const nestedDir = 'nested';
    const nestedFileName = 'nested.txt';
    //
    await fileStorage.uploadFile({ filePath: `${nestedDir}/${nestedFileName}`, content: 'this is a nested file' });
    //
    const result = await fileStorage.readDir({ dirPath: nestedDir });
    expect(result.find((fileName) => fileName === nestedFileName)).not.toBeUndefined();
    await fileStorage.deleteDir({ dirPath: nestedDir });
  });

  it('readDir returns an array of files and folders in a directory', async () => {
    const dirPath = '';
    const filePath = randomUUID();
    const nestedFilePath = `nest/${randomUUID()}`;
    const content = randomBytes(1024);
    await fileStorage.uploadFile({ filePath, content });
    await fileStorage.uploadFile({ filePath: nestedFilePath, content });
    await setTimeoutPromise(100);
    //
    const result = await fileStorage.readDir({ dirPath });
    //
    expect(result.length).toBe(2);

    const parts = nestedFilePath.split('/');
    const expected = [parts.shift(), filePath];
    expect(result.every((item) => expected.includes(item))).toBe(true);
  });

  it('deleteDir deletes a directory', async () => {
    const dirPath = '';
    //
    await fileStorage.deleteDir({ dirPath });
    //
    expect(await fileStorage.readDir({ dirPath })).toEqual([]);
  });
});
