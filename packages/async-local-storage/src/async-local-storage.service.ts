import { Inject, Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

import { ASYNC_LOCAL_STORAGE, noOp, REQUEST_CONTEXT_KEY } from './async-local-storage.constants';
import { ContextStore, RequestContext } from './async-local-storage.interfaces';

@Injectable()
export class AsyncLocalStorageService {
  readonly instance: AsyncLocalStorage<ContextStore>;
  private static _instance: AsyncLocalStorage<ContextStore>;

  constructor(@Inject(ASYNC_LOCAL_STORAGE) instance: AsyncLocalStorage<ContextStore>) {
    // ensure that the instance is a singleton
    if (!AsyncLocalStorageService.instance) {
      AsyncLocalStorageService.instance = instance;
      this.instance = instance;
    }
    this.instance = AsyncLocalStorageService.instance;
  }

  static get instance(): AsyncLocalStorage<ContextStore> {
    return this._instance || globalThis.__asyncstorage;
  }

  static set instance(value: AsyncLocalStorage<ContextStore>) {
    this._instance = value;
  }

  static get store(): ContextStore {
    return this.instance?.getStore();
  }

  static get requestContext(): RequestContext {
    return this.store?.get(REQUEST_CONTEXT_KEY);
  }

  static set requestContext(value: RequestContext) {
    this.store?.set(REQUEST_CONTEXT_KEY, value);
  }

  static enterWith(value: ContextStore = new Map()): void {
    this.instance?.enterWith(value);
  }

  static enter(): void {
    this.enterWith();
  }

  static exit(cb: () => void = noOp): void {
    this.instance?.exit(cb);
  }

  get store(): ContextStore {
    return AsyncLocalStorageService.store;
  }

  get requestContext(): RequestContext {
    return AsyncLocalStorageService.requestContext;
  }

  set requestContext(value: RequestContext) {
    AsyncLocalStorageService.requestContext = value;
  }

  enterWith(value: ContextStore = new Map()): void {
    AsyncLocalStorageService.enterWith(value);
  }

  enter(): void {
    AsyncLocalStorageService.enter();
  }

  exit(cb: () => void = noOp): void {
    AsyncLocalStorageService.exit(cb);
  }
}
