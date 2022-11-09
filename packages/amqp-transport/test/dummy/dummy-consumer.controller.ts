import { Controller } from '@nestjs/common/decorators';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { Channel } from 'amqp-connection-manager';
import { Message } from 'amqplib';

import { DUMMY_TOPIC, Resources } from './dummy.constants';

@Controller(Resources.DUMMY)
export class DummyConsumerController {
  @MessagePattern(DUMMY_TOPIC)
  test(@Payload() data: unknown, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef() as Channel;
    const originalMessage = context.getMessage() as Message;
    channel.ack(originalMessage);
    return data;
  }
}
