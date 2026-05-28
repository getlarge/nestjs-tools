import 'reflect-metadata';

export const MCP_APP_METADATA = Symbol.for('nestjs-mcp-server:app');

export interface McpAppMetadata {
  uri: string;
  html?: string;
  file?: string;
  url?: string;
  mimeType?: string;
}

export type McpAppOptions = McpAppMetadata;

export function McpApp(options: McpAppOptions): MethodDecorator {
  if (!options.uri || !options.uri.trim()) {
    throw new Error('@McpApp requires a non-empty uri');
  }
  const provided = ['html', 'file', 'url'].filter(
    (key) => (options as unknown as Record<string, unknown>)[key] !== undefined
  );
  if (provided.length === 0) {
    throw new Error(
      '@McpApp requires exactly one of html, file or url to be set'
    );
  }
  return (target, propertyKey) => {
    Reflect.defineMetadata(
      MCP_APP_METADATA,
      { ...options },
      target,
      propertyKey
    );
  };
}
