import { ExecutionContext } from '@nestjs/common';
import type { AsyncLocalStorage } from 'async_hooks';

export type RequestContext<T extends object = object> = T;

export type ContextStore<T extends object = object> = Map<string, T>;

export interface AsyncLocalStorageModuleOptions<T extends object = object> {
  isGlobal?: boolean;
  asyncLocalStorage?: AsyncLocalStorage<ContextStore<T>>;
  requestContextFactory?: (ctx: ExecutionContext) => T;
  useGuard?: boolean;
  useInterceptor?: boolean;
}

export enum AsyncLocalStorageMode {
  Guard = 'guard',
  Interceptor = 'interceptor',
}
