import 'reflect-metadata';

import { McpExecutionContext, McpRequestContext } from '../../src';

class FakeTools {
  greet(input: { name: string }): string {
    return `hi ${input.name}`;
  }
}

const instance = new FakeTools();
const handler = instance.greet.bind(instance) as (
  ...args: unknown[]
) => unknown;
const httpReq = { headers: { authorization: 'Bearer abc' } };
const httpRes = { statusCode: 200 };
const mcpRequest: McpRequestContext = {
  kind: 'tool',
  name: 'greet',
  input: { name: 'Ada' },
  auth: { token: 'abc', scopes: ['greet:write'] },
  rawHttp: { req: httpReq, res: httpRes },
};

const ctx = new McpExecutionContext({
  handler,
  providerClass: FakeTools,
  instance,
  request: mcpRequest,
});

describe('McpExecutionContext', () => {
  it('getType() returns "mcp"', () => {
    expect(ctx.getType()).toBe('mcp');
  });

  it('exposes the handler and the provider class', () => {
    expect(ctx.getHandler()).toBe(handler);
    expect(ctx.getClass()).toBe(FakeTools);
  });

  it('getArgs() returns [input, auth, fullRequest]', () => {
    const [input, auth, full] = ctx.getArgs();
    expect(input).toEqual({ name: 'Ada' });
    expect(auth).toEqual({ token: 'abc', scopes: ['greet:write'] });
    expect(full).toBe(mcpRequest);
  });

  it('getArgByIndex() picks individual args', () => {
    expect(ctx.getArgByIndex(0)).toEqual({ name: 'Ada' });
    expect(ctx.getArgByIndex(1)).toEqual({
      token: 'abc',
      scopes: ['greet:write'],
    });
  });

  it('switchToHttp() exposes the underlying req/res', () => {
    const http = ctx.switchToHttp();
    expect(http.getRequest()).toBe(httpReq);
    expect(http.getResponse()).toBe(httpRes);
  });

  it('exposes the MCP request via getMcpRequest()', () => {
    expect(ctx.getMcpRequest()).toBe(mcpRequest);
  });
});
