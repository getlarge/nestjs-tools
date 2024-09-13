/* eslint-disable max-lines-per-function */
import { Provider } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';

import {
  AsyncLocalStorageGuard,
  AsyncLocalStorageInterceptor,
  AsyncLocalStorageModule,
  AsyncLocalStorageModuleOptions,
} from '../src';
import { ExampleController } from './app.controller.mock';
import { ExampleService } from './app.service.mock';

const moduleFactory = async (
  options: AsyncLocalStorageModuleOptions,
  providers: Provider[] = [],
): Promise<NestFastifyApplication> => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AsyncLocalStorageModule.forRoot(options)],
    providers: [ExampleService, ...providers],
    controllers: [ExampleController],
  }).compile();

  return moduleFixture.createNestApplication(new FastifyAdapter()) as NestFastifyApplication;
};

describe('AsyncLocalStorageModule', () => {
  let app: NestFastifyApplication;
  const route = '/Example';
  const expectedResponse = { type: 'http' };

  afterEach(() => {
    return app?.close();
  });

  it('should provide request context when using explicit guard', async () => {
    app = await moduleFactory(
      {
        isGlobal: true,
        requestContextFactory: (ctx) => ({ type: ctx.getType() }),
      },
      [{ provide: APP_GUARD, useClass: AsyncLocalStorageGuard }],
    ).then((app) => app.init());
    //
    const { payload } = await app.inject({
      method: 'GET',
      url: route,
    });

    const body = JSON.parse(payload);
    expect(body).toEqual(expectedResponse);
  });

  it('should provide request context when using implicit guard', async () => {
    app = await moduleFactory({
      isGlobal: true,
      requestContextFactory: (ctx) => ({ type: ctx.getType() }),
      useGuard: true,
    }).then((app) => app.init());
    //
    const { payload } = await app.inject({
      method: 'GET',
      url: route,
    });

    const body = JSON.parse(payload);
    expect(body).toEqual(expectedResponse);
  });

  it('should provide request context when using explicit interceptor', async () => {
    app = await moduleFactory(
      {
        isGlobal: true,
        requestContextFactory: (ctx) => ({ type: ctx.getType() }),
      },
      [{ provide: APP_INTERCEPTOR, useClass: AsyncLocalStorageInterceptor }],
    ).then((app) => app.init());
    //
    const { payload } = await app.inject({
      method: 'GET',
      url: route,
    });

    const body = JSON.parse(payload);
    expect(body).toEqual(expectedResponse);
  });

  it('should provide request context when using implicit interceptor', async () => {
    app = await moduleFactory({
      isGlobal: true,
      requestContextFactory: (ctx) => ({ type: ctx.getType() }),
      useInterceptor: true,
    }).then((app) => app.init());
    //
    const { payload } = await app.inject({
      method: 'GET',
      url: route,
    });

    const body = JSON.parse(payload);
    expect(body).toEqual(expectedResponse);
  });

  it('should throw when not providing `requestContextFactory`', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(moduleFactory({} as any)).rejects.toThrow('`requestContextFactory` is required.');
  });

  it('should throw when providing both useGuard and useInterceptor', async () => {
    await expect(
      moduleFactory({
        requestContextFactory: (ctx) => ({ type: ctx.getType() }),
        useGuard: true,
        useInterceptor: true,
      }),
    ).rejects.toThrow("Can't use both guard and interceptor.");
  });
});
