import { ExecutionContext } from '@nestjs/common';

export class ExampleService {
  getExample(ctx: ExecutionContext) {
    return { type: ctx.getType() };
  }
}
