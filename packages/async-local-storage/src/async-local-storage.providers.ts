import type { ExecutionContext, Provider } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

import { ASYNC_LOCAL_STORAGE, ASYNC_LOCAL_STORAGE_MODULE_OPTIONS } from './async-local-storage.constants';
import { AsyncLocalStorageModuleOptions, ContextStore } from './async-local-storage.interfaces';
import { AsyncLocalStorageService } from './async-local-storage.service';

const defaultAsyncLocalStorage = <T extends object = object>(isGlobal?: boolean): AsyncLocalStorage<ContextStore<T>> =>
  isGlobal
    ? globalThis.__asyncLocalStorage || new AsyncLocalStorage<ContextStore<T>>()
    : new AsyncLocalStorage<ContextStore<T>>();

const defaultRequestContextFactory = (ctx: ExecutionContext) => ctx;

export function createAsyncLocalStorageProviders(
  options: AsyncLocalStorageModuleOptions,
): [
  Provider<AsyncLocalStorage<ContextStore>>,
  Provider<AsyncLocalStorageModuleOptions>,
  Provider<AsyncLocalStorageService>,
] {
  const {
    asyncLocalStorage = defaultAsyncLocalStorage(options.isGlobal),
    requestContextFactory = defaultRequestContextFactory,
  } = options;
  const opts = { ...options, asyncLocalStorage, requestContextFactory };
  return [
    { provide: ASYNC_LOCAL_STORAGE, useValue: asyncLocalStorage },
    {
      provide: ASYNC_LOCAL_STORAGE_MODULE_OPTIONS,
      useValue: opts,
    },
    {
      provide: AsyncLocalStorageService,
      inject: [ASYNC_LOCAL_STORAGE],
      useFactory(store: AsyncLocalStorage<ContextStore>) {
        return new AsyncLocalStorageService(store);
      },
    },
  ];
}
