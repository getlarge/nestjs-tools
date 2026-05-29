# MCP App example

Shows the `@McpApp` decorator: a tool that ships an interactive HTML widget alongside its result. Compatible MCP hosts (Claude Desktop, ChatGPT, MCP Inspector, etc.) render the widget inline in the conversation in a sandboxed iframe.

This example uses inline HTML for brevity. `@McpApp` also accepts `file:` (path to a built HTML file — useful for React/Vue/Svelte bundles) and `url:` (externally-hosted bundle on a CDN).

## Run

```sh
npm install
npm run start
```

The server listens on `http://localhost:3002/mcp`.

## Try it

```sh
npm run client
```

The script calls the `budget` tool and:

1. Logs the structured content the model gets.
2. Logs the `_meta['mcp/ui']` envelope — that's the hint to MCP hosts that the result has a UI companion.
3. Fetches the `ui://budget/widget` resource directly to confirm the HTML is served.

For the interactive experience, point an MCP-Apps-compatible host at this server.

## Files

- `src/main.ts` — the Nest app: a `BudgetTools` provider that stacks `@McpTool` + `@McpApp`.
- `src/client.ts` — script that exercises the tool and resource.

## Background

See the [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps) for the full protocol — including the postMessage bridge between host and iframe, supported clients, and starter templates for React, Vue, Svelte, Solid, Preact and vanilla JS.
