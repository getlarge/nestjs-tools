import 'reflect-metadata';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as express from 'express';

import {
  AuthorizationConfig,
  buildWwwAuthenticateHeader,
  ExpressMcpAdapter,
  FastifyMcpAdapter,
  mountWellKnownRoutes,
} from '../../src';

@Module({})
class EmptyModule {}

const authConfig: AuthorizationConfig = {
  enabled: true,
  authorizationServers: ['https://idp.example.com'],
  resourceUri: 'https://mcp.example.com',
  tokenValidation: { jwksUri: 'https://idp.example.com/.well-known/jwks.json' },
};

describe('buildWwwAuthenticateHeader', () => {
  it('matches the RFC 9728 shape with realm and resource_metadata', () => {
    const header = buildWwwAuthenticateHeader(authConfig);
    expect(header).toBe(
      'Bearer realm="MCP Server", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"'
    );
  });

  it('throws when authorization is disabled', () => {
    expect(() => buildWwwAuthenticateHeader({ enabled: false })).toThrow(
      /disabled/i
    );
  });
});

describe('mountWellKnownRoutes on Fastify', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      EmptyModule,
      new FastifyAdapter()
    );
    mountWellKnownRoutes(
      new FastifyMcpAdapter(app.getHttpAdapter() as never),
      authConfig
    );
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves oauth-protected-resource metadata', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/.well-known/oauth-protected-resource',
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      resource: 'https://mcp.example.com',
      authorization_servers: ['https://idp.example.com'],
    });
  });
});

describe('mountWellKnownRoutes on Express', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(
      EmptyModule,
      new ExpressAdapter(express())
    );
    mountWellKnownRoutes(
      new ExpressMcpAdapter(app.getHttpAdapter() as never),
      authConfig
    );
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves oauth-protected-resource metadata', async () => {
    const server = app.getHttpServer();
    const port = (server.address() as { port: number }).port;
    const res = await fetch(
      `http://127.0.0.1:${port}/.well-known/oauth-protected-resource`
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      resource: 'https://mcp.example.com',
      authorization_servers: ['https://idp.example.com'],
    });
  });
});

describe('mountWellKnownRoutes when authorization is disabled', () => {
  it('is a no-op', async () => {
    const app = await NestFactory.create<NestFastifyApplication>(
      EmptyModule,
      new FastifyAdapter()
    );
    mountWellKnownRoutes(new FastifyMcpAdapter(app.getHttpAdapter() as never), {
      enabled: false,
    });
    await app.listen(0);
    const res = await app.inject({
      method: 'GET',
      url: '/.well-known/oauth-protected-resource',
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
