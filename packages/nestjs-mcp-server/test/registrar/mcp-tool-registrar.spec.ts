import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { z } from 'zod';

import { McpDiscoveryService, McpPipelineRunner, McpTool, McpToolRegistrar } from '../../src';

interface FakeRegisteredTool {
  name: string;
  config: {
    title?: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    annotations?: Record<string, unknown>;
  };
  callback: (args: unknown, extra: { authInfo?: Record<string, unknown>; sessionId?: string }) => Promise<unknown>;
}

class FakeMcpServer {
  readonly tools: FakeRegisteredTool[] = [];

  registerTool(
    name: string,
    config: FakeRegisteredTool['config'],
    callback: FakeRegisteredTool['callback'],
  ): { name: string } {
    this.tools.push({ name, config, callback });
    return { name };
  }
}

@Injectable()
class EchoTools {
  @McpTool({
    name: 'echo',
    description: 'Echo a name back',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ greeting: z.string() }),
  })
  async echo(input: { name: string }): Promise<{ greeting: string }> {
    return { greeting: `hi ${input.name}` };
  }
}

describe('McpToolRegistrar', () => {
  let moduleRef: TestingModule;
  let registrar: McpToolRegistrar;
  let server: FakeMcpServer;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [Reflector, McpDiscoveryService, McpPipelineRunner, McpToolRegistrar, EchoTools],
    }).compile();
    registrar = moduleRef.get(McpToolRegistrar);
    server = new FakeMcpServer();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('calls registerTool on the SDK server with name, description, schemas', () => {
    registrar.registerAll(server as unknown as Parameters<McpToolRegistrar['registerAll']>[0]);
    expect(server.tools).toHaveLength(1);
    const [tool] = server.tools;
    expect(tool.name).toBe('echo');
    expect(tool.config.description).toBe('Echo a name back');
    expect(tool.config.inputSchema).toMatchObject({ name: expect.anything() });
    expect(tool.config.outputSchema).toMatchObject({ greeting: expect.anything() });
  });

  it('invokes the discovered handler when the SDK callback fires', async () => {
    server.tools.length = 0;
    registrar.registerAll(server as unknown as Parameters<McpToolRegistrar['registerAll']>[0]);
    const tool = server.tools[0];
    const result = await tool.callback({ name: 'Ada' }, { authInfo: { token: 'abc' }, sessionId: 'sid-1' });
    expect(result).toEqual({
      content: [{ type: 'text', text: '{"greeting":"hi Ada"}' }],
      structuredContent: { greeting: 'hi Ada' },
    });
  });
});
