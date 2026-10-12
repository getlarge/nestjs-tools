import FastifyMultipart from '@fastify/multipart';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as FormData from 'form-data';
import { createReadStream } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { firstValueFrom, NEVER, of, Subject, throwError } from 'rxjs';

import { cleanupStorageFiles } from '../../src/lib/multipart/file';
import { AppController } from './app.controller';

// eslint-disable-next-line max-lines-per-function
describe('Fastify File Upload', () => {
  let app: NestFastifyApplication;
  beforeEach(async () => {
    const modRef = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();
    app = modRef.createNestApplication(new FastifyAdapter());

    await app.register(FastifyMultipart);

    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('should upload a single file', async () => {
    const form = new FormData();
    form.append('file', await readFile(join(process.cwd(), 'package.json')), {
      contentType: 'application/json',
      filename: 'package.json',
    });
    //
    const response = await app.inject({
      method: 'POST',
      url: '/single',
      body: form.getBuffer(),
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ success: true });
  });

  it('should upload multiple files', async () => {
    const form = new FormData();
    form.append('file', createReadStream(join(process.cwd(), 'package.json')));
    form.append('file', createReadStream(join(process.cwd(), 'eslint.config.mjs')));
    form.append('nonFile', 'Hello World!');
    //
    const response = await app.inject({
      method: 'POST',
      url: '/multiple',
      payload: form,
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ success: true, fileCount: 2 });
  });

  it('should force and await cleanup when the handler rejects uploaded files', async () => {
    const firstFilename = `cleanup-${Date.now()}-${process.pid}-first.json`;
    const secondFilename = `cleanup-${Date.now()}-${process.pid}-second.json`;
    const form = new FormData();
    const contents = await readFile(join(process.cwd(), 'package.json'));
    form.append('file', contents, { filename: firstFilename });
    form.append('file', contents, { filename: secondFilename });

    const response = await app.inject({
      method: 'POST',
      url: '/multiple-stream-error',
      body: form.getBuffer(),
      headers: form.getHeaders(),
    });

    expect(response.statusCode).toBe(500);
    await expect(access(join(tmpdir(), firstFilename))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(join(tmpdir(), secondFilename))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('should upload any files', async () => {
    const form = new FormData();
    form.append('fil', createReadStream(join(process.cwd(), 'package.json')));
    form.append('field', 'Hello World!');
    //
    const response = await app.inject({
      method: 'POST',
      url: '/any',
      payload: form,
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ success: true, fileCount: 1 });
  });

  it('should upload single file fields', async () => {
    const form = new FormData();
    form.append('profile', createReadStream(join(process.cwd(), 'package.json')));
    //
    const response = await app.inject({
      method: 'POST',
      url: '/fields',
      payload: form,
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ success: true, fileCount: 1 });
  });

  it('should upload multiple file fields', async () => {
    const form = new FormData();
    form.append('profile', createReadStream(join(process.cwd(), 'package.json')));
    form.append('avatar', createReadStream(join(process.cwd(), 'eslint.config.mjs')));
    //
    const response = await app.inject({
      method: 'POST',
      url: '/fields',
      payload: form,
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ success: true, fileCount: 2 });
  });

  it('should upload a single file to stream', async () => {
    const form = new FormData();
    const file = await readFile(join(process.cwd(), 'package.json'));
    form.append('file', file);
    //
    const response = await app.inject({
      method: 'POST',
      url: '/single-stream',
      payload: form,
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual(file.toString());
  });

  it('should upload a single file to disk', async () => {
    const form = new FormData();
    form.append('file', createReadStream(join(process.cwd(), 'package.json')));
    //
    const response = await app.inject({
      method: 'POST',
      url: '/single-disk',
      payload: form,
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      success: true,
      filepath: expect.any(String),
    });
  });

  it('should upload single file with body fields', async () => {
    const form = new FormData();
    form.append('file', await readFile(join(process.cwd(), 'package.json')), {
      contentType: 'application/json',
      filename: 'package.json',
    });
    form.append('fontMeta', JSON.stringify({ foo: 'bar' }));
    //
    const response = await app.inject({
      method: 'POST',
      url: '/single-with-body',
      body: form.getBuffer(),
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(201);
    const result = response.json();
    expect(result.success).toBe(true);
    expect(result.body).toEqual({ fontMeta: '{"foo":"bar"}' });
  });

  it('should upload single file when body fields come first', async () => {
    const form = new FormData();
    form.append('metadata', 'some-value');
    form.append('file', await readFile(join(process.cwd(), 'package.json')), {
      contentType: 'application/json',
      filename: 'package.json',
    });
    //
    const response = await app.inject({
      method: 'POST',
      url: '/single-with-body',
      body: form.getBuffer(),
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(201);
    const result = response.json();
    expect(result.success).toBe(true);
    expect(result.body).toEqual({ metadata: 'some-value' });
  });

  it('should reject multiple files on same field', async () => {
    const form = new FormData();
    form.append('file', await readFile(join(process.cwd(), 'package.json')), {
      contentType: 'application/json',
      filename: 'package.json',
    });
    form.append('file', await readFile(join(process.cwd(), 'package.json')), {
      contentType: 'application/json',
      filename: 'package2.json',
    });
    //
    const response = await app.inject({
      method: 'POST',
      url: '/single',
      body: form.getBuffer(),
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('accepts only one file');
  });

  it('should reject file with wrong fieldname', async () => {
    const form = new FormData();
    form.append('wrongField', await readFile(join(process.cwd(), 'package.json')), {
      contentType: 'application/json',
      filename: 'package.json',
    });
    //
    const response = await app.inject({
      method: 'POST',
      url: '/single',
      body: form.getBuffer(),
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain("doesn't accept file");
  });

  it('should accumulate duplicate non-file fields into array', async () => {
    const form = new FormData();
    form.append('file', await readFile(join(process.cwd(), 'package.json')), {
      contentType: 'application/json',
      filename: 'package.json',
    });
    form.append('_owners', '66fd50bd17e6f4cd32155180');
    form.append('_owners', '62e2811173380ab36ef0f240');
    //
    const response = await app.inject({
      method: 'POST',
      url: '/single-with-body',
      body: form.getBuffer(),
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(201);
    const data = response.json();
    expect(data.success).toBe(true);
    expect(data.body._owners).toEqual(['66fd50bd17e6f4cd32155180', '62e2811173380ab36ef0f240']);
  });

  it('should accumulate three duplicate fields into array', async () => {
    const form = new FormData();
    form.append('file', await readFile(join(process.cwd(), 'package.json')), {
      contentType: 'application/json',
      filename: 'package.json',
    });
    form.append('tags', 'tag1');
    form.append('tags', 'tag2');
    form.append('tags', 'tag3');
    //
    const response = await app.inject({
      method: 'POST',
      url: '/single-with-body',
      body: form.getBuffer(),
      headers: form.getHeaders(),
    });
    //
    expect(response.statusCode).toBe(201);
    const data = response.json();
    expect(data.success).toBe(true);
    expect(data.body.tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('starts successful cleanup without delaying a streamed response', async () => {
    const remove = jest.fn(() => NEVER);

    await expect(firstValueFrom(of('response').pipe(cleanupStorageFiles(remove)))).resolves.toBe('response');
    expect(remove).toHaveBeenCalledWith();
  });

  it('forces and awaits cleanup before propagating a handler error', async () => {
    const handlerError = new Error('Handler failed');
    const cleanup = new Subject<void>();
    const remove = jest.fn((force?: boolean) => {
      expect(force).toBe(true);
      return cleanup;
    });
    let errorPropagated = false;

    const result = firstValueFrom(throwError(() => handlerError).pipe(cleanupStorageFiles(remove))).catch((error) => {
      errorPropagated = true;
      throw error;
    });
    await Promise.resolve();

    expect(errorPropagated).toBe(false);
    expect(remove).toHaveBeenCalledTimes(1);
    cleanup.complete();
    await expect(result).rejects.toBe(handlerError);
  });

  it('preserves the handler error when forced cleanup also fails', async () => {
    const handlerError = new Error('Handler failed');
    const cleanupError = new Error('Cleanup failed');
    const cleanupFailure = throwError(() => cleanupError);
    const remove = jest.fn(() => cleanupFailure);

    await expect(firstValueFrom(throwError(() => handlerError).pipe(cleanupStorageFiles(remove)))).rejects.toBe(
      handlerError,
    );
    expect(remove).toHaveBeenCalledWith(true);
  });
});
