import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  DynamicModule,
  Inject,
  Injectable,
  Module,
  NestModule,
  Provider,
} from '@nestjs/common';
import { DiscoveryModule, HttpAdapterHost } from '@nestjs/core';
import { Cacheable } from 'cacheable';

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
import {
  CacheableSessionStore,
  McpSessionStore,
  mountStreamableHttp,
  mountWellKnownRoutes,
  resolveMcpHttpAdapter,
} from './transport';

export const MCP_SERVER = Symbol.for('nestjs-mcp-server:server');
export const MCP_SERVER_FACTORY = Symbol.for('nestjs-mcp-server:server-factory');
export const MCP_MODULE_OPTIONS = Symbol.for('nestjs-mcp-server:options');

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpHttpTransportOptions {
  type: 'http';
  path?: string;
  /**
   * Defaults to false (stateful). Set true for serverless deployments that
   * cannot retain per-session state between requests.
   */
  stateless?: boolean;
  /**
   * Optional persistent session metadata store. Default is in-memory
   * Cacheable. Pass a Cacheable with a Redis (or other Keyv) secondary for
   * distributed deployments.
   */
  sessionStore?: McpSessionStore;
}

export interface McpModuleOptions {
  serverInfo: McpServerInfo;
  transport: McpHttpTransportOptions;
  authorization?: AuthorizationConfig;
  tokenValidator?: TokenValidator;
}

export type McpServerFactory = () => McpServer;

@Injectable()
class McpServerBuilder {
  constructor(
    @Inject(MCP_MODULE_OPTIONS) private readonly options: McpModuleOptions,
    private readonly tools: McpToolRegistrar,
    private readonly resources: McpResourceRegistrar,
    private readonly prompts: McpPromptRegistrar,
    private readonly apps: McpAppRegistrar
  ) {}

  build(): McpServer {
    const server = new McpServer(this.options.serverInfo);
    this.tools.registerAll(server as never);
    this.resources.registerAll(server as never);
    this.prompts.registerAll(server as never);
    this.apps.registerAll(server as never);
    return server;
  }
}

@Module({})
export class McpModule implements NestModule {
  constructor(
    private readonly builder: McpServerBuilder,
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(MCP_MODULE_OPTIONS) private readonly options: McpModuleOptions
  ) {}

  configure(): void {
    const adapter = this.httpAdapterHost.httpAdapter;
    if (!adapter) return;
    const http = resolveMcpHttpAdapter(adapter);
    if (this.options.authorization?.enabled) {
      mountWellKnownRoutes(http, this.options.authorization);
    }
    mountStreamableHttp(http, {
      path: this.options.transport.path ?? '/mcp',
      stateless: this.options.transport.stateless ?? false,
      sessionStore:
        this.options.transport.sessionStore ??
        new CacheableSessionStore(new Cacheable()),
      buildServer: () => this.builder.build(),
    });
  }

  static forRoot(options: McpModuleOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: MCP_MODULE_OPTIONS, useValue: options },
      McpDiscoveryService,
      McpPipelineRunner,
      McpToolRegistrar,
      McpResourceRegistrar,
      McpPromptRegistrar,
      McpAppRegistrar,
      McpAuthGuard,
      McpServerBuilder,
      {
        provide: MCP_SERVER_FACTORY,
        useFactory: (builder: McpServerBuilder): McpServerFactory => () =>
          builder.build(),
        inject: [McpServerBuilder],
      },
      {
        provide: MCP_SERVER,
        useFactory: (builder: McpServerBuilder): McpServer => builder.build(),
        inject: [McpServerBuilder],
      },
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
      exports: [MCP_SERVER, MCP_SERVER_FACTORY, McpAuthGuard],
      global: true,
    };
  }
}
