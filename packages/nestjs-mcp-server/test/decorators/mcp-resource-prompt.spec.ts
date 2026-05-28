import 'reflect-metadata';

import { z } from 'zod';

import {
  MCP_PROMPT_METADATA,
  MCP_RESOURCE_METADATA,
  McpPrompt,
  McpPromptMetadata,
  McpResource,
  McpResourceMetadata,
} from '../../src';

class Examples {
  @McpResource({
    uri: 'app:///docs/readme',
    name: 'readme',
    description: 'The README',
    mimeType: 'text/markdown',
  })
  async readReadme(): Promise<string> {
    return '# Hello';
  }

  @McpPrompt({
    name: 'greet',
    description: 'Greet someone',
    argsSchema: z.object({ name: z.string() }),
  })
  greetPrompt(args: { name: string }): { messages: unknown[] } {
    return { messages: [{ role: 'user', content: { type: 'text', text: `hi ${args.name}` } }] };
  }
}

function readResource(method: string): McpResourceMetadata | undefined {
  return Reflect.getMetadata(MCP_RESOURCE_METADATA, Examples.prototype, method);
}

function readPrompt(method: string): McpPromptMetadata | undefined {
  return Reflect.getMetadata(MCP_PROMPT_METADATA, Examples.prototype, method);
}

describe('@McpResource', () => {
  it('writes metadata under MCP_RESOURCE_METADATA', () => {
    const meta = readResource('readReadme');
    expect(meta).toBeDefined();
    expect(meta?.uri).toBe('app:///docs/readme');
    expect(meta?.name).toBe('readme');
    expect(meta?.mimeType).toBe('text/markdown');
  });

  it('throws when uri is missing', () => {
    expect(() => McpResource({ uri: '', name: 'x' })).toThrow(/uri/i);
  });
});

describe('@McpPrompt', () => {
  it('writes metadata under MCP_PROMPT_METADATA', () => {
    const meta = readPrompt('greetPrompt');
    expect(meta).toBeDefined();
    expect(meta?.name).toBe('greet');
    expect(meta?.argsSchema).toBeDefined();
  });

  it('throws when name is missing', () => {
    expect(() => McpPrompt({ name: '' })).toThrow(/name/i);
  });
});
