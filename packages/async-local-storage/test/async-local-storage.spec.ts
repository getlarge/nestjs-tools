/* eslint-disable max-lines-per-function */
import { INestApplication, Provider } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AsyncLocalStorage } from 'async_hooks';
import request from 'supertest';

import {
  AsyncLocalStorageGuard,
  AsyncLocalStorageInterceptor,
  AsyncLocalStorageModule,
  AsyncLocalStorageModuleOptions,
  AsyncLocalStorageService,
} from '../src';
import { ExampleController } from './app.controller.mock';
import { ExampleService } from './app.service.mock';

declare module '../src/async-local-storage.interfaces' {
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

describe('AsyncLocalStorageModule', () => {
  let app: INestApplication;
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
    const { body } = await request(app.getHttpServer()).get(route);
    expect(body).toEqual(expectedResponse);
  });

  it('should provide request context when using implicit guard', async () => {
    app = await moduleFactory({
      isGlobal: true,
      requestContextFactory: (ctx) => ({ type: ctx.getType() }),
      useGuard: true,
    }).then((app) => app.init());
    //
    const { body } = await request(app.getHttpServer()).get(route);
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
    const { body } = await request(app.getHttpServer()).get(route);
    expect(body).toEqual(expectedResponse);
  });

  it('should provide request context when using implicit interceptor', async () => {
    app = await moduleFactory({
      isGlobal: true,
      requestContextFactory: (ctx) => ({ type: ctx.getType() }),
      useInterceptor: true,
    }).then((app) => app.init());
    //
    const { body } = await request(app.getHttpServer()).get(route);
    expect(body).toEqual(expectedResponse);
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

describe('AsyncLocalStorageService', () => {
  let service: AsyncLocalStorageService;
  beforeEach(() => {
    service = new AsyncLocalStorageService(new AsyncLocalStorage());
  });

  afterEach(() => {
    service?.exit();
  });

  it('should throw when accessing store before initialization', () => {
    expect(() => service.set('ctx', { type: '' })).toThrowError(
      "Store is not initialized. Call 'enterWith' or 'run' first.",
    );
  });

  it('should allow to set/get/delete store properties once initialized', () => {
    service.enterWith(new Map());
    //
    service.set('ctx', { type: '' });
    const ctx = service.get('ctx');
    expect(typeof ctx.type).toBe('string');
    expect(typeof service.requestContext.type).toBe('string');
    service.delete('ctx');
    expect(typeof service.requestContext).toBe('undefined');
  });

  it('should allow to access all map properties and methods once initialized', () => {
    service.enterWith(new Map());
    //
    expect(service.has('ctx')).toBeFalsy();
    expect(service.size).toBe(0);
    service.set('ctx', { type: '' });
    expect(service.has('ctx')).toBeTruthy();
    expect(service.size).toBe(1);
    expect(Array.from(service.keys())).toEqual(['ctx']);
    expect(Array.from(service.values())).toEqual([{ type: '' }]);
    service.clear();
    expect(service.size).toBe(0);
  });

  it('should allow to run a function with store', () => {
    service.run(new Map(), () => {
      service.set('ctx', { type: '' });
      expect(service.get('ctx')).toEqual({ type: '' });
    });
    expect(service.store).toBeUndefined();
  });

  it('should contain the same store in static and instance members', () => {
    const requestContext = { type: '' };
    service.enterWith(new Map());
    service.set('ctx', requestContext);
    expect(service.requestContext).toEqual(requestContext);
    expect(service.get('ctx')).toEqual(requestContext);
    expect(AsyncLocalStorageService.requestContext).toEqual(requestContext);
    expect(AsyncLocalStorageService.store.get('ctx')).toEqual(requestContext);
  });
});
