/* eslint-disable max-lines-per-function */
import { DynamicModule, INestMicroservice } from '@nestjs/common/interfaces';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';

import { AmqpClient } from '../src/amqp-client';
import { DUMMY_CLIENT, DUMMY_QUEUE, DUMMY_REPLY_QUEUE, RMQ_URL } from './dummy/dummy.constants';
import { DummyConsumerController } from './dummy/dummy-consumer.controller';
import { DummyProducerService } from './dummy/dummy-producer.service';

interface BuildClientModuleOptions {
  replyTo?: string;
  queue?: string;
  noAck?: string;
  url?: string;
  brokerUrl?: string;
}

const buildClientModule = (options: BuildClientModuleOptions = {}): DynamicModule => {
  return ClientsModule.register([
    {
      name: DUMMY_CLIENT,
      customClass: AmqpClient,
      options: {
        prefetchCount: 0,
        replyQueue: options?.replyTo || DUMMY_REPLY_QUEUE,
        queue: options.queue || DUMMY_QUEUE,
        noAck: options.noAck ?? true,
        urls: [options.brokerUrl || RMQ_URL],
        queueOptions: {
          durable: true,
        },
      },
    },
  ]);
};

describe('AMQP tests', () => {
  let moduleConsumer: TestingModule;
  let moduleProducer: TestingModule;
  let appConsumer: INestMicroservice;

  beforeAll(async () => {
    moduleConsumer = await Test.createTestingModule({
      controllers: [DummyConsumerController],
    }).compile();

    moduleProducer = await Test.createTestingModule({
      imports: [buildClientModule()],
      providers: [DummyProducerService],
    }).compile();

    appConsumer = moduleConsumer.createNestMicroservice({
      transport: Transport.RMQ,
      options: {
        prefetchCount: 0,
        noAck: false,
        queue: /*options.queue ||*/ DUMMY_QUEUE,
        urls: [/*options.brokerUrl ||*/ RMQ_URL],
        queueOptions: {
          durable: true,
        },
      },
    });

    await appConsumer.listen();
  });

  afterAll(() => {
    appConsumer.close();
    moduleProducer.close();
  });

  it('AMQP clients should be defined', () => {
    const clientProducer = moduleProducer.get(DUMMY_CLIENT);
    const clientConsumer = moduleConsumer.get(DummyConsumerController);

    expect(clientProducer).toBeDefined();
    expect(clientConsumer).toBeDefined();
  });

  it('producer should send message and receive the same in reply from consumer', async () => {
    // Given
    const msg = { message: 'hello consumer' };
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const result = await service.test(msg);
    expect(result).toBeDefined();
    expect(result).toEqual(msg);
  });
});
