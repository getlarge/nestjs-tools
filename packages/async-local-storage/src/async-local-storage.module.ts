import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AsyncLocalStorageGuard } from './async-local-storage.guard';
import { AsyncStorageInterceptor } from './async-local-storage.interceptor';
import { AsyncLocalStorageModuleOptions } from './async-local-storage.interfaces';
import { createAsyncLocalStorageProviders } from './async-local-storage.providers';

@Module({})
export class AsyncLocalStorageModule {
  public static forRoot(options: AsyncLocalStorageModuleOptions): DynamicModule {
    const { isGlobal, useGuard, useInterceptor } = options;
    const providers = createAsyncLocalStorageProviders(options);
    if (useGuard && useInterceptor) {
      throw new Error("Can't use both guard and interceptor.");
    }
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
                useClass: AsyncStorageInterceptor,
              },
            ]
          : []),
        ...(useInterceptor
          ? [
              {
                provide: APP_INTERCEPTOR,
                useClass: AsyncStorageInterceptor,
              },
            ]
          : []),
      ],
      exports: providers,
    };
  }
}
