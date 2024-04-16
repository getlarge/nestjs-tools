import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';

import { ASYNC_LOCAL_STORAGE_MODULE_OPTIONS } from './async-local-storage.constants';
import { AsyncLocalStorageModuleOptions } from './async-local-storage.interfaces';
import { AsyncLocalStorageService } from './async-local-storage.service';

/*
 * This guard is used to set the request context in the AsyncLocalStorageService.
 * Using a guards instead of an interceptor allows to store the request context earlier in the
 * request lifecycle, which is useful for logging and tracing
 */
@Injectable()
export class AsyncLocalStorageGuard implements CanActivate {
  constructor(
    @Inject(AsyncLocalStorageService)
    private readonly asyncLocalStorage: AsyncLocalStorageService,
    @Inject(ASYNC_LOCAL_STORAGE_MODULE_OPTIONS)
    private readonly options: AsyncLocalStorageModuleOptions,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    this.asyncLocalStorage.enter();
    this.asyncLocalStorage.requestContext = this.options.requestContextFactory(context);
    return true;
  }
}
