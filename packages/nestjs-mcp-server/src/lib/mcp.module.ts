import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  DynamicModule,
  Inject,
  Injectable,
  Module,
  OnApplicationBootstrap,
  Provider,
} from '@nestjs/common';
import { DiscoveryModule, HttpAdapterHost } from '@nestjs/core';

import {
  AuthorizationConfig,
  MCP_AUTH_CONFIG,
  MCP_TOKEN_VALIDATOR,
  McpAuthGuard,
  TokenValidator,
} from './auth';
import { McpDiscoveryService } from './discovery';
import { McpPipelineRunner } from './execution';
import {
  McpAppRegistrar,
  McpPromptRegistrar,
  McpResourceRegistrar,
  McpToolRegistrar,
} from './registrar';
import { mountWellKnownRoutes, resolveMcpHttpAdapter } from './transport';

export const MCP_SERVER = Symbol.for('nestjs-mcp-server:server');
export const MCP_MODULE_OPTIONS = Symbol.for('nestjs-mcp-server:options');

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpHttpTransportOptions {
  type: 'http';
  path?: string;
  stateless?: boolean;
}

export interface McpModuleOptions {
  serverInfo: McpServerInfo;
  transport: McpHttpTransportOptions;
  authorization?: AuthorizationConfig;
  tokenValidator?: TokenValidator;
}

@Injectable()
class McpBootstrap implements OnApplicationBootstrap {
  constructor(
    private readonly tools: McpToolRegistrar,
    private readonly resources: McpResourceRegistrar,
    private readonly prompts: McpPromptRegistrar,
    private readonly apps: McpAppRegistrar,
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(MCP_MODULE_OPTIONS) private readonly options: McpModuleOptions,
    @Inject(MCP_SERVER) private readonly server: McpServer
  ) {}

  onApplicationBootstrap(): void {
    this.tools.registerAll(this.server as never);
    this.resources.registerAll(this.server as never);
    this.prompts.registerAll(this.server as never);
    this.apps.registerAll(this.server as never);
    if (this.options.authorization?.enabled) {
      const adapter = this.httpAdapterHost.httpAdapter;
      if (adapter) {
        const http = resolveMcpHttpAdapter(adapter);
        mountWellKnownRoutes(http, this.options.authorization);
      }
    }
  }
}

@Module({})
export class McpModule {
  static forRoot(options: McpModuleOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: MCP_MODULE_OPTIONS, useValue: options },
      {
        provide: MCP_SERVER,
        useFactory: (): McpServer => new McpServer(options.serverInfo),
      },
      McpDiscoveryService,
      McpPipelineRunner,
      McpToolRegistrar,
      McpResourceRegistrar,
      McpPromptRegistrar,
      McpAppRegistrar,
      McpAuthGuard,
      McpBootstrap,
    ];
    if (options.authorization) {
      providers.push({
        provide: MCP_AUTH_CONFIG,
        useValue: options.authorization,
      });
    }
    if (options.tokenValidator) {
      providers.push({
        provide: MCP_TOKEN_VALIDATOR,
        useValue: options.tokenValidator,
      });
    }
    return {
      module: McpModule,
      imports: [DiscoveryModule],
      providers,
      exports: [MCP_SERVER, McpAuthGuard],
      global: true,
    };
  }
}
