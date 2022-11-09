/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
import { DynamicModule, INestMicroservice } from '@nestjs/common/interfaces';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RQM_DEFAULT_NOACK, RQM_DEFAULT_PREFETCH_COUNT } from '@nestjs/microservices/constants';
import { Test, TestingModule } from '@nestjs/testing';

import { AmqpClient } from '../src/amqp-client';
import { DUMMY_CLIENT, DUMMY_QUEUE, DUMMY_REPLY_QUEUE, RMQ_URL } from './dummy/dummy.constants';
import { DummyConsumerController } from './dummy/dummy-consumer.controller';
import { DummyProducerService } from './dummy/dummy-producer.service';

interface BuildClientModuleOptions {
  prefetchCount?: number;
  replyQueue?: string;
  queue?: string;
  noAck?: boolean;
  url?: string;
  brokerUrl?: string;
}

const buildClientModule = (options: BuildClientModuleOptions = {}): DynamicModule => {
  return ClientsModule.register([
    {
      name: DUMMY_CLIENT,
      customClass: AmqpClient,
      options: {
        prefetchCount: options.prefetchCount || RQM_DEFAULT_PREFETCH_COUNT,
        replyQueue: options?.replyQueue || DUMMY_REPLY_QUEUE,
        queue: options.queue || DUMMY_QUEUE,
        noAck: options.noAck ?? RQM_DEFAULT_NOACK,
        urls: [options.brokerUrl || RMQ_URL],
        queueOptions: {
          durable: true,
        },
      },
    },
  ]);
};

const createNestMicroserviceOptions = (options: BuildClientModuleOptions = {}) => ({
  transport: Transport.RMQ,
  options: {
    prefetchCount: options.prefetchCount || RQM_DEFAULT_PREFETCH_COUNT,
    noAck: options.noAck ?? RQM_DEFAULT_NOACK,
    queue: options.queue || DUMMY_QUEUE,
    urls: [options.brokerUrl || RMQ_URL],
    queueOptions: {
      durable: true,
    },
  },
});

const setupConsumer = async (testConfiguration: BuildClientModuleOptions = {}, workerId = 0) => {
  const moduleConsumer = await Test.createTestingModule({
    controllers: [DummyConsumerController],
    providers: [
      {
        provide: 'WORKER_ID',
        useValue: workerId,
      },
    ],
  }).compile();
  const appConsumer = moduleConsumer.createNestMicroservice(createNestMicroserviceOptions(testConfiguration));
  await appConsumer.listen();
  return { moduleConsumer, appConsumer };
};

const setupProducer = async (testConfiguration: BuildClientModuleOptions = {}) => {
  return await Test.createTestingModule({
    imports: [buildClientModule(testConfiguration)],
    providers: [DummyProducerService],
  }).compile();
};

const message = 'hello consumer';

const makeMultipleRequests = <T>(f: Promise<T>, n = 5) => {
  const t = [...Array(n)];
  return Promise.all(t.map(() => f));
};

describe('AMQP tests', () => {
  describe('Basic configuration', () => {
    let moduleConsumer: TestingModule;
    let moduleProducer: TestingModule;
    let appConsumer: INestMicroservice;
    const testConfiguration: BuildClientModuleOptions = {};

    beforeAll(async () => {
      moduleProducer = await setupProducer(testConfiguration);
      ({ moduleConsumer, appConsumer } = await setupConsumer(testConfiguration));
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

    it('producer should send message and receive the same in reply from consumer with default', async () => {
      // Given
      const msg = { message };
      const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
      // Then
      const result = await service.test(msg);
      expect(result).toBeDefined();
      expect(result).toEqual(msg);
    });

    it('should handle multiple sends with noack', async () => {
      // Given
      const msg = { message };
      const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
      // Then
      const results = await makeMultipleRequests(service.test(msg));
      // Expect
      expect(results).toBeDefined();
      results.forEach((r) => {
        expect(r).toEqual(msg);
      });
    });
  });

  describe('Configuration with noAck: false', () => {
    let moduleProducer: TestingModule;
    let appConsumer: INestMicroservice;
    const testConfiguration: BuildClientModuleOptions = { noAck: false };

    beforeAll(async () => {
      moduleProducer = await setupProducer(testConfiguration);
      ({ appConsumer } = await setupConsumer(testConfiguration));
    });

    afterAll(() => {
      appConsumer.close();
      moduleProducer.close();
    });

    it('producer should send message and receive the same in reply from consumer with ack', async () => {
      // Given
      const msg = { message };
      const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
      // Then
      const result = await service.test(msg, false);
      expect(result).toBeDefined();
      expect(result).toEqual(msg);
    });

    it('should handle multiple sends with ack', async () => {
      // Given
      const msg = { message };
      const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
      // Then
      const results = await makeMultipleRequests(service.test({ message }, false));
      // Expect
      expect(results).toBeDefined();
      results.forEach((r) => {
        expect(r).toEqual(msg);
      });
    });
  });

  describe('configuration with prefetch non zero noack', () => {
    let moduleProducer: TestingModule;
    let appConsumer: INestMicroservice;
    const testConfiguration: BuildClientModuleOptions = { prefetchCount: 5 };

    beforeAll(async () => {
      moduleProducer = await setupProducer(testConfiguration);
      ({ appConsumer } = await setupConsumer(testConfiguration));
    });

    afterAll(() => {
      appConsumer.close();
      moduleProducer.close();
    });
    it('producer should send message and receive the same in reply from consumer', async () => {
      // Given
      const msg = { message };
      const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
      // Then
      const result = await service.test(msg);
      expect(result).toBeDefined();
      expect(result).toEqual(msg);
    });

    it('should handle multiple sends with noack', async () => {
      // Given
      const msg = { message };
      const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
      // Then
      const results = await makeMultipleRequests(service.test(msg));
      // Expect
      expect(results).toBeDefined();
      results.forEach((r) => {
        expect(r).toEqual(msg);
      });
    });

    it('should handle multiple sends with noack greater prefetchCount', async () => {
      // Given
      const msg = { message };
      const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
      // Then
      const results = await makeMultipleRequests(service.test(msg), 10);
      // Expect
      expect(results).toBeDefined();
      results.forEach((r) => {
        expect(r).toEqual(msg);
      });
    });
  });

  describe('configuration with prefetch non zero ack', () => {
    let moduleProducer: TestingModule;
    let appConsumer: INestMicroservice;
    const testConfiguration: BuildClientModuleOptions = { prefetchCount: 3, noAck: false };

    beforeAll(async () => {
      moduleProducer = await setupProducer(testConfiguration);
      ({ appConsumer } = await setupConsumer(testConfiguration));
    });

    afterAll(() => {
      appConsumer.close();
      moduleProducer.close();
    });
    it('producer should send message and receive the same in reply from consumer', async () => {
      // Given
      const msg = { message };
      const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
      // Then
      const result = await service.test(msg, false);
      expect(result).toBeDefined();
      expect(result).toEqual(msg);
    });

    it('should handle multiple sends with prefetch and ack', async () => {
      // Given
      const msg = { message };
      const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
      // Then
      const results = await makeMultipleRequests(service.test(msg, false));
      // Expect
      expect(results).toBeDefined();
      results.forEach((r) => {
        expect(r).toEqual(msg);
      });
    });

    it('should handle multiple sends with ack greater prefetchCount', async () => {
      // Given
      const msg = { message };
      const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
      // Then
      const results = await makeMultipleRequests(service.test(msg, false), 10);
      // Expect
      expect(results).toBeDefined();
      results.forEach((r) => {
        expect(r).toEqual(msg);
      });
    });
  });

  describe('configuration with noack prefetchCount and clustering consumer', () => {
    let moduleProducer: TestingModule;
    const consumers: { appConsumer: INestMicroservice; moduleConsumer: TestingModule }[] = [];
    const numberOfConsumers = 2;
    const testConfiguration: BuildClientModuleOptions = { prefetchCount: 3, noAck: false };
    beforeAll(async () => {
      moduleProducer = await setupProducer(testConfiguration);
      for (let i = 0; i < numberOfConsumers; i++) {
        consumers.push(await setupConsumer(testConfiguration, i));
      }
    });

    afterAll(() => {
      consumers.forEach((app) => {
        app.appConsumer.close();
      });
      moduleProducer.close();
    });

    it('should handle multiple sends with prefetch and ack', async () => {
      // Given
      const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
      // Then
      const results = await makeMultipleRequests(service.getConsumerWorkerId(false), 6);
      // Expect
      expect(results).toBeDefined();
      expect(results).toEqual(expect.arrayContaining([expect.objectContaining({ wokerId: 0 })]));
      expect(results).toEqual(expect.arrayContaining([expect.objectContaining({ wokerId: 1 })]));
    });
  });
});
