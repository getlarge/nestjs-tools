## 0.2.1 (2026-05-29)

### 🩹 Fixes

- **nestjs-mcp-server:** republish from the built `dist/` artifact. `0.2.0` was accidentally published from the source root, so the tarball was missing the compiled JavaScript. `0.2.0` is now deprecated on npm; use `0.2.1` or later.

## 0.2.0 (2026-05-29)

### 🚀 Features

- **nestjs-mcp-server:** stateful StreamableHTTP with pluggable session store ([b6404df](https://github.com/getlarge/nestjs-tools/commit/b6404df))
- **nestjs-mcp-server:** mount StreamableHTTP transport on /mcp ([f98ec8e](https://github.com/getlarge/nestjs-tools/commit/f98ec8e))
- **nestjs-mcp-server:** add McpModule.forRoot wiring ([dfad57c](https://github.com/getlarge/nestjs-tools/commit/dfad57c))
- **nestjs-mcp-server:** add @McpApp for the MCP Apps extension ([6f9bb4a](https://github.com/getlarge/nestjs-tools/commit/6f9bb4a))
- **nestjs-mcp-server:** add @McpResource and @McpPrompt with registrars ([8626eeb](https://github.com/getlarge/nestjs-tools/commit/8626eeb))
- **nestjs-mcp-server:** add JwksTokenValidator (JWKS + introspection) ([d710b80](https://github.com/getlarge/nestjs-tools/commit/d710b80))
- **nestjs-mcp-server:** add McpAuthGuard and @McpScopes ([c735f1f](https://github.com/getlarge/nestjs-tools/commit/c735f1f))
- **nestjs-mcp-server:** opt-in well-known OAuth metadata routes ([23a0c9b](https://github.com/getlarge/nestjs-tools/commit/23a0c9b))
- **nestjs-mcp-server:** add transport adapter selection ([4d5a11b](https://github.com/getlarge/nestjs-tools/commit/4d5a11b))
- **nestjs-mcp-server:** add McpToolRegistrar ([07baa3f](https://github.com/getlarge/nestjs-tools/commit/07baa3f))
- **nestjs-mcp-server:** add McpPipelineRunner ([cd16612](https://github.com/getlarge/nestjs-tools/commit/cd16612))
- **nestjs-mcp-server:** add McpExecutionContext ([0b7a071](https://github.com/getlarge/nestjs-tools/commit/0b7a071))
- **nestjs-mcp-server:** add McpDiscoveryService ([51f1e7e](https://github.com/getlarge/nestjs-tools/commit/51f1e7e))
- **nestjs-mcp-server:** add @McpTool decorator ([996ce74](https://github.com/getlarge/nestjs-tools/commit/996ce74))
- **nestjs-mcp-server:** scaffold package and bootstrap failing test ([186ebee](https://github.com/getlarge/nestjs-tools/commit/186ebee))

### 🩹 Fixes

- **nestjs-mcp-server:** exclude examples/ from @nx/dependency-checks ([f03e24f](https://github.com/getlarge/nestjs-tools/commit/f03e24f))

### ❤️ Thank You

- LeGreffier @legreffier[bot]

## 0.1.0 (unreleased)

Initial release.

- `@McpTool`, `@McpResource`, `@McpPrompt`, `@McpApp`, `@McpScopes` decorators.
- `McpModule.forRoot` with adapter-agnostic Streamable HTTP transport (Fastify + Express).
- Stateful by default with pluggable `McpSessionStore` (memory via `cacheable`; Redis/Keyv for distributed).
- Opt-in OAuth2 authorization with `McpAuthGuard`, `JwksTokenValidator` (JWKS + RFC 7662 introspection), and RFC 9728 `/.well-known/oauth-protected-resource`.
- MCP Apps extension support via `@McpApp` (inline HTML, file, or external URL).
