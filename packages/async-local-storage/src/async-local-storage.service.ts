import { Inject, Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

import { ASYNC_LOCAL_STORAGE, noOp, REQUEST_CONTEXT_KEY } from './async-local-storage.constants';
import { ContextStoreProperties } from './async-local-storage.interfaces';

type K = keyof ContextStoreProperties;
type T = ContextStoreProperties;
export type StoreMap = Map<K, T[K]>;

@Injectable()
export class AsyncLocalStorageService extends Map<K, T[K]> {
  readonly instance: AsyncLocalStorage<StoreMap>;
  private static _instance: AsyncLocalStorage<StoreMap>;

  constructor(@Inject(ASYNC_LOCAL_STORAGE) instance: AsyncLocalStorage<StoreMap>) {
    super();
    // ensure that the instance is a singleton
    if (!AsyncLocalStorageService.instance) {
      AsyncLocalStorageService.instance = instance;
      this.instance = instance;
    }
    this.instance = AsyncLocalStorageService.instance;
  }

  static get instance(): AsyncLocalStorage<StoreMap> {
    return this._instance || globalThis.__asyncstorage;
  }

  static set instance(value: AsyncLocalStorage<StoreMap> | undefined) {
    this._instance = value;
  }

  private static get store() {
    return this.instance?.getStore();
  }

  static get requestContext(): T[typeof REQUEST_CONTEXT_KEY] {
    return this.store.get(REQUEST_CONTEXT_KEY) as T[typeof REQUEST_CONTEXT_KEY];
  }

  static set requestContext(value: T[typeof REQUEST_CONTEXT_KEY]) {
    this.store.set(REQUEST_CONTEXT_KEY, value);
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
  get store(): StoreMap {
    return this.instance.getStore();
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

  // Map methods and properties
  get<k extends K>(key: k): T[k] | undefined {
    return this.store.get(key) as T[k];
  }

  set<k extends K>(key: k, value: T[k]): this {
    this.store.set(key, value);
    return this;
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  has(key: K): boolean {
    return this.store.has(key);
  }

  clear(): void {
    return this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  get [Symbol.toStringTag]() {
    return this.store[Symbol.toStringTag];
  }

  keys(): IterableIterator<K> {
    return this.store.keys();
  }

  values(): IterableIterator<T[keyof T]> {
    return this.store.values();
  }

  entries(): IterableIterator<[K, T[K]]> {
    return this.store.entries();
  }

  forEach(callbackfn: (value: T[K], key: K, map: Map<K, T[K]>) => void, thisArg?: any): void {
    return this.store.forEach(callbackfn, thisArg);
  }

  [Symbol.iterator](): IterableIterator<[K, T[K]]> {
    return this.store[Symbol.iterator]();
  }

  get requestContext(): T[typeof REQUEST_CONTEXT_KEY] {
    return this.get(REQUEST_CONTEXT_KEY);
  }

  set requestContext(value: T[typeof REQUEST_CONTEXT_KEY]) {
    this.set(REQUEST_CONTEXT_KEY, value);
  }
}
