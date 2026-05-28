import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { z } from 'zod';

import {
  MCP_APP_METADATA,
  McpApp,
  McpAppMetadata,
  McpAppRegistrar,
  McpDiscoveryService,
  McpPipelineRunner,
  McpTool,
  McpToolRegistrar,
} from '../../src';

interface RegisteredResource {
  name: string;
  uri: string;
  callback: () => Promise<unknown> | unknown;
}
interface RegisteredTool {
  name: string;
  config: Record<string, unknown>;
  callback: (args: unknown, extra: Record<string, unknown>) => Promise<unknown>;
}

class FakeMcpServer {
  resources: RegisteredResource[] = [];
  tools: RegisteredTool[] = [];

  registerResource(
    name: string,
    uri: string,
    _config: Record<string, unknown>,
    callback: RegisteredResource['callback']
  ): unknown {
    this.resources.push({ name, uri, callback });
    return { name };
  }

  registerTool(
    name: string,
    config: Record<string, unknown>,
    callback: RegisteredTool['callback']
  ): unknown {
    this.tools.push({ name, config, callback });
    return { name };
  }
}

@Injectable()
class WeatherTools {
  @McpTool({
    name: 'forecast',
    inputSchema: z.object({ city: z.string() }),
  })
  @McpApp({
    uri: 'ui://weather/forecast',
    html: '<!doctype html><title>Forecast</title>',
  })
  async forecast(input: { city: string }): Promise<{ city: string }> {
    return { city: input.city };
  }
}

describe('@McpApp decorator', () => {
  it('stores app metadata next to @McpTool', () => {
    const meta = Reflect.getMetadata(
      MCP_APP_METADATA,
      WeatherTools.prototype,
      'forecast'
    ) as McpAppMetadata | undefined;
    expect(meta).toBeDefined();
    expect(meta?.uri).toBe('ui://weather/forecast');
    expect(meta?.html).toContain('Forecast');
  });

  it('throws when neither html, file nor url is provided', () => {
    expect(() => McpApp({ uri: 'ui://x' })).toThrow(
      /html|file|url/i
    );
  });

  it('throws on missing uri', () => {
    expect(() => McpApp({ uri: '', html: '<p/>' })).toThrow(/uri/i);
  });
});

let moduleRef: TestingModule;
let toolReg: McpToolRegistrar;
let appReg: McpAppRegistrar;
let server: FakeMcpServer;

beforeAll(async () => {
  moduleRef = await Test.createTestingModule({
    imports: [DiscoveryModule],
    providers: [
      Reflector,
      McpDiscoveryService,
      McpPipelineRunner,
      McpToolRegistrar,
      McpAppRegistrar,
      WeatherTools,
    ],
  }).compile();
  toolReg = moduleRef.get(McpToolRegistrar);
  appReg = moduleRef.get(McpAppRegistrar);
  server = new FakeMcpServer();
  toolReg.registerAll(server as never);
  appReg.registerAll(server as never);
});

afterAll(async () => {
  await moduleRef.close();
});

describe('McpAppRegistrar resource mounting', () => {
  it('registers the ui:// resource carrying the inline HTML', async () => {
    const res = server.resources.find((r) => r.uri === 'ui://weather/forecast');
    expect(res).toBeDefined();
    const result = (await res!.callback()) as {
      contents: Array<{ uri: string; mimeType: string; text: string }>;
    };
    expect(result.contents[0]?.uri).toBe('ui://weather/forecast');
    expect(result.contents[0]?.mimeType).toBe('text/html');
    expect(result.contents[0]?.text).toContain('Forecast');
  });

});

describe('McpAppRegistrar tool _meta weaving', () => {
  it('annotates the tool result with _meta referencing the ui resource', async () => {
    const tool = server.tools.find((t) => t.name === 'forecast');
    expect(tool).toBeDefined();
    const result = (await tool!.callback(
      { city: 'Paris' },
      { authInfo: {}, sessionId: 's' }
    )) as { _meta?: Record<string, unknown> };
    expect(result._meta).toMatchObject({
      'mcp/ui': { uri: 'ui://weather/forecast' },
    });
  });
});
