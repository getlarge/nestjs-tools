/* eslint-disable max-nested-callbacks */
/* eslint-disable max-lines-per-function */
import { DynamicModule, INestMicroservice } from '@nestjs/common/interfaces';
import { ClientsModule } from '@nestjs/microservices';
import {
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_NOACK,
  RQM_DEFAULT_PREFETCH_COUNT,
} from '@nestjs/microservices/constants';
import { Test, TestingModule } from '@nestjs/testing';

import { AmqpClient, AmqpOptions, AmqpServer } from '../src';
import { DUMMY_CLIENT, DUMMY_QUEUE, DUMMY_REPLY_QUEUE, RMQ_URL } from './dummy/dummy.constants';
import { DummyConsumerController } from './dummy/dummy-consumer.controller';
import { DummyProducerService } from './dummy/dummy-producer.service';

let openConnections: Closeable[] = [];
interface BuildClientModuleOptions {
  prefetchCount?: number;
  replyQueue?: string;
  queue?: string;
  noAck?: boolean;
  url?: string;
  brokerUrl?: string;
  isGlobalPrefetchCount?: boolean;
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

const createNestMicroserviceOptions = (options: AmqpOptions = {}) => {
  const baseOptions: AmqpOptions = {
    prefetchCount: RQM_DEFAULT_PREFETCH_COUNT,
    replyQueue: DUMMY_REPLY_QUEUE,
    noAck: RQM_DEFAULT_NOACK,
    queue: DUMMY_QUEUE,
    urls: [RMQ_URL],
    isGlobalPrefetchCount: RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
    queueOptions: {
      durable: true,
      exclusive: false,
    },
    persistent: true,
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
  const appConsumer = moduleConsumer.createNestMicroservice(createNestMicroserviceOptions(testConfiguration));
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

const makeMultipleRequests = <T>(f: Promise<T>, n = 5) => {
  const promises: Promise<T>[] = [];
  for (let i = 0; i < n; i++) {
    promises.push(f);
  }
  return Promise.all(promises);
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
    await (async (index: number) => {
      consumers.push(await setupConsumer(options.testConfiguration, index));
    })(i);
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { moduleProducer, consumers };
};

interface Closeable {
  close: () => Promise<any>;
}

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

describe('AMQP tests', () => {
  // afterAll(async () => {
  //   await deleteQueues();
  // });

  afterEach(async () => {
    await closeAll();
    await new Promise((resolve) => setTimeout(resolve, 0));
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

    // await closeAll(moduleConsumer, appConsumer);
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
    // await closeAll(appConsumer, moduleProducer);
  });

  it('should request resposne with basic configuration multiple messages', async () => {
    // Given
    const { moduleProducer } = await setupAll();
    const msg = { message };
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(service.test(msg));
    // Expect
    expect(results).toBeDefined();
    results.forEach((r) => {
      expect(r).toEqual(msg);
    });
    // await closeAll(appConsumer, moduleProducer);
  });

  it('should request response with ack', async () => {
    // Given
    const { moduleProducer } = await setupAll({ testConfiguration: { noAck: false } });
    const msg = { message };
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const result = await service.test(msg, false);
    expect(result).toBeDefined();
    expect(result).toEqual(msg);
    // await closeAll(appConsumer, moduleProducer);
  });

  it('should request response multiple sends with ack', async () => {
    // Given
    const { moduleProducer } = await setupAll({ testConfiguration: { noAck: false } });
    const msg = { message };
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(service.test({ message }, false));
    // Expect
    expect(results).toBeDefined();
    results.forEach((r) => {
      expect(r).toEqual(msg);
    });
    // await closeAll(appConsumer, moduleProducer);
  });

  // describe('configuration with prefetch non zero noack', () => {
  //   let moduleProducer: TestingModule;
  //   let appConsumer: INestMicroservice;
  //   const testConfiguration: BuildClientModuleOptions = { prefetchCount: 5 };

  //   beforeAll(async () => {
  //     moduleProducer = await setupProducer(testConfiguration);
  //     ({ appConsumer } = await setupConsumer(testConfiguration));
  //   });

  //   afterAll(() => {
  //     appConsumer.close();
  //     moduleProducer.close();
  //   });
  it('should request response with noack', async () => {
    // Given
    const msg = { message };
    const { moduleProducer } = await setupAll({ testConfiguration: { noAck: true } });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const result = await service.test(msg, true);
    expect(result).toBeDefined();
    expect(result).toEqual(msg);
  });

  it('should handle multiple sends with noack', async () => {
    // Given
    const msg = { message };
    const { moduleProducer } = await setupAll({ testConfiguration: { noAck: true } });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(service.test(msg, true));
    // Expect
    expect(results).toBeDefined();
    results.forEach((r) => {
      expect(r).toEqual(msg);
    });
  });

  it('should handle multiple sends with noack greater prefetchCount', async () => {
    // Given
    const msg = { message };
    const { moduleProducer } = await setupAll({
      testConfiguration: { noAck: true, prefetchCount: 5, isGlobalPrefetchCount: true },
    });

    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(service.test(msg, true), 10);
    // Expect
    expect(results).toBeDefined();
    results.forEach((r) => {
      expect(r).toEqual(msg);
    });
  });

  // describe('configuration with prefetch non zero ack', () => {
  //   let moduleProducer: TestingModule;
  //   let appConsumer: INestMicroservice;
  //   const testConfiguration: BuildClientModuleOptions = { prefetchCount: 3, noAck: false };

  //   beforeAll(async () => {
  //     moduleProducer = await setupProducer(testConfiguration);
  //     ({ appConsumer } = await setupConsumer(testConfiguration));
  //   });

  //   afterAll(() => {
  //     appConsumer.close();
  //     moduleProducer.close();
  //   });
  it('should handle multiple sends with prefetch non zero and ack', async () => {
    // Given
    const msg = { message };
    const { moduleProducer } = await setupAll({
      testConfiguration: { noAck: false, prefetchCount: 5, isGlobalPrefetchCount: true },
    });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const result = await service.test(msg, false);
    expect(result).toBeDefined();
    expect(result).toEqual(msg);
  });

  it('should handle multiple sends with prefetch and ack', async () => {
    // Given
    const msg = { message };
    const { moduleProducer } = await setupAll({
      testConfiguration: { noAck: false, prefetchCount: 5, isGlobalPrefetchCount: true },
    });
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
    const { moduleProducer } = await setupAll({
      testConfiguration: { noAck: false, prefetchCount: 5, isGlobalPrefetchCount: true },
    });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(service.test(msg, false), 10);
    // Expect
    expect(results).toBeDefined();
    results.forEach((r) => {
      expect(r).toEqual(msg);
    });
  });
  // });

  // describe('configuration with noack prefetchCount and clustering consumer', () => {
  //   let moduleProducer: TestingModule;
  //   const consumers: { appConsumer: INestMicroservice; moduleConsumer: TestingModule }[] = [];
  //   const numberOfConsumers = 2;
  //   const testConfiguration: BuildClientModuleOptions = { prefetchCount: 1, noAck: true };

  //   beforeAll(async () => {
  //     try {
  //       moduleProducer = await setupProducer(testConfiguration);
  //       for (let i = 0; i < numberOfConsumers; i++) {
  //         await (async (index: number) => {
  //           consumers.push(await setupConsumer(testConfiguration, index));
  //         })(i);
  //       }
  //     } catch (beforeAllException) {
  //       console.error({ beforeAllException });
  //       throw beforeAllException;
  //     }
  //     // await new Promise((resolve) => setTimeout(resolve, 10));
  //   });

  //   afterAll(() => {
  //     try {
  //       consumers.forEach((app) => {
  //         app.appConsumer.close();
  //       });
  //       moduleProducer.close();
  //     } catch (afterAllException) {
  //       console.error({ afterAllException });
  //     }
  //   });

  it('should handle multiple sends with prefetch and ack', async () => {
    // Given
    const { moduleProducer } = await setupAll({
      testConfiguration: { noAck: true, prefetchCount: 1, isGlobalPrefetchCount: true },
    });
    const service = moduleProducer.get<DummyProducerService>(DummyProducerService);
    // Then
    const results = await makeMultipleRequests(service.getConsumerWorkerId(true), 20);
    // console.log(results.map((r) => r.workerId));
    // Expect
    expect(results).toBeDefined();
    expect(results).toEqual(expect.arrayContaining([expect.objectContaining({ workerId: 0 })]));
    expect(results).toEqual(expect.arrayContaining([expect.objectContaining({ workerId: 1 })]));
  });
  // });
});
