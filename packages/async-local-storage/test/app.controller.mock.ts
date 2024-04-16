import { Controller, Get } from '@nestjs/common';

import { ExampleService } from './app.service.mock';

@Controller({
  path: 'Example',
  version: '1',
})
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Get()
  getExample() {
    return this.exampleService.getExample();
  }
}
