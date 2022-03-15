import { AsyncApiPub, AsyncApiService, AsyncApiSub } from 'nestjs-asyncapi';

import { ExampleDto } from './example.dto.mock';

@AsyncApiService({ serviceName: 'Example' })
export class ExampleService {
  @AsyncApiPub({
    channel: 'example',
    summary: 'Send example packet',
    description: 'method is used for test purposes',
    message: {
      name: 'example data',
      payload: {
        type: ExampleDto,
      },
    },
  })
  publishExample() {
    return {};
  }

  @AsyncApiSub({
    channel: 'signal_example',
    summary: 'Subscribe to example packet',
    description: 'method is used for test purposes',
    message: {
      name: 'example data signal',
      payload: {
        type: ExampleDto,
      },
    },
  })
  subcribeExample() {
    return undefined;
  }
}
