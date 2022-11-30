/* eslint-disable max-lines */
/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
import { DynamicModule, INestMicroservice } from '@nestjs/common/interfaces';
import { ClientsModule } from '@nestjs/microservices';
import { RQM_DEFAULT_NOACK, RQM_DEFAULT_PREFETCH_COUNT } from '@nestjs/microservices/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Options } from 'amqplib';

import { AmqpClient, AmqpOptions, AmqpServer } from '../src';
import { DUMMY_CLIENT, DUMMY_QUEUE, RMQ_URL } from './dummy/dummy.constants';
import { DummyConsumerController } from './dummy/dummy-consumer.controller';
import { DummyProducerService } from './dummy/dummy-producer.service';

interface Closeable {
  close: () => Promise<any>;
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
      durable: true,
      autoDelete: true,
    },
    replyQueue: opts.replyQueue || '',
    replyQueueOptions: opts.replyQueueOptions || {
      autoDelete: true,
    },
    prefetchCount: opts.prefetchCount || RQM_DEFAULT_PREFETCH_COUNT,
    noAck: opts.noAck ?? RQM_DEFAULT_NOACK,
  };
  // console.warn('producer options', options);
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
      durable: true,
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
  // console.warn('consumer options', options.options);

  const appConsumer = moduleConsumer.createNestMicroservice(options);
  await appConsumer.listen();
  openConnections.push(appConsumer);
  return { moduleConsumer, appConsumer };
};

const setupProducer = async (testConfiguration: BuildClientModuleOptions = {}) => {
  const moduleProducer = await Test.createTestingModule({
    imports: [buildClientModule(testConfiguration)],
    providers: [DummyProducerService],
  }).compile();
  openConnections.push(moduleProducer);
  return moduleProducer;
};

const message = 'hello consumer';

const makeMultipleRequests = <T>(f: () => Promise<T>, n: number) => {
  const fns = [...Array(n)].map(() => f());
  return Promise.all(fns);
};

interface SetupAllOptions {
  consumersCount?: number;
  testConfiguration?: BuildClientModuleOptions;
}

const setupAll = async (options: SetupAllOptions = {}) => {
  const { testConfiguration = {}, consumersCount = 1 } = options;
  const moduleProducer = await setupProducer(testConfiguration);
  const consumers: { appConsumer: INestMicroservice; moduleConsumer: TestingModule }[] = [];
  for (let i = 0; i < consumersCount; i++) {
    const consumer = await setupConsumer(options.testConfiguration, i);
    consumers.push(consumer);
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { moduleProducer, consumers };
};

const closeAll = async () => {
  // console.log(openConnections.length);
  await Promise.all(openConnections.map((c) => c.close()));
  // try {
  //   await Promise.all(
  //     args.map((c, i) => {
  //       console.log(i);
  //       return c.close();
  //     }),
  //   );
  // } catch (e) {
  //   console.error(e);
  // }

  openConnections = [];
};

//! TODO: check that controller aka consumers are called as expected
describe('AMQP tests', () => {
  const spy = jest.spyOn(DummyConsumerController.prototype, 'emptySpy');

  afterEach(async () => {
    //! give time for messages to be published / received
    spy.mockClear();
    await new Promise((resolve) => setTimeout(resolve, 250));
    await closeAll();
  });

  it('AMQP clients should be defined', async () => {
    const {
      moduleProducer,
      consumers: [{ moduleConsumer }],
    } = await setupAll();

    const clientProducer = moduleProducer.get(DUMMY_CLIENT);
    const clientConsumer = moduleConsumer.get(DummyConsumerController);

    expect(clientProducer).toBeDefined();
    expect(clientConsumer).toBeDefined();
  });

  it('should request response with basic configuration', async () => {
    // Given
    const { moduleProducer } = await setupAll();
    const msg = { message };
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);

    // Then
    const result = await service.test(msg);
    expect(result).toBeDefined();
    expect(result).toEqual(msg);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: msg }));
  });

  it('should request response with basic configuration multiple messages', async () => {
    // Given
    const { moduleProducer } = await setupAll();
    const msg = { message };
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test(msg), 5);
    // Expect
    expect(results).toBeDefined();
    expect(results.length).toBe(5);
    results.forEach((r) => {
      expect(r).toEqual(msg);
    });
    expect(spy).toBeCalledTimes(5);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: msg }));
  });

  it('should request response with automatic ack', async () => {
    // Given
    const { moduleProducer } = await setupAll({ testConfiguration: { noAck: false } });
    const msg = { message };
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const result = await service.test(msg, false);
    expect(result).toBeDefined();
    expect(result).toEqual(msg);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: msg }));
  });

  it('should request response multiple sends with automatic ack', async () => {
    // Given
    const { moduleProducer } = await setupAll({ testConfiguration: { noAck: false } });
    const msg = { message };
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test({ message }, false), 5);
    // Expect
    expect(results).toBeDefined();
    expect(results.length).toBe(5);
    results.forEach((r) => {
      expect(r).toEqual(msg);
    });
    expect(spy).toHaveBeenCalledTimes(5);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: msg }));
  });

  // // describe('configuration with prefetch non zero noack', () => {
  // //   let moduleProducer: TestingModule;
  // //   let appConsumer: INestMicroservice;
  // //   const testConfiguration: BuildClientModuleOptions = { prefetchCount: 5 };

  // //   beforeAll(async () => {
  // //     moduleProducer = await setupProducer(testConfiguration);
  // //     ({ appConsumer } = await setupConsumer(testConfiguration));
  // //   });

  // //   afterAll(() => {
  // //     appConsumer.close();
  // //     moduleProducer.close();
  // //   });
  it('should request response with manual ack', async () => {
    // Given
    const msg = { message };
    const { moduleProducer } = await setupAll({ testConfiguration: { noAck: true } });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const result = await service.test(msg, true);
    expect(result).toBeDefined();
    expect(result).toEqual(msg);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: msg }));
  });

  it('should handle multiple sends with manual ack', async () => {
    // Given
    const msg = { message };
    const { moduleProducer } = await setupAll({ testConfiguration: { noAck: true } });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test(msg, true), 5);
    // Expect
    expect(results).toBeDefined();
    expect(results.length).toBe(5);
    results.forEach((r) => {
      expect(r).toEqual(msg);
    });
    expect(spy).toHaveBeenCalledTimes(5);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: msg }));
  });

  it('should handle multiple sends with manual ack and prefetchCount set to 5', async () => {
    // Given
    const msg = { message };
    const { moduleProducer } = await setupAll({
      testConfiguration: { noAck: true, prefetchCount: 5 },
    });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test(msg, true), 10);
    // Expect
    expect(results).toBeDefined();
    expect(results.length).toBe(10);
    results.forEach((r) => {
      expect(r).toEqual(msg);
    });
    expect(spy).toHaveBeenCalledTimes(10);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: msg }));
  });

  // // describe('configuration with prefetch non zero ack', () => {
  // //   let moduleProducer: TestingModule;
  // //   let appConsumer: INestMicroservice;
  // //   const testConfiguration: BuildClientModuleOptions = { prefetchCount: 3, noAck: false };

  // //   beforeAll(async () => {
  // //     moduleProducer = await setupProducer(testConfiguration);
  // //     ({ appConsumer } = await setupConsumer(testConfiguration));
  // //   });

  // //   afterAll(() => {
  // //     appConsumer.close();
  // //     moduleProducer.close();
  // //   });
  it('should handle multiple sends with prefetch non zero and automatic ack', async () => {
    // Given
    const msg = { message };
    const { moduleProducer } = await setupAll({
      testConfiguration: { noAck: false, prefetchCount: 5 },
    });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const result = await service.test(msg, false);
    expect(result).toBeDefined();
    expect(result).toEqual(msg);
  });

  it('should handle multiple sends with prefetch and automatic ack', async () => {
    // Given
    const msg = { message };
    const { moduleProducer } = await setupAll({
      testConfiguration: { noAck: false, prefetchCount: 5, isGlobalPrefetchCount: true },
    });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test(msg, false), 5);
    // Expect
    expect(results).toBeDefined();
    expect(results.length).toBe(5);
    results.forEach((r) => {
      expect(r).toEqual(msg);
    });
  });

  it('should handle multiple sends with ack greater prefetchCount', async () => {
    // Given
    const msg = { message };
    const { moduleProducer } = await setupAll({
      testConfiguration: { noAck: false, prefetchCount: 5, isGlobalPrefetchCount: true },
    });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.test(msg, false), 10);
    // Expect
    expect(results).toBeDefined();
    results.forEach((r) => {
      expect(r).toEqual(msg);
    });
  });

  it('should handle multiple sends with prefetch and noack', async () => {
    // Given
    const { moduleProducer } = await setupAll({
      testConfiguration: { noAck: true, prefetchCount: 1 },
      consumersCount: 2,
    });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(() => service.getConsumerWorkerId(true), 20);
    // Expect
    expect(results).toBeDefined();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ workerId: 0 }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ workerId: 1 }));
  });
});
