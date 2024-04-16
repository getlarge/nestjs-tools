import type { Provider } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

import { ASYNC_LOCAL_STORAGE, ASYNC_LOCAL_STORAGE_MODULE_OPTIONS } from './async-local-storage.constants';
import { AsyncLocalStorageModuleOptions, ContextStoreProperties } from './async-local-storage.interfaces';
import { AsyncLocalStorageService } from './async-local-storage.service';

type K = keyof ContextStoreProperties;
type T = ContextStoreProperties;
type StoreMap = Map<K, T[K]>;

const defaultAsyncLocalStorage = (): AsyncLocalStorage<StoreMap> => new AsyncLocalStorage<StoreMap>();

export function createAsyncLocalStorageProviders(
  options: AsyncLocalStorageModuleOptions,
): [
  Provider<AsyncLocalStorage<StoreMap>>,
  Provider<AsyncLocalStorageModuleOptions>,
  Provider<AsyncLocalStorageService>,
] {
  const { asyncLocalStorage = defaultAsyncLocalStorage() } = options;
  const opts = { ...options, asyncLocalStorage };
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
