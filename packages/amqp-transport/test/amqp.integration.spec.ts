/* eslint-disable max-lines-per-function */
import { DynamicModule, INestMicroservice } from '@nestjs/common/interfaces';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';

import { AmqpClient } from '../src/amqp-client';
import { DUMMY_CLIENT } from './dummy/dummy.constants';
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
        replyTo: options?.replyTo || 'testing_reply',
        queue: options.queue || 'testing',
        noAck: options.noAck ?? true,
        urls: [options.brokerUrl || 'amqp://guest:guest@localhost:5672'],
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
  let appProducer: INestMicroservice;
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
        queue: /*options.queue ||*/ 'testing',
        urls: [/*options.brokerUrl ||*/ 'amqp://guest:guest@localhost:5672'],
        queueOptions: {
          durable: true,
        },
      },
    });

    await appConsumer.listen();

    appProducer = moduleProducer.createNestMicroservice({});
  });

  afterAll(() => {
    appConsumer.close();
    appProducer.close();
  });

  // it('AMQP should be defined', () => {
  //   const amqp = moduleProducer.get(DUMMY_CLIENT);
  //   expect(amqp).toBeDefined();
  // });

  it('should run', async () => {
    // Given
    const service = appProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const result = await service.test();
    expect(result).toBeDefined();
  }, 10000);
});
