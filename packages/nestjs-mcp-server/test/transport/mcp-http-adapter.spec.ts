import 'reflect-metadata';

import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';

import { ExpressMcpAdapter, FastifyMcpAdapter, resolveMcpHttpAdapter } from '../../src';

describe('resolveMcpHttpAdapter', () => {
  it('returns the Fastify adapter when given a FastifyAdapter', () => {
    const adapter = new FastifyAdapter();
    const resolved = resolveMcpHttpAdapter(adapter);
    expect(resolved).toBeInstanceOf(FastifyMcpAdapter);
  });

  it('returns the Express adapter when given an ExpressAdapter', () => {
    const adapter = new ExpressAdapter();
    const resolved = resolveMcpHttpAdapter(adapter);
    expect(resolved).toBeInstanceOf(ExpressMcpAdapter);
  });

  it('throws for an unknown HTTP adapter', () => {
    const stub = { someUnknownThing: true };
    expect(() => resolveMcpHttpAdapter(stub as never)).toThrow(/unsupported/i);
  });
});
