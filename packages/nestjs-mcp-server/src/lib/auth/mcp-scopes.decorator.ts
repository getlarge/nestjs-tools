import { SetMetadata } from '@nestjs/common';

export const MCP_SCOPES_METADATA = Symbol.for('nestjs-mcp-server:scopes');

export const McpScopes = (...scopes: string[]) =>
  SetMetadata(MCP_SCOPES_METADATA, scopes);
