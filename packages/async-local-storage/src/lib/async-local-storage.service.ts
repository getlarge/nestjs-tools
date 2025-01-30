import { Inject, Injectable } from '@nestjs/common';
import type { AsyncLocalStorage } from 'node:async_hooks';

import { ASYNC_LOCAL_STORAGE, noOp, REQUEST_CONTEXT_KEY } from './async-local-storage.constants';
import { ContextStoreProperties } from './async-local-storage.interfaces';

type K = keyof ContextStoreProperties;
type T = ContextStoreProperties;

/**
 * @description Define the type of the store
 * Declared this way to share same type between the static methods and the instance methods
 * This can be done with a generic type but it's not possible to use the generic type in the static methods
 * It can be customized by merging ContextStoreProperties and RequestContext interface in your own declaration file
 */
export type StoreMap = Map<K, T[K]>;

/**
 * @description Provide methods to manipulate the AsyncLocalStorage store
 * It holds a shared reference to the AsyncLocalStorage instance that can be accessed through the static and instance methods
 * static methods are used to manipulate the global store without having to inject the service
 * instance methods are used to manipulate the store
 * instance methods extending the Map class are available once the store is initialized with enterWith or run
 * @example
 * declare module '@getlarge/nestjs-tools-async-local-storage' {
 *   interface RequestContext {
 *     type: string;
 *   }
 *   interface ContextStoreProperties {
 *     id: number;
 *     username: string;
 *   }
 * }
 * import assert from 'assert';
 * import { AsyncLocalStorage } from 'async_hooks';
 * import { AsyncLocalStorageService } from '@getlarge/nestjs-tools-async-local-storage';
 *
 * const service = new AsyncLocalStorageService(new AsyncLocalStorage());
 * service.enterWith(new Map());
 * service.set('id', 1);
 * const id = service.get('id');
 * assert(typeof id === 'number');
 *
 * service.requestContext = { type: 'http' };
 * const requestContext = service.requestContext;
 * assert(typeof requestContext.type === 'string');
 */
@Injectable()
export class AsyncLocalStorageService extends Map<K, T[K]> {
  readonly instance: AsyncLocalStorage<StoreMap>;
  private static _instance: AsyncLocalStorage<StoreMap>;

  constructor(@Inject(ASYNC_LOCAL_STORAGE) instance: AsyncLocalStorage<StoreMap>) {
    super();
    // ensure that AsyncLocalStorageService is a singleton
    AsyncLocalStorageService.instance ??= instance;
    this.instance = AsyncLocalStorageService.instance || instance;
  }

  static get instance(): AsyncLocalStorage<StoreMap> {
    return this._instance;
  }

  static set instance(value: AsyncLocalStorage<StoreMap>) {
    this._instance = value;
  }

  static get store() {
    return this.instance?.getStore();
  }

  static get<k extends K>(key: k): T[k] | undefined {
    return this.store?.get(key) as T[k];
  }

  static set<k extends K>(key: k, value: T[k]): void {
    this.store?.set(key, value);
  }

  static get requestContext(): T[typeof REQUEST_CONTEXT_KEY] {
    return this.store?.get(REQUEST_CONTEXT_KEY) as T[typeof REQUEST_CONTEXT_KEY];
  }

  static set requestContext(value: T[typeof REQUEST_CONTEXT_KEY]) {
    this.store?.set(REQUEST_CONTEXT_KEY, value);
  }

  static enterWith(value: StoreMap = new Map()): void {
    this.instance?.enterWith(value);
  }

  static enter(): void {
    this.enterWith();
  }

  static exit(cb: () => void = noOp): void {
    this.instance?.exit(cb);
  }

  // AsyncLocalStorage methods and properties
  run<R, TArgs extends unknown[]>(store: StoreMap, callback: (...args: TArgs) => R, ...args: TArgs): R {
    return this.instance.run(store, callback, ...args);
  }

  enterWith(value: StoreMap = new Map()): void {
    this.instance.enterWith(value);
  }

  enter(): void {
    this.enterWith();
  }

  exit(cb: () => void = noOp): void {
    this.instance.exit(cb);
  }

  get store(): StoreMap | undefined {
    return this.instance.getStore();
  }

  isStoreInitialized(x: unknown): x is StoreMap {
    return !!x && typeof x === 'object' && x instanceof Map;
  }

  private get safeStore(): StoreMap {
    const store = this.store;
    if (this.isStoreInitialized(store)) {
      return store;
    }
    throw new Error("Store is not initialized. Call 'enterWith' or 'run' first.");
  }

  // Map methods and properties
  override get<k extends K>(key: k): T[k] | undefined {
    return this.safeStore.get(key) as T[k];
  }

  override set<k extends K>(key: k, value: T[k]): this {
    this.safeStore.set(key, value);
    return this;
  }

  override delete(key: K): boolean {
    return this.safeStore.delete(key);
  }

  override has(key: K): boolean {
    return this.safeStore.has(key);
  }

  override clear(): void {
    return this.safeStore.clear();
  }

  override get size(): number {
    return this.safeStore.size;
  }

  override get [Symbol.toStringTag]() {
    return this.safeStore[Symbol.toStringTag];
  }

  override keys() {
    return this.safeStore.keys();
  }

  override values() {
    return this.safeStore.values();
  }

  override entries() {
    return this.safeStore.entries();
  }

  override forEach(callbackfn: (value: T[K], key: K, map: Map<K, T[K]>) => void, thisArg?: this): void {
    return this.safeStore.forEach(callbackfn, thisArg);
  }

  override [Symbol.iterator]() {
    return this.safeStore[Symbol.iterator]();
  }

  get requestContext(): T[typeof REQUEST_CONTEXT_KEY] | undefined {
    return this.get(REQUEST_CONTEXT_KEY);
  }

  set requestContext(value: T[typeof REQUEST_CONTEXT_KEY]) {
    this.set(REQUEST_CONTEXT_KEY, value);
  }
}
