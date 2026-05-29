import 'reflect-metadata';

import { ZodTypeAny } from 'zod';

export const MCP_PROMPT_METADATA = Symbol.for('nestjs-mcp-server:prompt');

export interface McpPromptMetadata {
  name: string;
  title?: string;
  description?: string;
  argsSchema?: ZodTypeAny;
}

export type McpPromptOptions = McpPromptMetadata;

export function McpPrompt(options: McpPromptOptions): MethodDecorator {
  if (!options.name || !options.name.trim()) {
    throw new Error('@McpPrompt requires a non-empty name');
  }
  return (target, propertyKey) => {
    Reflect.defineMetadata(MCP_PROMPT_METADATA, { ...options }, target, propertyKey);
  };
}
