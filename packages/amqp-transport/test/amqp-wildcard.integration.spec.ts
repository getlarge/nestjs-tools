/* eslint-disable max-lines-per-function */
import { Controller } from '@nestjs/common';
import { ClientProxy, ClientsModule, EventPattern } from '@nestjs/microservices';
import { RQM_DEFAULT_NOACK, RQM_DEFAULT_PREFETCH_COUNT } from '@nestjs/microservices/constants';
import { Test } from '@nestjs/testing';
import { setTimeout } from 'node:timers/promises';

import { AmqpClient, AmqpOptions, AmqpServer } from '../src';
import { RMQ_URL } from './dummy.constants';

const EXCHANGE = 'wildcard-test-exchange';
const QUEUE = 'wildcard-test-queue';
const CLIENT = 'WILDCARD_CLIENT';

// Spies the test asserts against. One per handler.
const calls = {
  meta: [] as string[],
  clientsCatchAll: [] as string[],
  globalCatchAll: [] as string[],
  exact: [] as string[],
};

/**
 * Registration order is decorator order = the order @EventPattern is read by
 * Nest's MetadataScanner. This mirrors the real consumer controller:
 *  1. exact pattern
 *  2. specific-meta wildcard
 *  3. CLIENTS catch-all
 *  4. global catch-all (last, by design)
 */
@Controller()
class WildcardController {
  @EventPattern('topic.exact')
  onExact(payload: unknown) {
    calls.exact.push(`exact:${JSON.stringify(payload)}`);
  }

  @EventPattern('clients.*.$meta.#')
  onMeta(payload: unknown) {
    calls.meta.push(`meta:${JSON.stringify(payload)}`);
  }

  @EventPattern('clients.*.#')
  onClientsCatchAll(payload: unknown) {
    calls.clientsCatchAll.push(`clients:${JSON.stringify(payload)}`);
  }

  @EventPattern('*.#')
  onGlobalCatchAll(payload: unknown) {
    calls.globalCatchAll.push(`global:${JSON.stringify(payload)}`);
  }
}

const baseOptions: AmqpOptions = {
  urls: [RMQ_URL],
  queue: QUEUE,
  queueOptions: { durable: false, autoDelete: true },
  exchange: EXCHANGE,
  exchangeType: 'topic',
  exchangeOptions: { durable: false, autoDelete: true },
  prefetchCount: RQM_DEFAULT_PREFETCH_COUNT,
  noAck: RQM_DEFAULT_NOACK,
};

describe('AmqpServer wildcard routing (real broker)', () => {
  let consumerApp: Awaited<ReturnType<typeof startConsumer>>;
  let producerModule: Awaited<ReturnType<typeof startProducer>>;
  let client: ClientProxy;
  let server: AmqpServer;

  async function startConsumer() {
    const moduleRef = await Test.createTestingModule({
      controllers: [WildcardController],
    }).compile();
    server = new AmqpServer(baseOptions);
    const app = moduleRef.createNestMicroservice({ strategy: server });
    await app.listen();
    return app;
  }

  async function startProducer() {
    const moduleRef = await Test.createTestingModule({
      imports: [ClientsModule.register([{ name: CLIENT, customClass: AmqpClient, options: baseOptions }])],
    }).compile();
    return moduleRef;
  }

  beforeAll(async () => {
    consumerApp = await startConsumer();
    producerModule = await startProducer();
    client = producerModule.get<ClientProxy>(CLIENT);
    await client.connect();
    // Give the consumer a beat to bind queues.
    await setTimeout(200);
  });

  afterAll(async () => {
    await client.close();
    await producerModule.close();
    await consumerApp.close();
  });

  beforeEach(() => {
    calls.meta = [];
    calls.clientsCatchAll = [];
    calls.globalCatchAll = [];
    calls.exact = [];
  });

  const publish = async (pattern: string, payload: unknown) => {
    client.emit(pattern, payload);
    // Give RabbitMQ + Nest a moment to deliver and dispatch.
    await setTimeout(300);
  };

  it('logs the registration order so we can see what the Map looks like', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keys = [...(server as any).messageHandlers.keys()];
    // eslint-disable-next-line no-console
    console.log('Registered patterns (in order):', keys);
    expect(keys).toEqual(['topic.exact', 'clients.*.$meta.#', 'clients.*.#', '*.#']);
  });

  it('exact match always wins, regardless of catch-alls registered later', async () => {
    await publish('topic.exact', { kind: 'exact-topic' });
    expect(calls.exact).toHaveLength(1);
    expect(calls.meta).toHaveLength(0);
    expect(calls.clientsCatchAll).toHaveLength(0);
    expect(calls.globalCatchAll).toHaveLength(0);
  });

  it('clients.*.$meta.# wins over clients.*.# (registered first, both match)', async () => {
    await publish('clients.abc.$meta.firmware.version', { v: '1.2.3' });
    expect(calls.meta).toHaveLength(1);
    expect(calls.clientsCatchAll).toHaveLength(0);
    expect(calls.globalCatchAll).toHaveLength(0);
    expect(calls.exact).toHaveLength(0);
  });

  it('clients.*.# wins for clients.<id>.status - the global catch-all never sees it', async () => {
    await publish('clients.abc.status', { online: true });
    expect(calls.clientsCatchAll).toHaveLength(1);
    expect(calls.globalCatchAll).toHaveLength(0);
    expect(calls.meta).toHaveLength(0);
    expect(calls.exact).toHaveLength(0);
  });

  it('global catch-all *.# fires only when nothing more specific matches', async () => {
    await publish('something.else.entirely', { foo: 'bar' });
    expect(calls.globalCatchAll).toHaveLength(1);
    expect(calls.clientsCatchAll).toHaveLength(0);
    expect(calls.meta).toHaveLength(0);
    expect(calls.exact).toHaveLength(0);
  });

  it('one message = exactly one handler fired (no fan-out across overlapping patterns)', async () => {
    await publish('clients.xyz.status', { online: false });
    const totalCalls =
      calls.exact.length + calls.meta.length + calls.clientsCatchAll.length + calls.globalCatchAll.length;
    expect(totalCalls).toBe(1);
  });
});
