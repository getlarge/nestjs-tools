# @getlarge/nestjs-mcp-server

A thin NestJS layer over the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk). Declare MCP tools, resources, prompts and apps with decorators on standard providers; get NestJS dependency injection, per-tool guards, interceptors and pipes for free.

- Works with both `@nestjs/platform-fastify` and `@nestjs/platform-express`.
- Streamable HTTP transport — **stateful by default**, opt-in stateless mode for serverless.
- Optional OAuth2 authorization (JWKS + RFC 7662 introspection) with per-tool scope enforcement.
- Optional [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) for tools that ship interactive UIs.
- Pluggable session metadata store via [`cacheable`](https://github.com/jaredwray/cacheable) (memory by default, Redis or any Keyv backend for distributed deployments).

## Installation

```sh
npm install @getlarge/nestjs-mcp-server @modelcontextprotocol/sdk zod cacheable
```

Optional peers:

```sh
# Bundled JwksTokenValidator (OAuth2)
npm install fast-jwt
# Distributed sessions
npm install keyv @keyv/redis
```

## Quick start

A minimal server that exposes one tool, one resource and one prompt. Drop this into a fresh NestJS app and it will answer `tools/list`, `tools/call`, `resources/list`, `resources/read` and `prompts/list` on `POST /mcp`.

```ts
import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { McpModule, McpPrompt, McpResource, McpTool } from '@getlarge/nestjs-mcp-server';
import { z } from 'zod';

@Injectable()
class WeatherTools {
  @McpTool({
    name: 'forecast',
    description: 'Return a forecast for a city',
    inputSchema: z.object({ city: z.string() }),
    outputSchema: z.object({ tempC: z.number() }),
  })
  async forecast(input: { city: string }) {
    return { tempC: 21 };
  }

  @McpResource({
    uri: 'app:///docs/about',
    name: 'about',
    description: 'Server description',
    mimeType: 'text/plain',
  })
  async about() {
    return {
      contents: [{ uri: 'app:///docs/about', mimeType: 'text/plain', text: 'Weather MCP server' }],
    };
  }

  @McpPrompt({
    name: 'greet-city',
    description: 'Greet a city by name',
    argsSchema: z.object({ city: z.string() }),
  })
  greetCity(args: { city: string }) {
    return {
      messages: [{ role: 'user', content: { type: 'text', text: `Hello, ${args.city}!` } }],
    };
  }
}

@Module({
  imports: [
    McpModule.forRoot({
      serverInfo: { name: 'weather-mcp', version: '1.0.0' },
      transport: { type: 'http', path: '/mcp' },
    }),
  ],
  providers: [WeatherTools],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
```

Verify with the [official SDK client](https://github.com/modelcontextprotocol/typescript-sdk) (or any MCP-compatible client like Claude Desktop or MCP Inspector):

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(new URL('http://localhost:3000/mcp'));
const client = new Client({ name: 'demo', version: '1.0.0' });
await client.connect(transport);
console.log(await client.listTools());
console.log(await client.callTool({ name: 'forecast', arguments: { city: 'Paris' } }));
```

## Examples

Complex use cases live in [`examples/`](./examples), each as a standalone runnable project.

| Example                                  | Shows                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [`examples/basic`](./examples/basic)     | The quick-start above — runnable end-to-end                                                    |
| [`examples/oauth2`](./examples/oauth2)   | `McpAuthGuard`, `@McpScopes`, JWKS-based `JwksTokenValidator`, RFC 9728 `.well-known` metadata |
| [`examples/mcp-app`](./examples/mcp-app) | `@McpApp` with inline HTML + a tool result that the host renders in a sandboxed iframe         |

For Express adapter and Redis-backed sessions, see the dedicated sections below — both are single-line config changes on top of the basic example.

## Module options

```ts
McpModule.forRoot({
  serverInfo: { name: string, version: string },
  transport: {
    type: 'http',
    path?: string,                  // default: '/mcp'
    stateless?: boolean,            // default: false (stateful)
    sessionStore?: McpSessionStore, // default: CacheableSessionStore(new Cacheable())
  },
  authorization?: AuthorizationConfig,
  tokenValidator?: TokenValidator,
});
```

## Decorators

### `@McpTool(options)`

Declares an MCP tool. Compatible with NestJS's `@UseGuards`, `@UseInterceptors`, `@SetMetadata`.

```ts
@McpTool({
  name: 'forecast',
  description: 'Return a forecast for a city',
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.object({ tempC: z.number() }),
})
async forecast(input: { city: string }) {
  return { tempC: 21 };
}
```

The handler's return value is wrapped automatically:

- Returning a plain object → `{ content: [{ type: 'text', text: JSON.stringify(...) }], structuredContent: ... }`.
- Returning a value that already looks like a `CallToolResult` (has a `content` array) → passed through as-is.

### `@McpResource(options)`

Declares a static-URI resource. The handler returns the resource contents.

```ts
@McpResource({
  uri: 'app:///docs/readme',
  name: 'readme',
  description: 'The README',
  mimeType: 'text/markdown',
})
async readme() {
  return {
    contents: [{ uri: 'app:///docs/readme', mimeType: 'text/markdown', text: '# Hello' }],
  };
}
```

### `@McpPrompt(options)`

Declares a prompt template. The handler returns a `GetPromptResult`.

```ts
@McpPrompt({
  name: 'greet',
  description: 'Greet someone',
  argsSchema: z.object({ name: z.string() }),
})
greet(args: { name: string }) {
  return {
    messages: [{ role: 'user', content: { type: 'text', text: `Hello ${args.name}` } }],
  };
}
```

### `@McpApp(options)`

Stacks on top of `@McpTool` to declare an [MCP App](https://github.com/modelcontextprotocol/ext-apps) — an interactive HTML view that MCP hosts render inline. Exactly one of `html`, `file` or `url` must be provided.

```ts
@McpTool({ name: 'budget', inputSchema: BudgetInput })
@McpApp({
  uri: 'ui://budget/widget',
  html: '<!doctype html><title>Budget</title><div id="root"></div>',
})
async allocate(input: BudgetInput) { ... }
```

The `ui://` resource is registered automatically; the tool's result gets `_meta['mcp/ui'] = { uri }` so compatible hosts know to render it. See [`examples/mcp-app`](./examples/mcp-app) for a complete demo.

## Transport

Stateful is the default because every current MCP client (Claude Desktop, Cursor, MCP Inspector) requires it.

- `stateful` — a `mcp-session-id` header is issued on `initialize` and reused across requests. The same `McpServer` + `Transport` pair handles all calls for that session. Transports live per node; for cross-node continuity, use sticky load-balancing.
- `stateless` — fresh transport per request. Suitable for serverless. Set `transport.stateless: true`.

### Distributed sessions

```ts
import { Cacheable } from 'cacheable';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CacheableSessionStore } from '@getlarge/nestjs-mcp-server';

const cacheable = new Cacheable({
  secondary: new Keyv({ store: new KeyvRedis('redis://localhost:6379') }),
});

McpModule.forRoot({
  serverInfo: { name: 'mcp', version: '1.0.0' },
  transport: {
    type: 'http',
    path: '/mcp',
    sessionStore: new CacheableSessionStore(cacheable),
  },
});
```

The session **metadata** persists across nodes; the actual transport objects (which hold open HTTP/SSE streams) stay node-local. Configure sticky sessions on your load balancer.

Implement `McpSessionStore` directly if you want a backend other than Keyv.

## Authorization

Opt in by passing `authorization.enabled: true`. When enabled, the module mounts `.well-known/oauth-protected-resource` (RFC 9728) on the chosen adapter and exposes `McpAuthGuard` so individual tools can require valid tokens with specific scopes.

```ts
McpModule.forRoot({
  serverInfo: { name: 'mcp', version: '1.0.0' },
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

Per-tool enforcement:

```ts
import { UseGuards } from '@nestjs/common';
import { McpAuthGuard, McpScopes, McpTool } from '@getlarge/nestjs-mcp-server';

@McpTool({ name: 'delete-record', inputSchema: z.object({ id: z.string() }) })
@UseGuards(McpAuthGuard)
@McpScopes('records:write')
async deleteRecord(input: { id: string }) { ... }
```

Token verification defaults to the bundled `JwksTokenValidator`, which:

1. Validates JWTs against `jwksUri` using `fast-jwt`.
2. Falls back to RFC 7662 introspection if `introspectionEndpoint` is set.
3. Supports `bearer`, `basic` or `none` introspection auth (Ory, RFC 7662, opaque).

Custom verifier:

```ts
McpModule.forRoot({
  // ...
  tokenValidator: {
    async validateToken(token) {
      // your verification
      return { valid: true, payload: { sub: '...', scope: 'a b' } };
    },
  },
});
```

See [`examples/oauth2`](./examples/oauth2) for a complete setup including Ory Hydra.

## NestJS integration

### Dependency injection in handlers

Tool / resource / prompt handlers are regular provider methods. Inject dependencies through the provider constructor as you normally would:

```ts
@Injectable()
class ForecastTools {
  constructor(private readonly api: WeatherApiClient) {}

  @McpTool({ name: 'forecast', inputSchema: ForecastInput })
  async forecast(input: ForecastInput) {
    return this.api.fetch(input.city);
  }
}
```

### Per-tool guards and interceptors

`@UseGuards` and `@UseInterceptors` on a decorated method apply to that single tool call. The module runs them through a custom `McpPipelineRunner` so the order matches NestJS controllers: guards → interceptors (before) → handler → interceptors (after).

```ts
@McpTool({ name: 'expensive', inputSchema: z.object({}) })
@UseGuards(RateLimitGuard)
@UseInterceptors(LoggingInterceptor)
async expensive() { ... }
```

### Provider scopes

The `McpServer` itself is built fresh per session (stateful) or per request (stateless). Provider instances follow standard NestJS scoping: singleton providers are shared across sessions; mark a provider `@Injectable({ scope: Scope.REQUEST })` if you need per-call isolation.

## Lifecycle

`McpModule` implements `NestModule.configure` so it registers the `/mcp` route during the early middleware phase. This is intentional: Nest's Express adapter installs its 404 handler during `init`, so any route mounted from `onApplicationBootstrap` would be shadowed.

If you wrap `McpModule` in a custom module, make sure to forward Nest's lifecycle hooks correctly.

## Trade-offs and known issues

- **Sticky sessions**: stateful transports live per node. Cross-node continuity requires sticky load-balancing — session metadata can persist via Redis but the open SSE stream cannot move.
- **Hono drain-timer log noise**: `@modelcontextprotocol/sdk@1.29`'s Node-server transport uses `@hono/node-server` internally and schedules a 30-second drain timer per request. After tests tear down their HTTP servers, that timer may fire and print `TypeError: socket.destroySoon is not a function`. The crash is post-test, doesn't affect outcomes, and is tracked upstream.
- **`tsconfig` `noPropertyAccessFromIndexSignature`**: if your `tsconfig` enables this rule, use bracket access (`headers['authorization']`) instead of dot notation in custom guards.

## Deferred to follow-ups

The following live in [issue #119](https://github.com/getlarge/nestjs-tools/issues/119):

- `@McpCompletion` decorator
- DCR (Dynamic Client Registration) proxy
- `class-validator` → `zod` bridge
- stdio transport bootstrap

## License

Apache-2.0
