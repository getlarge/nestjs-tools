/* eslint-disable max-lines-per-function */
import { Provider } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import {
  AsyncLocalStorageGuard,
  AsyncLocalStorageInterceptor,
  AsyncLocalStorageModule,
  AsyncLocalStorageModuleOptions,
} from '../src';
import { ExampleController } from './app.controller.mock';
import { ExampleService } from './app.service.mock';

declare module '../src/async-local-storage.interfaces' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface RequestContext {
    type: string;
  }
}

const moduleFactory = async (options: AsyncLocalStorageModuleOptions, providers: Provider[] = []) => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [AsyncLocalStorageModule.forRoot(options)],
    providers: [ExampleService, ...providers],
    controllers: [ExampleController],
  }).compile();

  return module.createNestApplication();
};

describe('AsyncLocalStorage', () => {
  const route = '/Example';
  const expectedResponse = { type: 'http' };

  it('should provide request context when using explicit guard', async () => {
    const app = await moduleFactory(
      {
        isGlobal: true,
        requestContextFactory: (ctx) => ({ type: ctx.getType() }),
      },
      [{ provide: APP_GUARD, useClass: AsyncLocalStorageGuard }],
    ).then((app) => app.init());
    //
    const { body } = await request(app.getHttpServer()).get(route);
    expect(body).toEqual(expectedResponse);
    //
    await app.close();
  });

  it('should provide request context when using implicit guard', async () => {
    const app = await moduleFactory({
      isGlobal: true,
      requestContextFactory: (ctx) => ({ type: ctx.getType() }),
      useGuard: true,
    }).then((app) => app.init());
    //
    const { body } = await request(app.getHttpServer()).get(route);
    expect(body).toEqual(expectedResponse);
    //
    await app.close();
  });

  it('should provide request context when using explicit interceptor', async () => {
    const app = await moduleFactory(
      {
        isGlobal: true,
        requestContextFactory: (ctx) => ({ type: ctx.getType() }),
      },
      [{ provide: APP_INTERCEPTOR, useClass: AsyncLocalStorageInterceptor }],
    ).then((app) => app.init());
    //
    const { body } = await request(app.getHttpServer()).get(route);
    expect(body).toEqual(expectedResponse);
    //
    await app.close();
  });

  it('should provide request context when using implicit interceptor', async () => {
    const app = await moduleFactory({
      isGlobal: true,
      requestContextFactory: (ctx) => ({ type: ctx.getType() }),
      useInterceptor: true,
    }).then((app) => app.init());
    //
    const { body } = await request(app.getHttpServer()).get(route);
    expect(body).toEqual(expectedResponse);
    //
    await app.close();
  });

  it('should throw when not providing `requestContextFactory`', async () => {
    await expect(moduleFactory({})).rejects.toThrowError('`requestContextFactory` is required.');
  });

  it('should throw when providing both useGuard and useInterceptor', async () => {
    await expect(
      moduleFactory({
        requestContextFactory: (ctx) => ({ type: ctx.getType() }),
        useGuard: true,
        useInterceptor: true,
      }),
    ).rejects.toThrowError("Can't use both guard and interceptor.");
  });
});
