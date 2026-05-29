import 'reflect-metadata';

export const MCP_RESOURCE_METADATA = Symbol.for('nestjs-mcp-server:resource');

export interface McpResourceMetadata {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: Record<string, unknown>;
}

export type McpResourceOptions = McpResourceMetadata;

export function McpResource(options: McpResourceOptions): MethodDecorator {
  if (!options.uri || !options.uri.trim()) {
    throw new Error('@McpResource requires a non-empty uri');
  }
  if (!options.name || !options.name.trim()) {
    throw new Error('@McpResource requires a non-empty name');
  }
  return (target, propertyKey) => {
    Reflect.defineMetadata(MCP_RESOURCE_METADATA, { ...options }, target, propertyKey);
  };
}
