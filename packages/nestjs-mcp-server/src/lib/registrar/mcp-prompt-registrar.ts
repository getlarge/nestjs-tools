import { Injectable } from '@nestjs/common';
import { ZodObject, ZodRawShape } from 'zod';

import { McpDiscoveryService } from '../discovery/mcp-discovery.service';
import { McpRequestContext } from '../execution/mcp-execution-context';
import { McpPipelineRunner } from '../execution/mcp-pipeline-runner';

export interface McpPromptServerLike {
  registerPrompt(
    name: string,
    config: {
      title?: string;
      description?: string;
      argsSchema?: ZodRawShape | Record<string, unknown>;
    },
    callback: (
      args: unknown,
      extra: { authInfo?: Record<string, unknown>; sessionId?: string },
    ) => Promise<unknown> | unknown,
  ): unknown;
}

@Injectable()
export class McpPromptRegistrar {
  constructor(
    private readonly discovery: McpDiscoveryService,
    private readonly runner: McpPipelineRunner,
  ) {}

  registerAll(server: McpPromptServerLike): void {
    for (const descriptor of this.discovery.discoverPrompts()) {
      const meta = descriptor.metadata;
      server.registerPrompt(
        meta.name,
        {
          title: meta.title,
          description: meta.description,
          argsSchema: this.unwrapShape(meta.argsSchema),
        },
        async (args, extra) => {
          const request: McpRequestContext = {
            kind: 'prompt',
            name: meta.name,
            input: args,
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

  private unwrapShape(schema: unknown): ZodRawShape | Record<string, unknown> | undefined {
    if (!schema) return undefined;
    if (schema instanceof ZodObject) return schema.shape;
    return schema as Record<string, unknown>;
  }
}
