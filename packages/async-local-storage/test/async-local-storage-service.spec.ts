/* eslint-disable max-lines-per-function */
import { AsyncLocalStorage } from 'node:async_hooks';

import { AsyncLocalStorageService } from '../src';

declare module '../src/lib/async-local-storage.interfaces' {
  interface RequestContext {
    type: string;
  }
}

describe('AsyncLocalStorageService', () => {
  let service: AsyncLocalStorageService;

  beforeEach(() => {
    service = new AsyncLocalStorageService(new AsyncLocalStorage());
  });

  afterEach(() => {
    service?.exit();
  });

  it('should throw when accessing store before initialization', () => {
    expect(() => service.set('ctx', { type: '' })).toThrow(
      "Store is not initialized. Call 'enterWith' or 'run' first.",
    );
  });

  it('should allow to set/get/delete store properties once initialized', () => {
    service.enterWith(new Map());
    //
    service.set('ctx', { type: '' });
    const ctx = service.get('ctx');
    expect(typeof ctx?.type).toBe('string');
    expect(typeof service.requestContext?.type).toBe('string');
    service.delete('ctx');
    expect(typeof service.requestContext).toBe('undefined');
  });

  it('should allow to access all map properties and methods once initialized', () => {
    service.enterWith(new Map());
    //
    expect(service.has('ctx')).toBeFalsy();
    expect(service.size).toBe(0);
    service.set('ctx', { type: '' });
    expect(service.has('ctx')).toBeTruthy();
    expect(service.size).toBe(1);
    expect(Array.from(service.keys())).toEqual(['ctx']);
    expect(Array.from(service.values())).toEqual([{ type: '' }]);
    service.clear();
    expect(service.size).toBe(0);
  });

  it('should allow to run a function with store', async () => {
    const p = new Promise<void>((resolve) => {
      service.run(new Map(), () => {
        service.set('ctx', { type: '' });
        expect(service.get('ctx')).toEqual({ type: '' });
        resolve();
      });
    });
    //
    await p;
  });

  it('should contain the same store in static and instance members', () => {
    const requestContext = { type: '' };
    service.enterWith(new Map());
    service.set('ctx', requestContext);
    //
    expect(service.requestContext).toEqual(requestContext);
    expect(service.get('ctx')).toEqual(requestContext);
    expect(AsyncLocalStorageService.requestContext).toEqual(requestContext);
    expect(AsyncLocalStorageService.store?.get('ctx')).toEqual(requestContext);
  });

  it('should always use a single AsyncLocalStorage reference when creating new instance', () => {
    const expectedRequestContext = { type: '' };
    const newService = new AsyncLocalStorageService(new AsyncLocalStorage());
    newService.enterWith(new Map());
    newService.set('ctx', expectedRequestContext);
    //
    expect(AsyncLocalStorageService.instance).toBeDefined();
    expect(AsyncLocalStorageService.requestContext).toEqual(expectedRequestContext);
    expect(service.requestContext).toEqual(expectedRequestContext);
    expect(newService.requestContext).toEqual(expectedRequestContext);
  });

  it('should allow to access static methods without initializing the store', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AsyncLocalStorageService.instance = undefined as any;
    //
    expect(AsyncLocalStorageService.instance).toBeUndefined();
    expect(AsyncLocalStorageService.store).toBeUndefined();
    expect(() => AsyncLocalStorageService.requestContext).not.toThrow();
    expect(AsyncLocalStorageService.requestContext).toBeUndefined();
    expect(AsyncLocalStorageService.store?.has('ctx')).toBeFalsy();
  });
});
