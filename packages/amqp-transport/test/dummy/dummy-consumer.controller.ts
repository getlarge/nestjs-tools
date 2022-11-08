import { Controller } from '@nestjs/common/decorators';
import { Ctx, MessagePattern, RmqContext } from '@nestjs/microservices';

import { DUMMY_TOPIC, Resources } from './dummy.constants';

@Controller(Resources.DUMMY)
export class DummyConsumerController {
  @MessagePattern(DUMMY_TOPIC)
  test(@Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    channel.ack(originalMessage);
    return 'hello';
  }
}
