import 'reflect-metadata';

import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  AuthorizationConfig,
  McpAuthGuard,
  McpExecutionContext,
  McpRequestContext,
  McpScopes,
  TokenValidator,
} from '../../src';

const config: AuthorizationConfig = {
  enabled: true,
  authorizationServers: ['https://idp.example.com'],
  resourceUri: 'https://mcp.example.com',
  tokenValidation: { jwksUri: 'https://idp.example.com/.well-known/jwks.json' },
};

function makeValidator(
  outcome: 'ok' | 'invalid',
  payload?: Record<string, unknown>
): TokenValidator {
  return {
    validateToken: jest.fn().mockResolvedValue(
      outcome === 'ok'
        ? { valid: true, payload: payload ?? { sub: 'alice', scope: 'tools:read' } }
        : { valid: false, error: 'invalid signature' }
    ),
  } as unknown as TokenValidator;
}

function makeContext(opts: {
  token?: string;
  toolName?: string;
  scopes?: string[];
}): ExecutionContext {
  class FakeTools {
    @McpScopes(...(opts.scopes ?? []))
    handler(): string {
      return 'ok';
    }
  }
  const instance = new FakeTools();
  const request: McpRequestContext = {
    kind: 'tool',
    name: opts.toolName ?? 'do',
    input: {},
    auth: opts.token ? { token: opts.token } : undefined,
    rawHttp: { req: { headers: {} }, res: {} },
  };
  return new McpExecutionContext({
    handler: instance.handler.bind(instance) as (...args: unknown[]) => unknown,
    providerClass: FakeTools,
    methodName: 'handler',
    instance,
    request,
  });
}

const reflector = new Reflector();

describe('McpAuthGuard token validation', () => {
  it('throws Unauthorized when no token is present', async () => {
    const guard = new McpAuthGuard(config, makeValidator('ok'), reflector);
    const ctx = makeContext({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it('throws Unauthorized when the token is invalid', async () => {
    const guard = new McpAuthGuard(config, makeValidator('invalid'), reflector);
    const ctx = makeContext({ token: 'bad' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it('passes when the token is valid and no @McpScopes is set', async () => {
    const guard = new McpAuthGuard(config, makeValidator('ok'), reflector);
    const ctx = makeContext({ token: 'good' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

});

describe('McpAuthGuard scope enforcement', () => {
  it('rejects with Forbidden when @McpScopes is set and token lacks the scope', async () => {
    const guard = new McpAuthGuard(
      config,
      makeValidator('ok', { sub: 'alice', scope: 'tools:read' }),
      reflector
    );
    const ctx = makeContext({ token: 'good', scopes: ['tools:write'] });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it('passes when token carries all required scopes (space-separated string)', async () => {
    const guard = new McpAuthGuard(
      config,
      makeValidator('ok', { sub: 'alice', scope: 'tools:read tools:write' }),
      reflector
    );
    const ctx = makeContext({ token: 'good', scopes: ['tools:write'] });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('passes when token carries all required scopes (scope array)', async () => {
    const guard = new McpAuthGuard(
      config,
      makeValidator('ok', { sub: 'alice', scopes: ['tools:write'] }),
      reflector
    );
    const ctx = makeContext({ token: 'good', scopes: ['tools:write'] });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
