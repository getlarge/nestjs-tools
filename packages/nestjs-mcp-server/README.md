# @getlarge/nestjs-mcp-server

Build [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers idiomatically with NestJS.

> Status: pre-release, under active development.

## Features (v1 scope)

- Declarative MCP **tools**, **resources**, **prompts**, **completions** via decorators.
- Optional **MCP Apps** integration (`@McpApp`) for tools that ship interactive UIs.
- Full NestJS DI inside MCP handlers; **pipes / guards / interceptors / exception filters** apply per tool call.
- Adapter-agnostic: works with `@nestjs/platform-fastify` and `@nestjs/platform-express`.
- Pluggable **OAuth2** verification with `McpAuthGuard` + `@McpScopes()`.
- **Stateful by default** (matches current MCP clients), with stateless mode for serverless deployments.
- Pluggable session metadata store via `cacheable` (memory by default, Redis or any Keyv backend for distributed).

## Installation

```sh
npm install @getlarge/nestjs-mcp-server @modelcontextprotocol/sdk zod cacheable
# Optional, only if you use @McpApp:
npm install @modelcontextprotocol/ext-apps
# Optional, only if you use the bundled JwksTokenValidator:
npm install fast-jwt
```

## Quick start

```ts
import { Injectable, Module } from '@nestjs/common';
import { McpModule, McpTool } from '@getlarge/nestjs-mcp-server';
import { z } from 'zod';

@Injectable()
class WeatherTools {
  @McpTool({
    name: 'forecast',
    inputSchema: z.object({ city: z.string() }),
    outputSchema: z.object({ tempC: z.number() }),
  })
  async forecast(input: { city: string }) {
    return { tempC: 21 };
  }
}

@Module({
  imports: [
    McpModule.forRoot({
      serverInfo: { name: 'weather-mcp', version: '1.0.0' },
      transport: { type: 'http', path: '/mcp' }, // stateful by default
    }),
  ],
  providers: [WeatherTools],
})
export class AppModule {}
```

## Distributed sessions (Redis)

```ts
import { Cacheable } from 'cacheable';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CacheableSessionStore } from '@getlarge/nestjs-mcp-server';

const secondary = new Keyv({ store: new KeyvRedis('redis://localhost:6379') });
const cacheable = new Cacheable({ secondary });

McpModule.forRoot({
  serverInfo: { name: 'weather-mcp', version: '1.0.0' },
  transport: {
    type: 'http',
    path: '/mcp',
    sessionStore: new CacheableSessionStore(cacheable),
  },
});
```

Transports themselves stay node-local (they hold open streams); use sticky sessions on your load balancer for cross-node continuity.

## Stateless mode

For serverless deployments that cannot retain per-session state:

```ts
McpModule.forRoot({
  serverInfo: { name: 'weather-mcp', version: '1.0.0' },
  transport: { type: 'http', path: '/mcp', stateless: true },
});
```

## OAuth2

```ts
McpModule.forRoot({
  serverInfo: { name: 'weather-mcp', version: '1.0.0' },
  transport: { type: 'http', path: '/mcp' },
  authorization: {
    enabled: true,
    authorizationServers: ['https://idp.example.com'],
    resourceUri: 'https://mcp.example.com',
    tokenValidation: {
      jwksUri: 'https://idp.example.com/.well-known/jwks.json',
      validateAudience: true,
    },
  },
});
```

`McpAuthGuard` + `@McpScopes()` apply on a per-tool basis:

```ts
@McpTool({ name: 'admin-action', inputSchema: z.object({}) })
@UseGuards(McpAuthGuard)
@McpScopes('admin:write')
async adminAction() { ... }
```

The module mounts `/.well-known/oauth-protected-resource` (RFC 9728) automatically when `authorization.enabled`.

## License

Apache-2.0
