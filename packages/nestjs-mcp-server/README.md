# @getlarge/nestjs-mcp-server

Build [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers idiomatically with NestJS.

> Status: pre-release, under active development.

## Features (v1 scope)

- Declarative MCP **tools**, **resources**, **prompts**, **completions** via decorators.
- Optional **MCP Apps** integration (`@McpApp`) for tools that ship interactive UIs.
- Full NestJS DI inside MCP handlers; **pipes / guards / interceptors / exception filters** apply per tool call.
- Adapter-agnostic: works with `@nestjs/platform-fastify` and `@nestjs/platform-express`.
- Pluggable **OAuth2** verification with `McpAuthGuard` + `@McpScopes()`.
- Opt-in **stateless** transport mode.

## Installation

```sh
npm install @getlarge/nestjs-mcp-server @modelcontextprotocol/sdk zod
# Optional, only if you use @McpApp:
npm install @modelcontextprotocol/ext-apps
```

## License

Apache-2.0
