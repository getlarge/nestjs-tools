import type { ExecutionContext, Provider } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

import { ASYNC_LOCAL_STORAGE, ASYNC_LOCAL_STORAGE_MODULE_OPTIONS } from './async-local-storage.constants';
import { AsyncLocalStorageModuleOptions, ContextStoreProperties } from './async-local-storage.interfaces';
import { AsyncLocalStorageService } from './async-local-storage.service';

type K = keyof ContextStoreProperties;
type T = ContextStoreProperties;
type StoreMap = Map<K, T[K]>;

const defaultAsyncLocalStorage = (isGlobal?: boolean): AsyncLocalStorage<StoreMap> =>
  isGlobal ? globalThis.__asyncLocalStorage || new AsyncLocalStorage<StoreMap>() : new AsyncLocalStorage<StoreMap>();

const defaultRequestContextFactory = (ctx: ExecutionContext) => {
  const type = ctx.getType();
  return {
    type,
    ...(type === 'http' && { headers: ctx.switchToHttp().getRequest().headers }),
  };
};

export function createAsyncLocalStorageProviders(
  options: AsyncLocalStorageModuleOptions,
): [
  Provider<AsyncLocalStorage<StoreMap>>,
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
      useFactory(store: AsyncLocalStorage<StoreMap>) {
        return new AsyncLocalStorageService(store);
      },
    },
  ];
}
