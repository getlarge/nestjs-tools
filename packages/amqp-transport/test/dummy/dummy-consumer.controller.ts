import { Controller, Inject } from '@nestjs/common/decorators';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { Channel } from 'amqp-connection-manager';
import { Message } from 'amqplib';

import {
  DUMMY_TOPIC_ACK,
  DUMMY_TOPIC_NOACK,
  DUMMY_WORKER_ID_ACK,
  DUMMY_WORKER_ID_NOACK,
  Resources,
} from './dummy.constants';

@Controller(Resources.DUMMY)
export class DummyConsumerController {
  constructor(@Inject('WORKER_ID') private readonly workerId: number = 0) {}

  @MessagePattern(DUMMY_TOPIC_ACK)
  identityWithAck(@Payload() data: unknown, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef() as Channel;
    const originalMessage = context.getMessage() as Message;
    channel.ack(originalMessage);
    return data;
  }

  @MessagePattern(DUMMY_TOPIC_NOACK)
  identityWithNoAck(@Payload() data: unknown) {
    return data;
  }

  @MessagePattern(DUMMY_WORKER_ID_ACK)
  getWorkerIdAck(@Payload() data: unknown, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef() as Channel;
    const originalMessage = context.getMessage() as Message;
    channel.ack(originalMessage);
    return { workerId: this.workerId, t: 1 };
  }

  @MessagePattern(DUMMY_WORKER_ID_NOACK)
  workerIdNoAck() {
    return { workerId: this.workerId };
  }
}
