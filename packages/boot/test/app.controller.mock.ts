import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AsyncApiOperation, AsyncApiSub } from 'nestjs-asyncapi';

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

  @AsyncApiOperation(
    {
      type: 'pub',
      channel: 'example',
      summary: 'Send example packet',
      description: 'method is used for test purposes',
      message: {
        name: 'example data',
        payload: ExampleDto,
      },
    },
    {
      type: 'sub',
      channel: 'example',
      summary: 'Receive example packet response',
      message: {
        name: 'example data',
        payload: ExampleDto,
      },
    },
  )
  publishExample() {
    return this.publishExample();
  }

  @AsyncApiSub({
    channel: 'signal_example',
    summary: 'Subscribe to example packet',
    description: 'method is used for test purposes',
    message: {
      name: 'example data signal',
      payload: ExampleDto,
    },
  })
  subcribeExample() {
    return this.subcribeExample();
  }
}
