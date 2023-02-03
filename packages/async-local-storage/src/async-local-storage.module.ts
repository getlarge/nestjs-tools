import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AsyncLocalStorageGuard } from './async-local-storage.guard';
import { AsyncLocalStorageInterceptor } from './async-local-storage.interceptor';
import { AsyncLocalStorageModuleOptions } from './async-local-storage.interfaces';
import { createAsyncLocalStorageProviders } from './async-local-storage.providers';

@Module({})
export class AsyncLocalStorageModule {
  public static forRoot(options: AsyncLocalStorageModuleOptions): DynamicModule {
    const { isGlobal, useGuard, useInterceptor } = options;
    if (!options.requestContextFactory) {
      throw new Error('`requestContextFactory` is required.');
    }
    if (useGuard && useInterceptor) {
      throw new Error("Can't use both guard and interceptor.");
    }
    const providers = createAsyncLocalStorageProviders(options);
    return {
      global: isGlobal,
      module: AsyncLocalStorageModule,
      providers: [
        ...providers,
        ...(useGuard
          ? [
              {
                provide: APP_GUARD,
                useClass: AsyncLocalStorageGuard,
              },
              {
                provide: APP_INTERCEPTOR,
                useClass: AsyncLocalStorageInterceptor,
              },
            ]
          : []),
        ...(useInterceptor
          ? [
              {
                provide: APP_INTERCEPTOR,
                useClass: AsyncLocalStorageInterceptor,
              },
            ]
          : []),
      ],
      exports: providers,
    };
  }
}
