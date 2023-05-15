import type { ExecutionContext } from '@nestjs/common';
import type { AsyncLocalStorage } from 'node:async_hooks';

import { REQUEST_CONTEXT_KEY } from './async-local-storage.constants';

export interface RequestContext {
  [key: string]: unknown;
}

export interface ContextStoreProperties {
  [REQUEST_CONTEXT_KEY]: RequestContext;
}

export type ContextStore<T extends ContextStoreProperties, K extends keyof T> = Map<K, T[K]>;

export interface AsyncLocalStorageModuleOptions {
  isGlobal?: boolean;
  asyncLocalStorage?: AsyncLocalStorage<ContextStore<ContextStoreProperties, keyof ContextStoreProperties>>;
  requestContextFactory?: (ctx: ExecutionContext) => RequestContext;
  useGuard?: boolean;
  useInterceptor?: boolean;
}

export enum AsyncLocalStorageMode {
  Guard = 'guard',
  Interceptor = 'interceptor',
}
