import 'reflect-metadata';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Injectable, Module, UseGuards } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as express from 'express';
import { z } from 'zod';

import { McpApp, McpAuthGuard, McpModule, McpScopes, McpTool, TokenValidator } from '../../src';

@Injectable()
class GreetTools {
  @McpTool({
    name: 'greet',
    description: 'Greet a person',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ hello: z.string() }),
  })
  @McpApp({ uri: 'ui://greet/widget', html: '<title>Greet</title>' })
  async greet(input: { name: string }): Promise<{ hello: string }> {
    return { hello: input.name };
  }

  @McpTool({
    name: 'admin-action',
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean() }),
  })
  @UseGuards(McpAuthGuard)
  @McpScopes('admin:write')
  async admin(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}

@Module({
  imports: [
    McpModule.forRoot({
      serverInfo: { name: 'sdk-e2e', version: '0.1.0' },
      transport: { type: 'http', path: '/mcp', stateless: true },
    }),
  ],
  providers: [GreetTools],
})
class OpenModule {}

const acceptingValidator: TokenValidator = {
  validateToken: jest.fn(async (token: string) => {
    if (token === 'admin') {
      return {
        valid: true,
        payload: { sub: 'alice', scope: 'admin:write tools:read' },
      };
    }
    if (token === 'reader') {
      return { valid: true, payload: { sub: 'bob', scope: 'tools:read' } };
    }
    return { valid: false, error: 'unknown token' };
  }),
};

@Module({
  imports: [
    McpModule.forRoot({
      serverInfo: { name: 'sdk-e2e-auth', version: '0.1.0' },
      transport: { type: 'http', path: '/mcp', stateless: true },
      authorization: {
        enabled: true,
        authorizationServers: ['https://idp.example.com'],
        resourceUri: 'https://mcp.example.com',
        tokenValidation: { jwksUri: 'https://idp.example.com/jwks.json' },
      },
      tokenValidator: acceptingValidator,
    }),
  ],
  providers: [GreetTools],
})
class AuthedModule {}

async function makeFastifyApp(module: unknown): Promise<{ app: NestFastifyApplication; port: number }> {
  const app = await NestFactory.create<NestFastifyApplication>(module as never, new FastifyAdapter());
  await app.listen(0);
  const port = (app.getHttpServer().address() as { port: number }).port;
  return { app, port };
}

async function makeExpressApp(module: unknown): Promise<{ app: NestExpressApplication; port: number }> {
  const app = await NestFactory.create<NestExpressApplication>(module as never, new ExpressAdapter(express()));
  await app.listen(0);
  const port = (app.getHttpServer().address() as { port: number }).port;
  return { app, port };
}

async function withClient<T>(
  url: URL,
  authToken: string | undefined,
  body: (client: Client) => Promise<T>,
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: authToken ? { headers: { authorization: `Bearer ${authToken}` } } : undefined,
  });
  const client = new Client({ name: 'jest-e2e-client', version: '0.0.1' });
  await client.connect(transport);
  try {
    return await body(client);
  } finally {
    await client.close();
  }
}

let fastifyOpen: { app: NestFastifyApplication; port: number };
let expressOpen: { app: NestExpressApplication; port: number };
let fastifyAuth: { app: NestFastifyApplication; port: number };

beforeAll(async () => {
  fastifyOpen = await makeFastifyApp(OpenModule);
  expressOpen = await makeExpressApp(OpenModule);
  fastifyAuth = await makeFastifyApp(AuthedModule);
}, 30_000);

afterAll(async () => {
  await fastifyOpen.app.close();
  await expressOpen.app.close();
  await fastifyAuth.app.close();
});

describe('SDK client E2E on Fastify (open)', () => {
  const url = (): URL => new URL(`http://127.0.0.1:${fastifyOpen.port}/mcp`);

  it('lists discovered tools', async () => {
    await withClient(url(), undefined, async (client) => {
      const tools = await client.listTools();
      expect(tools.tools.map((t) => t.name)).toEqual(expect.arrayContaining(['greet', 'admin-action']));
    });
  });

  it('calls a tool and returns structured content', async () => {
    await withClient(url(), undefined, async (client) => {
      const result = await client.callTool({
        name: 'greet',
        arguments: { name: 'Ada' },
      });
      expect(result.structuredContent).toEqual({ hello: 'Ada' });
    });
  });

  it('annotates the tool result with the MCP App ui:// meta', async () => {
    await withClient(url(), undefined, async (client) => {
      const result = await client.callTool({
        name: 'greet',
        arguments: { name: 'Ada' },
      });
      expect(result._meta).toMatchObject({
        'mcp/ui': { uri: 'ui://greet/widget' },
      });
    });
  });

  it('exposes the ui:// resource through the SDK', async () => {
    await withClient(url(), undefined, async (client) => {
      const resources = await client.listResources();
      expect(resources.resources.map((r) => r.uri)).toEqual(expect.arrayContaining(['ui://greet/widget']));
      const read = await client.readResource({ uri: 'ui://greet/widget' });
      const first = read.contents[0] as { text?: string; mimeType?: string };
      expect(first.mimeType).toBe('text/html');
      expect(first.text).toContain('Greet');
    });
  });
});

describe('SDK client E2E on Express (open)', () => {
  const url = (): URL => new URL(`http://127.0.0.1:${expressOpen.port}/mcp`);

  it('calls a tool over Express', async () => {
    await withClient(url(), undefined, async (client) => {
      const result = await client.callTool({
        name: 'greet',
        arguments: { name: 'Grace' },
      });
      expect(result.structuredContent).toEqual({ hello: 'Grace' });
    });
  });
});

describe('SDK client E2E with auth on Fastify', () => {
  const url = (): URL => new URL(`http://127.0.0.1:${fastifyAuth.port}/mcp`);

  it('lets a token with the required scope call the guarded tool', async () => {
    await withClient(url(), 'admin', async (client) => {
      const result = await client.callTool({
        name: 'admin-action',
        arguments: {},
      });
      expect(result.structuredContent).toEqual({ ok: true });
    });
  });

  it('rejects a token without the required scope', async () => {
    await withClient(url(), 'reader', async (client) => {
      const result = await client.callTool({
        name: 'admin-action',
        arguments: {},
      });
      expect(result.isError).toBe(true);
    });
  });
});
