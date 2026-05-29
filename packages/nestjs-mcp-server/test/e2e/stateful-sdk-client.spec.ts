import 'reflect-metadata';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as express from 'express';
import { z } from 'zod';

import { McpModule, McpTool } from '../../src';

@Injectable()
class CounterTools {
  private count = 0;

  @McpTool({
    name: 'increment',
    inputSchema: z.object({}),
    outputSchema: z.object({ count: z.number() }),
  })
  async increment(): Promise<{ count: number }> {
    this.count++;
    return { count: this.count };
  }
}

@Module({
  imports: [
    McpModule.forRoot({
      serverInfo: { name: 'stateful-test', version: '0.1.0' },
      transport: { type: 'http', path: '/mcp' },
    }),
  ],
  providers: [CounterTools],
})
class StatefulModule {}

async function startFastify(): Promise<{
  app: NestFastifyApplication;
  port: number;
}> {
  const app = await NestFactory.create<NestFastifyApplication>(
    StatefulModule,
    new FastifyAdapter()
  );
  await app.listen(0);
  return {
    app,
    port: (app.getHttpServer().address() as { port: number }).port,
  };
}

async function startExpress(): Promise<{
  app: NestExpressApplication;
  port: number;
}> {
  const app = await NestFactory.create<NestExpressApplication>(
    StatefulModule,
    new ExpressAdapter(express())
  );
  await app.listen(0);
  return {
    app,
    port: (app.getHttpServer().address() as { port: number }).port,
  };
}

let fastifyState: { app: NestFastifyApplication; port: number };
let expressState: { app: NestExpressApplication; port: number };

beforeAll(async () => {
  fastifyState = await startFastify();
  expressState = await startExpress();
}, 30_000);

afterAll(async () => {
  await fastifyState.app.close();
  await expressState.app.close();
});

describe('Stateful StreamableHTTP on Fastify', () => {
  const url = (): URL => new URL(`http://127.0.0.1:${fastifyState.port}/mcp`);

  it('issues a session id on initialize and reuses it across calls', async () => {
    const transport = new StreamableHTTPClientTransport(url());
    const client = new Client({ name: 'test', version: '0.0.1' });
    await client.connect(transport);
    const sessionId = transport.sessionId;
    expect(sessionId).toBeDefined();
    expect(sessionId).toMatch(/[0-9a-f-]{20,}/i);

    const first = await client.callTool({
      name: 'increment',
      arguments: {},
    });
    const second = await client.callTool({
      name: 'increment',
      arguments: {},
    });
    expect(first.structuredContent).toEqual({ count: 1 });
    expect(second.structuredContent).toEqual({ count: 2 });
    await client.close();
  });

  it('issues distinct session ids per client', async () => {
    const a = new StreamableHTTPClientTransport(url());
    const b = new StreamableHTTPClientTransport(url());
    const clientA = new Client({ name: 'a', version: '0.0.1' });
    const clientB = new Client({ name: 'b', version: '0.0.1' });
    await clientA.connect(a);
    await clientB.connect(b);
    expect(a.sessionId).toBeDefined();
    expect(b.sessionId).toBeDefined();
    expect(a.sessionId).not.toBe(b.sessionId);
    await clientA.close();
    await clientB.close();
  });
});

describe('Stateful StreamableHTTP on Express', () => {
  const url = (): URL => new URL(`http://127.0.0.1:${expressState.port}/mcp`);

  it('round-trips a session id across calls on Express', async () => {
    const transport = new StreamableHTTPClientTransport(url());
    const client = new Client({ name: 'test', version: '0.0.1' });
    await client.connect(transport);
    expect(transport.sessionId).toBeDefined();
    const first = await client.callTool({
      name: 'increment',
      arguments: {},
    });
    const second = await client.callTool({
      name: 'increment',
      arguments: {},
    });
    expect(first.structuredContent).toEqual({ count: 1 });
    expect(second.structuredContent).toEqual({ count: 2 });
    await client.close();
  });
});
