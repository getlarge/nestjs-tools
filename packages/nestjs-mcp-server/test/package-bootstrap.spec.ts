import * as pkg from '../src';

describe('@getlarge/nestjs-mcp-server entry', () => {
  it('exports the McpModule symbol', () => {
    expect((pkg as Record<string, unknown>)['McpModule']).toBeDefined();
  });
});
