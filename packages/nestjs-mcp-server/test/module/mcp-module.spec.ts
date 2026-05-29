import 'reflect-metadata';

import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as express from 'express';
import { z } from 'zod';

import { MCP_SERVER, McpApp, McpModule, McpScopes, McpTool, TokenValidator } from '../../src';

@Injectable()
class WeatherTools {
  @McpTool({
    name: 'forecast',
    inputSchema: z.object({ city: z.string() }),
  })
  @McpApp({ uri: 'ui://weather/forecast', html: '<title>Forecast</title>' })
  @McpScopes('weather:read')
  async forecast(input: { city: string }): Promise<{ city: string }> {
    return { city: input.city };
  }
}

@Module({
  imports: [
    McpModule.forRoot({
      serverInfo: { name: 'test-mcp', version: '0.1.0' },
      transport: { type: 'http', path: '/mcp' },
    }),
  ],
  providers: [WeatherTools],
})
class MinimalModule {}

const fakeValidator: TokenValidator = {
  validateToken: jest.fn().mockResolvedValue({
    valid: true,
    payload: { sub: 'alice', scope: 'weather:read' },
  }),
};

@Module({
  imports: [
    McpModule.forRoot({
      serverInfo: { name: 'authed-mcp', version: '0.1.0' },
      transport: { type: 'http', path: '/mcp' },
      authorization: {
        enabled: true,
        authorizationServers: ['https://idp.example.com'],
        resourceUri: 'https://mcp.example.com',
        tokenValidation: { jwksUri: 'https://idp.example.com/jwks.json' },
      },
      tokenValidator: fakeValidator,
    }),
  ],
  providers: [WeatherTools],
})
class AuthedModule {}

describe('McpModule.forRoot on Fastify', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(MinimalModule, new FastifyAdapter());
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers MCP_SERVER and discovers decorated providers', () => {
    const server = app.get(MCP_SERVER) as { name?: string };
    expect(server).toBeDefined();
    expect((server as { _registeredTools?: Map<string, unknown> })._registeredTools).toBeDefined();
  });
});

describe('McpModule.forRoot on Express', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(MinimalModule, new ExpressAdapter(express()));
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers MCP_SERVER', () => {
    const server = app.get(MCP_SERVER);
    expect(server).toBeDefined();
  });
});

describe('McpModule.forRoot with authorization', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(AuthedModule, new FastifyAdapter());
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it('mounts the well-known oauth-protected-resource route', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/.well-known/oauth-protected-resource',
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      resource: 'https://mcp.example.com',
      authorization_servers: ['https://idp.example.com'],
    });
  });
});
