import { Injectable } from '@nestjs/common';
import { ZodObject, ZodRawShape } from 'zod';

import { McpDiscoveryService } from '../discovery/mcp-discovery.service';
import { McpRequestContext } from '../execution/mcp-execution-context';
import {
  McpPipelineRunner,
} from '../execution/mcp-pipeline-runner';

export interface McpServerLike {
  registerTool(
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: ZodRawShape | Record<string, unknown>;
      outputSchema?: ZodRawShape | Record<string, unknown>;
      annotations?: Record<string, unknown>;
      _meta?: Record<string, unknown>;
    },
    callback: (
      args: unknown,
      extra: { authInfo?: Record<string, unknown>; sessionId?: string }
    ) => Promise<unknown> | unknown
  ): unknown;
}

@Injectable()
export class McpToolRegistrar {
  constructor(
    private readonly discovery: McpDiscoveryService,
    private readonly runner: McpPipelineRunner
  ) {}

  registerAll(server: McpServerLike): void {
    for (const descriptor of this.discovery.discoverTools()) {
      server.registerTool(
        descriptor.metadata.name,
        {
          description: descriptor.metadata.description,
          inputSchema: this.unwrapShape(descriptor.metadata.inputSchema),
          outputSchema: this.unwrapShape(descriptor.metadata.outputSchema),
          annotations: descriptor.metadata.annotations,
        },
        async (args, extra) => {
          const request: McpRequestContext = {
            kind: 'tool',
            name: descriptor.metadata.name,
            input: args,
            auth: extra.authInfo as McpRequestContext['auth'],
            meta: extra.sessionId ? { sessionId: extra.sessionId } : undefined,
          };
          const result = await this.runner.run({
            handler: descriptor.handler,
            providerClass: descriptor.providerClass,
            methodName: descriptor.methodName,
            instance: descriptor.instance,
            request,
          });
          return this.toToolResult(result);
        }
      );
    }
  }

  private unwrapShape(
    schema: unknown
  ): ZodRawShape | Record<string, unknown> | undefined {
    if (!schema) return undefined;
    if (schema instanceof ZodObject) {
      return schema.shape;
    }
    return schema as Record<string, unknown>;
  }

  private toToolResult(value: unknown): {
    content: Array<{ type: 'text'; text: string }>;
    structuredContent?: unknown;
  } {
    if (this.isToolResult(value)) {
      return value;
    }
    const isStructured =
      value !== null && typeof value === 'object' && !Array.isArray(value);
    return {
      content: [{ type: 'text', text: JSON.stringify(value) }],
      structuredContent: isStructured ? value : undefined,
    };
  }

  private isToolResult(value: unknown): value is {
    content: Array<{ type: 'text'; text: string }>;
    structuredContent?: unknown;
  } {
    return (
      typeof value === 'object' &&
      value !== null &&
      Array.isArray((value as { content?: unknown }).content)
    );
  }
}
