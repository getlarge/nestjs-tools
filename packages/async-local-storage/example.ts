/* run with npx ts-node packages/async-local-storage/example.ts */
import assert from 'assert';
import { AsyncLocalStorage } from 'async_hooks';

declare module './src' {
  interface RequestContext {
    type?: string;
  }
  interface ContextStoreProperties {
    id: number;
    username: string;
    profilePicture: string;
    name: string;
  }
}

import { AsyncLocalStorageService } from './src';

const service = new AsyncLocalStorageService(new AsyncLocalStorage());

assert.throws(() => service.store.set('id', 1), new TypeError("Cannot read properties of undefined (reading 'set')"));
assert.throws(() => service.set('id', 1), new Error("Store is not initialized. Call 'enterWith' or 'run' first."));

service.enterWith(new Map());

// access store map directly
service.store.set('id', 1);
const id = service.store.get('id');
assert(typeof id === 'number');

// access store map via service which extends Map
service.set('username', 'john');
assert(typeof service.get('username') === 'string');

service.requestContext = { type: 'http' };
const requestContext = service.requestContext;
assert(typeof requestContext.type === 'string');

service.delete('username');
