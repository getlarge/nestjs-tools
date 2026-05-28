/* eslint-disable max-lines-per-function */
import { MessageHandler } from '@nestjs/microservices';

import { AmqpServer } from './amqp-server';

class TestAmqpServer extends AmqpServer {
  register(pattern: string, handler: MessageHandler) {
    this.messageHandlers.set(pattern, handler);
  }
}

describe('AmqpServer.getHandlerByPattern - overlapping wildcards', () => {
  const makeServer = () =>
    new TestAmqpServer({
      urls: ['amqp://guest:guest@localhost:5672'],
      queue: 'unused-in-unit-test',
    });

  const handler = (label: string): MessageHandler => {
    const fn = (() => label) as unknown as MessageHandler;
    (fn as unknown as { label: string }).label = label;
    return fn;
  };

  it('exact match always wins over any wildcard, regardless of registration order', () => {
    const server = makeServer();
    const wildcardFirst = handler('_CLIENTS.#');
    const exact = handler('_CLIENTS.abc.status');
    server.register('_CLIENTS.#', wildcardFirst);
    server.register('_CLIENTS.abc.status', exact);

    const found = server.getHandlerByPattern('_CLIENTS.abc.status');
    expect(found).toBe(exact);
  });

  it('with two overlapping wildcards, the FIRST registered one wins - the second never fires', () => {
    const server = makeServer();
    const specific = handler('_CLIENTS.*.status');
    const broad = handler('_CLIENTS.#');
    // Order matters: specific is registered first
    server.register('_CLIENTS.*.status', specific);
    server.register('_CLIENTS.#', broad);

    expect(server.getHandlerByPattern('_CLIENTS.abc.status')).toBe(specific);
    // Topic the broad pattern *also* matches, but specific doesn't:
    expect(server.getHandlerByPattern('_CLIENTS.abc.connected')).toBe(broad);
  });

  it('reversing registration order changes which handler "wins" for overlapping topics', () => {
    const server = makeServer();
    const broad = handler('_CLIENTS.#');
    const specific = handler('_CLIENTS.*.status');
    // Order reversed: broad is registered first
    server.register('_CLIENTS.#', broad);
    server.register('_CLIENTS.*.status', specific);

    // Now the broad handler steals every _CLIENTS.* message,
    // including ones the more specific pattern was meant to catch.
    expect(server.getHandlerByPattern('_CLIENTS.abc.status')).toBe(broad);
    expect(server.getHandlerByPattern('_CLIENTS.abc.connected')).toBe(broad);
  });

  it('returns exactly one handler - no fan-out to additional matching wildcards', () => {
    const server = makeServer();
    const a = handler('_CLIENTS.*.status');
    const b = handler('_CLIENTS.#');
    const c = handler('#');
    server.register('_CLIENTS.*.status', a);
    server.register('_CLIENTS.#', b);
    server.register('#', c);

    // Three patterns all match _CLIENTS.abc.status. We get only the first one.
    expect(server.getHandlerByPattern('_CLIENTS.abc.status')).toBe(a);
  });
});
