import 'reflect-metadata';

import { ZodTypeAny } from 'zod';

export const MCP_TOOL_METADATA = Symbol.for('nestjs-mcp-server:tool');

export interface McpToolMetadata {
  name: string;
  description?: string;
  inputSchema?: ZodTypeAny;
  outputSchema?: ZodTypeAny;
  annotations?: Record<string, unknown>;
}

export interface McpToolOptions {
  name: string;
  description?: string;
  inputSchema?: ZodTypeAny;
  outputSchema?: ZodTypeAny;
  annotations?: Record<string, unknown>;
}

export function McpTool(options: McpToolOptions): MethodDecorator {
  if (!options.name || !options.name.trim()) {
    throw new Error('@McpTool requires a non-empty name');
  }
  const metadata: McpToolMetadata = {
    name: options.name,
    description: options.description,
    inputSchema: options.inputSchema,
    outputSchema: options.outputSchema,
    annotations: options.annotations,
  };
  return (target, propertyKey) => {
    Reflect.defineMetadata(MCP_TOOL_METADATA, metadata, target, propertyKey);
  };
}
