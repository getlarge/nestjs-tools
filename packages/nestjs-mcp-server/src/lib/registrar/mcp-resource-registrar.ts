import { Injectable } from '@nestjs/common';

import { McpDiscoveryService } from '../discovery/mcp-discovery.service';
import { McpRequestContext } from '../execution/mcp-execution-context';
import { McpPipelineRunner } from '../execution/mcp-pipeline-runner';

export interface McpResourceServerLike {
  registerResource(
    name: string,
    uri: string,
    config: {
      title?: string;
      description?: string;
      mimeType?: string;
      annotations?: Record<string, unknown>;
    },
    callback: (
      uri: URL,
      extra: { authInfo?: Record<string, unknown>; sessionId?: string },
    ) => Promise<unknown> | unknown,
  ): unknown;
}

@Injectable()
export class McpResourceRegistrar {
  constructor(
    private readonly discovery: McpDiscoveryService,
    private readonly runner: McpPipelineRunner,
  ) {}

  registerAll(server: McpResourceServerLike): void {
    for (const descriptor of this.discovery.discoverResources()) {
      const meta = descriptor.metadata;
      server.registerResource(
        meta.name,
        meta.uri,
        {
          description: meta.description,
          mimeType: meta.mimeType,
          annotations: meta.annotations,
        },
        async (uri, extra) => {
          const request: McpRequestContext = {
            kind: 'resource',
            name: meta.name,
            input: { uri: uri.toString() },
            auth: extra.authInfo as McpRequestContext['auth'],
            meta: extra.sessionId ? { sessionId: extra.sessionId } : undefined,
          };
          return this.runner.run({
            handler: descriptor.handler,
            providerClass: descriptor.providerClass,
            methodName: descriptor.methodName,
            instance: descriptor.instance,
            request,
          });
        },
      );
    }
  }
}
