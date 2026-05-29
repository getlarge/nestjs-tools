import 'reflect-metadata';

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
class EchoTools {
  @McpTool({
    name: 'echo',
    description: 'Echo a name',
    inputSchema: z.object({ name: z.string() }),
  })
  async echo(input: { name: string }): Promise<{ hello: string }> {
    return { hello: input.name };
  }
}

@Module({
  imports: [
    McpModule.forRoot({
      serverInfo: { name: 'streamable-test', version: '0.1.0' },
      transport: { type: 'http', path: '/mcp', stateless: true },
    }),
  ],
  providers: [EchoTools],
})
class StreamableModule {}

function initRequest(): unknown {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'jest-client', version: '0.0.1' },
    },
  };
}

function listToolsRequest(): unknown {
  return { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} };
}

function callToolRequest(): unknown {
  return {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'echo', arguments: { name: 'Ada' } },
  };
}

async function readJsonOrSse(body: string): Promise<unknown> {
  if (body.startsWith('event:') || body.startsWith('data:')) {
    const match = body.match(/data:\s*(\{[\s\S]*\})/);
    if (match) return JSON.parse(match[1]);
  }
  return JSON.parse(body);
}

let fastifyApp: NestFastifyApplication;

beforeAll(async () => {
  fastifyApp = await NestFactory.create<NestFastifyApplication>(
    StreamableModule,
    new FastifyAdapter()
  );
  await fastifyApp.listen(0);
});

afterAll(async () => {
  await fastifyApp.close();
});

describe('StreamableHTTP on Fastify (stateless)', () => {
  const app = (): NestFastifyApplication => fastifyApp;

  it('responds to tools/list with the discovered tool', async () => {
    const res = await app().inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      payload: listToolsRequest() as object,
    });
    expect(res.statusCode).toBe(200);
    const json = (await readJsonOrSse(res.body)) as {
      result?: { tools: Array<{ name: string }> };
    };
    expect(json.result?.tools).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'echo' })])
    );
  });

  it('handles a tools/call and returns the handler result', async () => {
    const res = await app().inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      payload: callToolRequest() as object,
    });
    expect(res.statusCode).toBe(200);
    const json = (await readJsonOrSse(res.body)) as {
      result?: { structuredContent?: { hello?: string } };
    };
    expect(json.result?.structuredContent).toEqual({ hello: 'Ada' });
  });
});

describe('StreamableHTTP on Express (stateless)', () => {
  let app: NestExpressApplication;
  let port: number;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(
      StreamableModule,
      new ExpressAdapter(express())
    );
    await app.listen(0);
    port = (app.getHttpServer().address() as { port: number }).port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds to tools/call with the handler result', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(callToolRequest()),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    const json = (await readJsonOrSse(text)) as {
      result?: { structuredContent?: { hello?: string } };
    };
    expect(json.result?.structuredContent).toEqual({ hello: 'Ada' });
  });
});

// Avoid unused import warnings if init isn't referenced in either describe.
void initRequest;
