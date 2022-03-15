import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ExampleService } from './app.service.mock';
import { ExampleDto } from './example.dto.mock';

@Controller({
  path: 'Example',
  version: '1',
})
export class ExampleController {
  constructor(private exampleService: ExampleService) {}

  @ApiOperation({
    description: 'Retrieve example',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Example response',
    type: ExampleDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Wrong credentials',
  })
  @Get()
  getExample() {
    return {};
  }

  publishExample() {
    return this.publishExample();
  }

  subcribeExample() {
    return this.subcribeExample();
  }
}
