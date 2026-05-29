# Basic example

A minimal `@getlarge/nestjs-mcp-server` setup with one tool, one resource and one prompt over Streamable HTTP on Fastify.

## Run

```sh
npm install
npm run start
```

The server listens on `http://localhost:3000/mcp`.

## Try it

In another terminal:

```sh
npm run client
```

This calls `tools/list`, `tools/call` (`forecast`), `resources/list`, `resources/read` and `prompts/get` using the official MCP SDK client.

## Files

- `src/main.ts` — the Nest app: `WeatherTools` provider + `McpModule.forRoot({...})`.
- `src/client.ts` — script that drives the server through the SDK client.
