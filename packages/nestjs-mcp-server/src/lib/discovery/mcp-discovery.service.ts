import { Injectable, Type } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

import {
  MCP_PROMPT_METADATA,
  McpPromptMetadata,
} from '../decorators/mcp-prompt.decorator';
import {
  MCP_RESOURCE_METADATA,
  McpResourceMetadata,
} from '../decorators/mcp-resource.decorator';
import {
  MCP_TOOL_METADATA,
  McpToolMetadata,
} from '../decorators/mcp-tool.decorator';

export interface McpDecoratedMethod<TMetadata> {
  metadata: TMetadata;
  instance: object;
  providerClass: Type;
  methodName: string;
  handler: (...args: unknown[]) => unknown | Promise<unknown>;
}

export type McpToolDescriptor = McpDecoratedMethod<McpToolMetadata>;
export type McpResourceDescriptor = McpDecoratedMethod<McpResourceMetadata>;
export type McpPromptDescriptor = McpDecoratedMethod<McpPromptMetadata>;

@Injectable()
export class McpDiscoveryService {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner
  ) {}

  discoverTools(): McpToolDescriptor[] {
    return this.scan<McpToolMetadata>(MCP_TOOL_METADATA);
  }

  discoverResources(): McpResourceDescriptor[] {
    return this.scan<McpResourceMetadata>(MCP_RESOURCE_METADATA);
  }

  discoverPrompts(): McpPromptDescriptor[] {
    return this.scan<McpPromptMetadata>(MCP_PROMPT_METADATA);
  }

  private scan<TMetadata>(
    metadataKey: symbol
  ): McpDecoratedMethod<TMetadata>[] {
    const descriptors: McpDecoratedMethod<TMetadata>[] = [];
    for (const wrapper of this.discoveryService.getProviders()) {
      if (!this.isAddressable(wrapper)) continue;
      descriptors.push(...this.scanInstance<TMetadata>(metadataKey, wrapper));
    }
    return descriptors;
  }

  private scanInstance<TMetadata>(
    metadataKey: symbol,
    wrapper: InstanceWrapper & { instance: object }
  ): McpDecoratedMethod<TMetadata>[] {
    const instance = wrapper.instance;
    const prototype = Object.getPrototypeOf(instance) as object | null;
    if (!prototype) return [];
    const found: McpDecoratedMethod<TMetadata>[] = [];
    for (const methodName of this.metadataScanner.getAllMethodNames(
      prototype
    )) {
      const metadata = Reflect.getMetadata(metadataKey, prototype, methodName) as
        | TMetadata
        | undefined;
      if (!metadata) continue;
      const original = (instance as Record<string, unknown>)[methodName];
      if (typeof original !== 'function') continue;
      found.push({
        metadata,
        instance,
        providerClass: wrapper.metatype as Type,
        methodName,
        handler: (original as (...args: unknown[]) => unknown).bind(instance),
      });
    }
    return found;
  }

  private isAddressable(
    wrapper: InstanceWrapper
  ): wrapper is InstanceWrapper & { instance: object } {
    return (
      !!wrapper.instance &&
      typeof wrapper.instance === 'object' &&
      !!wrapper.metatype
    );
  }
}
