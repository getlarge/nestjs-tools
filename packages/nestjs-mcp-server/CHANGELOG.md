## 0.1.0 (unreleased)

Initial release.

- `@McpTool`, `@McpResource`, `@McpPrompt`, `@McpApp`, `@McpScopes` decorators.
- `McpModule.forRoot` with adapter-agnostic Streamable HTTP transport (Fastify + Express).
- Stateful by default with pluggable `McpSessionStore` (memory via `cacheable`; Redis/Keyv for distributed).
- Opt-in OAuth2 authorization with `McpAuthGuard`, `JwksTokenValidator` (JWKS + RFC 7662 introspection), and RFC 9728 `/.well-known/oauth-protected-resource`.
- MCP Apps extension support via `@McpApp` (inline HTML, file, or external URL).
