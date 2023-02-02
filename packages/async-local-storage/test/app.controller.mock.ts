import { Controller, Get, Inject } from '@nestjs/common';

import { AsyncLocalStorageService } from '../src';
import { ExampleService } from './app.service.mock';

@Controller({
  path: 'Example',
  version: '1',
})
export class ExampleController {
  constructor(
    @Inject(AsyncLocalStorageService) private readonly asyncLocalStorageService: AsyncLocalStorageService,
    private readonly exampleService: ExampleService,
  ) {}

  @Get()
  getExample() {
    return this.exampleService.getExample(this.asyncLocalStorageService.requestContext as any);
  }
}
