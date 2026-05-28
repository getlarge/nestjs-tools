import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { z } from 'zod';

import {
  McpDiscoveryService,
  McpPipelineRunner,
  McpPrompt,
  McpPromptRegistrar,
  McpResource,
  McpResourceRegistrar,
} from '../../src';

interface RegisteredResource {
  name: string;
  uri: string;
  config: Record<string, unknown>;
  callback: (uri: URL, extra: Record<string, unknown>) => Promise<unknown>;
}

interface RegisteredPrompt {
  name: string;
  config: Record<string, unknown>;
  callback: (args: unknown, extra: Record<string, unknown>) => Promise<unknown>;
}

class FakeMcpServer {
  resources: RegisteredResource[] = [];
  prompts: RegisteredPrompt[] = [];

  registerResource(
    name: string,
    uri: string,
    config: Record<string, unknown>,
    callback: RegisteredResource['callback']
  ): unknown {
    this.resources.push({ name, uri, config, callback });
    return { name };
  }

  registerPrompt(
    name: string,
    config: Record<string, unknown>,
    callback: RegisteredPrompt['callback']
  ): unknown {
    this.prompts.push({ name, config, callback });
    return { name };
  }
}

@Injectable()
class Examples {
  @McpResource({
    uri: 'app:///docs/readme',
    name: 'readme',
    description: 'The README',
    mimeType: 'text/markdown',
  })
  async readReadme(): Promise<{ contents: Array<{ uri: string; text: string }> }> {
    return {
      contents: [{ uri: 'app:///docs/readme', text: '# Hello' }],
    };
  }

  @McpPrompt({
    name: 'greet',
    argsSchema: z.object({ name: z.string() }),
  })
  greetPrompt(args: { name: string }): {
    messages: Array<{ role: string; content: { type: string; text: string } }>;
  } {
    return {
      messages: [
        { role: 'user', content: { type: 'text', text: `hi ${args.name}` } },
      ],
    };
  }
}

let moduleRef: TestingModule;
let resourceReg: McpResourceRegistrar;
let promptReg: McpPromptRegistrar;
let server: FakeMcpServer;

beforeAll(async () => {
  moduleRef = await Test.createTestingModule({
    imports: [DiscoveryModule],
    providers: [
      Reflector,
      McpDiscoveryService,
      McpPipelineRunner,
      McpResourceRegistrar,
      McpPromptRegistrar,
      Examples,
    ],
  }).compile();
  resourceReg = moduleRef.get(McpResourceRegistrar);
  promptReg = moduleRef.get(McpPromptRegistrar);
  server = new FakeMcpServer();
});

afterAll(async () => {
  await moduleRef.close();
});

describe('McpResourceRegistrar', () => {
  it('registers @McpResource on the SDK server', async () => {
    resourceReg.registerAll(
      server as unknown as Parameters<McpResourceRegistrar['registerAll']>[0]
    );
    expect(server.resources).toHaveLength(1);
    const [res] = server.resources;
    expect(res.uri).toBe('app:///docs/readme');
    expect(res.name).toBe('readme');
    expect(res.config['mimeType']).toBe('text/markdown');
    const out = await res.callback(new URL('app:///docs/readme'), {});
    expect(out).toEqual({
      contents: [{ uri: 'app:///docs/readme', text: '# Hello' }],
    });
  });

});

describe('McpPromptRegistrar', () => {
  it('registers @McpPrompt on the SDK server', async () => {
    promptReg.registerAll(
      server as unknown as Parameters<McpPromptRegistrar['registerAll']>[0]
    );
    expect(server.prompts).toHaveLength(1);
    const [prompt] = server.prompts;
    expect(prompt.name).toBe('greet');
    const out = await prompt.callback({ name: 'Ada' }, {});
    expect(out).toEqual({
      messages: [
        { role: 'user', content: { type: 'text', text: 'hi Ada' } },
      ],
    });
  });
});
