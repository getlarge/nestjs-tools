import { Inject, Injectable } from '@nestjs/common';

import { AsyncLocalStorageService } from '../src';

@Injectable()
export class ExampleService {
  @Inject(AsyncLocalStorageService) private readonly asyncLocalStorageService: AsyncLocalStorageService;

  getExample() {
    return this.asyncLocalStorageService.requestContext;
  }
}
