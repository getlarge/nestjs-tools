/* eslint-disable max-lines */
/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
import { DynamicModule, INestMicroservice } from '@nestjs/common/interfaces';
import { ClientsModule } from '@nestjs/microservices';
import { RQM_DEFAULT_NOACK, RQM_DEFAULT_PREFETCH_COUNT } from '@nestjs/microservices/constants';
import { Test, TestingModule } from '@nestjs/testing';
import type { Options } from 'amqplib';
import { setTimeout } from 'node:timers/promises';

import { AmqpClient, AmqpOptions, AmqpServer } from '../src';
import { DUMMY_CLIENT, DUMMY_QUEUE, RMQ_URL } from './dummy.constants';
import { DummyConsumerController } from './dummy-consumer.controller.mock';
import { DummyProducerService } from './dummy-producer.service.mock';

interface Closeable {
  close: () => Promise<unknown>;
}

let openConnections: Closeable[] = [];

interface BuildClientModuleOptions {
  brokerUrl?: string;
  prefetchCount?: number;
  isGlobalPrefetchCount?: boolean;
  queue?: string;
  queueOptions?: Options.AssertQueue;
  replyQueue?: string;
  replyQueueOptions?: Options.AssertQueue;
  noAck?: boolean;
  url?: string;
}

const buildClientModule = (opts: BuildClientModuleOptions = {}): DynamicModule => {
  const options: AmqpOptions = {
    urls: [opts.brokerUrl || RMQ_URL],
    queue: opts.queue || DUMMY_QUEUE,
    queueOptions: opts.queueOptions || {
      durable: false,
      autoDelete: true,
    },
    replyQueue: opts.replyQueue || '',
    replyQueueOptions: opts.replyQueueOptions || {
      durable: false,
      autoDelete: true,
    },
    prefetchCount: opts.prefetchCount || RQM_DEFAULT_PREFETCH_COUNT,
    noAck: opts.noAck ?? RQM_DEFAULT_NOACK,
  };
  return ClientsModule.register([
    {
      name: DUMMY_CLIENT,
      customClass: AmqpClient,
      options,
    },
  ]);
};

const createNestMicroserviceOptions = (options: AmqpOptions = {}) => {
  const baseOptions: AmqpOptions = {
    urls: [RMQ_URL],
    queue: DUMMY_QUEUE,
    queueOptions: {
      durable: false,
      autoDelete: true,
    },
    // persistent: true,
    prefetchCount: RQM_DEFAULT_PREFETCH_COUNT,
    noAck: RQM_DEFAULT_NOACK,
    deleteChannelOnFailure: true,
    ...options,
  };
  return {
    strategy: new AmqpServer(baseOptions),
    options: baseOptions,
  };
};

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
  const options = createNestMicroserviceOptions(testConfiguration);
  const appConsumer = moduleConsumer.createNestMicroservice(options);
  await appConsumer.listen();
  openConnections.push(appConsumer);
  return { moduleConsumer, appConsumer };
};

const setupProducer = async (testConfiguration: BuildClientModuleOptions = {}, workerId = 0) => {
  const moduleProducer = await Test.createTestingModule({
    imports: [buildClientModule(testConfiguration)],
    providers: [
      DummyProducerService,
      {
        provide: 'WORKER_ID',
        useValue: workerId,
      },
    ],
  }).compile();
  openConnections.push(moduleProducer);
  return moduleProducer;
};

const makeMultipleRequests = <T>(f: () => Promise<T>, n: number) => {
  const fns = [...Array(n)].map(() => f());
  return Promise.all(fns);
};

interface SetupAllOptions {
  consumersCount?: number;
  producersCount?: number;
  testConfiguration?: BuildClientModuleOptions;
}

const setupAll = async (options: SetupAllOptions = {}) => {
  const { testConfiguration = {}, consumersCount = 1, producersCount = 1 } = options;
  const consumers: { appConsumer: INestMicroservice; moduleConsumer: TestingModule }[] = [];
  const producers: TestingModule[] = [];
  for (let i = 0; i < producersCount; i++) {
    const producer = await setupProducer(testConfiguration, i);
    producers.push(producer);
  }
  for (let i = 0; i < consumersCount; i++) {
    const consumer = await setupConsumer(testConfiguration, i);
    consumers.push(consumer);
  }
  await setTimeout(0);
  return { producers, consumers };
};

const closeAll = async () => {
  await Promise.all(openConnections.map((c) => c.close()));
  openConnections = [];
};

describe('AMQP tests', () => {
  const message = 'hello consumer';
  const spy = jest.spyOn(DummyConsumerController.prototype, 'emptySpy');

  afterEach(async () => {
    //! give time for messages to be published / received
    spy.mockClear();
    await setTimeout(500);
    await closeAll();
  });

  it('AMQP clients should be defined', async () => {
    const {
      producers: [moduleProducer],
      consumers: [{ moduleConsumer }],
    } = await setupAll();

    const clientProducer = moduleProducer.get(DUMMY_CLIENT);
    const clientConsumer = moduleConsumer.get(DummyConsumerController);

    expect(clientProducer).toBeDefined();
    expect(clientConsumer).toBeDefined();
  });

  it('should request response with basic configuration', async () => {
    // Given
    const {
      producers: [moduleProducer],
    } = await setupAll();
    const msg = { message };
    const service = moduleProducer.get(DummyProducerService);

    // Then
    const result = await service.test(msg);
    expect(result).toBeDefined();
    expect(result).toEqual(expect.objectContaining(msg));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining(msg) }));
  });

  it('should request response with basic configuration multiple messages', async () => {
    // Given
    const {
      producers: [moduleProducer],
    } = await setupAll();
    const msg = { message };
    const service = moduleProducer.get(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test(msg), 5);
    // Expect
    expect(results).toBeDefined();
    expect(results.length).toBe(5);
    results.forEach((r) => {
      expect(r).toEqual(expect.objectContaining(msg));
    });
    expect(spy).toHaveBeenCalledTimes(results.length);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining(msg) }));
  });

  it('should request response with automatic ack', async () => {
    // Given
    const noAck = false;
    const {
      producers: [moduleProducer],
    } = await setupAll({ testConfiguration: { noAck } });
    const msg = { message };
    const service = moduleProducer.get(DummyProducerService);
    // Then
    const result = await service.test(msg, noAck);
    expect(result).toBeDefined();
    expect(result).toEqual(expect.objectContaining(msg));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining(msg) }));
  });

  it('should request response multiple sends with automatic ack', async () => {
    // Given
    const noAck = false;
    const {
      producers: [moduleProducer],
    } = await setupAll({ testConfiguration: { noAck } });
    const msg = { message };
    const service = moduleProducer.get(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test({ message }, noAck), 5);
    // Expect
    expect(results).toBeDefined();
    expect(results.length).toBe(5);
    results.forEach((r) => {
      expect(r).toEqual(expect.objectContaining(msg));
    });
    expect(spy).toHaveBeenCalledTimes(results.length);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining(msg) }));
  });

  it('should request response with manual ack', async () => {
    // Given
    const noAck = true;
    const msg = { message };
    const {
      producers: [moduleProducer],
    } = await setupAll({ testConfiguration: { noAck } });
    const service = moduleProducer.get(DummyProducerService);
    // Then
    const result = await service.test(msg, noAck);
    expect(result).toBeDefined();
    expect(result).toEqual(expect.objectContaining(msg));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining(msg) }));
  });

  it('should handle multiple sends with manual ack', async () => {
    // Given
    const noAck = true;
    const msg = { message };
    const {
      producers: [moduleProducer],
    } = await setupAll({ testConfiguration: { noAck } });
    const service = moduleProducer.get(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test(msg, noAck), 5);
    // Expect
    expect(results).toBeDefined();
    expect(results.length).toBe(5);
    results.forEach((r) => {
      expect(r).toEqual(expect.objectContaining(msg));
    });
    expect(spy).toHaveBeenCalledTimes(results.length);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining(msg) }));
  });

  it('should handle multiple sends with manual ack and prefetchCount set to 5', async () => {
    // Given
    const noAck = true;
    const msg = { message };
    const {
      producers: [moduleProducer],
    } = await setupAll({
      testConfiguration: { noAck, prefetchCount: 5 },
    });
    const service = moduleProducer.get(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test(msg, noAck), 10);
    // Expect
    expect(results).toBeDefined();
    expect(results.length).toBe(10);
    results.forEach((r) => {
      expect(r).toEqual(expect.objectContaining(msg));
    });
    expect(spy).toHaveBeenCalledTimes(results.length);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining(msg) }));
  });

  it('should handle multiple sends with prefetch non zero and automatic ack', async () => {
    // Given
    const noAck = false;
    const msg = { message };
    const {
      producers: [moduleProducer],
    } = await setupAll({
      testConfiguration: { noAck, prefetchCount: 5 },
    });
    const service = moduleProducer.get(DummyProducerService);
    // Then
    const result = await service.test(msg, noAck);
    expect(result).toBeDefined();
    expect(result).toEqual(expect.objectContaining(msg));
  });

  it('should handle multiple sends with prefetch and automatic ack', async () => {
    // Given
    const noAck = false;
    const msg = { message };
    const {
      producers: [moduleProducer],
    } = await setupAll({
      testConfiguration: { noAck, prefetchCount: 5, isGlobalPrefetchCount: true },
    });
    const service = moduleProducer.get(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test(msg, noAck), 5);
    // Expect
    expect(results).toBeDefined();
    expect(results.length).toBe(5);
    results.forEach((r) => {
      expect(r).toEqual(expect.objectContaining(msg));
    });
  });

  it('should handle multiple sends with automatic ack and message count greater than prefetchCount', async () => {
    // Given
    const noAck = false;
    const msg = { message };
    const {
      producers: [moduleProducer],
    } = await setupAll({
      testConfiguration: { noAck, prefetchCount: 5, isGlobalPrefetchCount: true },
    });
    const service = moduleProducer.get(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test(msg, noAck), 5);
    // Expect
    expect(results).toBeDefined();
    results.forEach((r) => {
      expect(r).toEqual(expect.objectContaining(msg));
    });
  });

  it('should spread load on 2 consumers with prefetch set to 1 and manual ack', async () => {
    // Given
    const noAck = true;
    const {
      producers: [moduleProducer],
    } = await setupAll({
      testConfiguration: { noAck, prefetchCount: 1 },
      consumersCount: 2,
    });
    const service = moduleProducer.get(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.getConsumerWorkerId(noAck), 20);
    // Expect
    expect(results).toBeDefined();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ workerId: 0 }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ workerId: 1 }));
  });

  it('should respond to the right producer with prefetch set to 1 and manual ack', async () => {
    // Given
    const noAck = true;
    const msg = { message };
    const {
      producers: [moduleProducer1, moduleProducer2],
    } = await setupAll({
      testConfiguration: { noAck, prefetchCount: 1 },
      producersCount: 2,
    });
    const service1 = moduleProducer1.get(DummyProducerService);
    const service2 = moduleProducer2.get(DummyProducerService);
    // Then
    const resultsMatrix = await Promise.all([
      makeMultipleRequests(() => service1.test(msg, noAck), 10),
      makeMultipleRequests(() => service2.test(msg, noAck), 10),
    ]);
    // Expect
    expect(resultsMatrix.length).toBe(2);
    expect(resultsMatrix[0].length).toBe(10);
    expect(resultsMatrix[1].length).toBe(10);
    resultsMatrix[0].forEach((r) => {
      expect(r).toHaveProperty('producerId');
      expect(r.producerId).toEqual(0);
    });
    resultsMatrix[1].forEach((r) => {
      expect(r).toHaveProperty('producerId');
      expect(r.producerId).toEqual(1);
    });
  });

  it('should respond to the right producer with prefetch set to 1, exclusive reply queue and manual ack', async () => {
    // Given
    const noAck = true;
    const msg = { message };
    const {
      producers: [moduleProducer1, moduleProducer2],
    } = await setupAll({
      testConfiguration: {
        noAck,
        prefetchCount: 1,
        replyQueueOptions: { exclusive: true, autoDelete: true, durable: false },
      },
      producersCount: 2,
    });
    const service1 = moduleProducer1.get(DummyProducerService);
    const service2 = moduleProducer2.get(DummyProducerService);
    // Then
    const resultsMatrix = await Promise.all([
      makeMultipleRequests(() => service1.test(msg, noAck), 10),
      makeMultipleRequests(() => service2.test(msg, noAck), 10),
    ]);
    // Expect
    expect(resultsMatrix.length).toBe(2);
    expect(resultsMatrix[0].length).toBe(10);
    expect(resultsMatrix[1].length).toBe(10);
    resultsMatrix[0].forEach((r) => {
      expect(r).toHaveProperty('producerId');
      expect(r.producerId).toEqual(0);
    });
    resultsMatrix[1].forEach((r) => {
      expect(r).toHaveProperty('producerId');
      expect(r.producerId).toEqual(1);
    });
  });

  it('should reply to single producer with fixed replyQueue name ', async () => {
    // Given
    const noAck = true;
    const msg = { message };
    const {
      producers: [moduleProducer1],
    } = await setupAll({
      testConfiguration: {
        noAck,
        prefetchCount: 1,
        replyQueue: 'testingSingleQueue',
      },
      producersCount: 1,
    });
    const service1 = moduleProducer1.get(DummyProducerService);
    // Then
    const resultsMatrix = await Promise.all([makeMultipleRequests(() => service1.test(msg, noAck), 10)]);
    // Expect
    expect(resultsMatrix.length).toBe(1);
    expect(resultsMatrix[0].length).toBe(10);
    resultsMatrix[0].forEach((r) => {
      expect(r).toHaveProperty('producerId');
      expect(r.producerId).toEqual(0);
    });
  });

  it('should timeout with multiple producer with identical replyQueue name', async () => {
    // Given
    const noAck = true;
    const msg = { message };
    try {
      const {
        producers: [moduleProducer1, moduleProducer2],
      } = await setupAll({
        testConfiguration: {
          noAck,
          prefetchCount: 1,
          replyQueue: 'testingMultipleQueues',
        },
        producersCount: 2,
      });
      const service1 = moduleProducer1.get(DummyProducerService);
      const service2 = moduleProducer2.get(DummyProducerService);
      // Then
      await Promise.all([
        makeMultipleRequests(() => service1.test(msg, noAck), 5),
        makeMultipleRequests(() => service2.test(msg, noAck), 5),
      ]);
    } catch (ex) {
      // Expect
      expect(ex).toBeDefined();
      expect(ex).toEqual('TimeoutError');
    }
  }, 8000);
});
