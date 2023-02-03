import assert from 'assert';
import { AsyncLocalStorage } from 'async_hooks';

declare module './src' {
  interface RequestContext {
    type: string;
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

assert.throws(() => service.set('id', 1), new TypeError("Cannot read properties of undefined (reading 'set')"));

service.enterWith(new Map());

service.set('id', 1);
const id = service.get('id');
assert(typeof id === 'number');

service.set('username', 'john');
assert(typeof service.get('username') === 'string');

service.requestContext = { type: 'http' };
const requestContext = service.requestContext;
assert(typeof requestContext.type === 'string');

service.delete('username');
