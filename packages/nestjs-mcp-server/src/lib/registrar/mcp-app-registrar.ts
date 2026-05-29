import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { MCP_APP_METADATA, McpAppMetadata } from '../decorators/mcp-app.decorator';
import { McpDiscoveryService } from '../discovery/mcp-discovery.service';

export interface McpAppServerLike {
  registerResource(
    name: string,
    uri: string,
    config: { mimeType?: string; description?: string },
    callback: () => Promise<unknown> | unknown,
  ): unknown;
}

@Injectable()
export class McpAppRegistrar {
  constructor(private readonly discovery: McpDiscoveryService) {}

  registerAll(server: McpAppServerLike): void {
    for (const app of this.collectApps()) {
      if (app.url) continue;
      const body = this.resolveBody(app);
      const name = this.deriveResourceName(app.uri);
      server.registerResource(name, app.uri, { mimeType: app.mimeType ?? 'text/html' }, () => ({
        contents: [
          {
            uri: app.uri,
            mimeType: app.mimeType ?? 'text/html',
            text: body,
          },
        ],
      }));
    }
  }

  private collectApps(): McpAppMetadata[] {
    return this.discovery
      .discoverTools()
      .map((descriptor) => {
        const proto = descriptor.providerClass.prototype as Record<string, unknown> | undefined;
        if (!proto) return undefined;
        return Reflect.getMetadata(MCP_APP_METADATA, proto, descriptor.methodName) as McpAppMetadata | undefined;
      })
      .filter((app): app is McpAppMetadata => !!app);
  }

  private resolveBody(app: McpAppMetadata): string {
    if (app.html !== undefined) return app.html;
    if (app.file !== undefined) {
      return readFileSync(resolve(app.file), 'utf8');
    }
    return '';
  }

  private deriveResourceName(uri: string): string {
    const trimmed = uri.replace(/^ui:\/\//, '');
    return trimmed.replace(/\//g, '-') || 'ui';
  }
}
