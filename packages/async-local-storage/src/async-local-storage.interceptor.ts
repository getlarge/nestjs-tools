import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { lastValueFrom, Observable, of } from 'rxjs';

import { ASYNC_LOCAL_STORAGE_MODULE_OPTIONS } from './async-local-storage.constants';
import { AsyncLocalStorageMode, AsyncLocalStorageModuleOptions } from './async-local-storage.interfaces';
import { AsyncLocalStorageService } from './async-local-storage.service';

/*
 * This interceptor is used to set the request context in the AsyncLocalStorageService.
 * Using an interceptor instead of a guard allows to store the request context later in the request lifecycle.
 * This interceptor has two modes: Guard and Interceptor.
 * The Guard mode is used when the AsyncLocalStorageGuard is used.
 * The Interceptor mode is used when the AsyncLocalStorageInterceptor is used.
 * The Guard mode is used by default and when the ASYNC_LOCAL_STORAGE_MODE is set to Guard.
 * The Interceptor mode is used when the ASYNC_LOCAL_STORAGE_MODE is set to Interceptor.
 * When the Guard mode is used, the request context is set in the AsyncLocalStorageService in the AsyncLocalStorageGuard
 * and the AsyncLocalStorageInterceptor is used to exit the AsyncLocalStorageService.
 */
@Injectable()
export class AsyncLocalStorageInterceptor implements NestInterceptor {
  constructor(
    @Inject(AsyncLocalStorageService)
    private readonly asyncLocalStorage: AsyncLocalStorageService,
    @Inject(ASYNC_LOCAL_STORAGE_MODULE_OPTIONS)
    private readonly options: AsyncLocalStorageModuleOptions,
  ) {}

  get mode(): AsyncLocalStorageMode {
    const { useGuard, useInterceptor } = this.options;
    if (useGuard) {
      return AsyncLocalStorageMode.Guard;
    }
    if (useInterceptor) {
      return AsyncLocalStorageMode.Interceptor;
    }
    return null;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (this.mode === AsyncLocalStorageMode.Guard) {
      const response = await lastValueFrom(next.handle());
      this.asyncLocalStorage.exit();
      return of(response);
    }
    const response = await this.asyncLocalStorage.instance.run(new Map(), () => {
      this.asyncLocalStorage.requestContext = this.options.requestContextFactory(context);
      // wait for route handler to finish its job and return the response / error
      return lastValueFrom(next.handle());
    });
    return of(response);
  }
}
