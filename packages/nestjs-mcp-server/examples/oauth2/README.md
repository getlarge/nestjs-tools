# OAuth2 example

Shows `McpAuthGuard`, `@McpScopes()` and the bundled `.well-known/oauth-protected-resource` (RFC 9728) metadata route.

For brevity this example uses a stub `TokenValidator` that recognises two hardcoded bearer tokens. The wiring (config shape, guards, scopes, `.well-known` mounting) is identical to a real deployment — only the validator changes. The top of `src/main.ts` shows how to plug in the bundled `JwksTokenValidator` against a real IdP (Ory Hydra, Keycloak, Auth0, etc.).

## Run

```sh
npm install
npm run start
```

The server listens on `http://localhost:3001/mcp`.

Open the metadata endpoint to confirm the discovery document is mounted:

```sh
curl http://localhost:3001/.well-known/oauth-protected-resource
```

## Try it

```sh
npm run client
```

The client makes three sets of calls:

1. With `admin-token` — has both `records:write` and `records:read`; both tool calls succeed.
2. With `reader-token` — has only `records:read`; `write-record` is rejected as a JSON-RPC error from the server.
3. With no token — both calls are rejected.

## Production wiring

Replace `demoValidator` in `src/main.ts` with the bundled JWKS validator:

```ts
import { JwksTokenValidator } from '@getlarge/nestjs-mcp-server';
import buildGetJwks from 'get-jwks';

const getJwks = buildGetJwks({ max: 50, ttl: 600_000 });

const validator = new JwksTokenValidator(authConfig, {
  getJwks: {
    getPublicKey: ({ kid, alg }) =>
      getJwks.getPublicKey({
        kid,
        alg,
        domain: 'https://idp.example.com',
      }),
  },
});
```

The same `JwksTokenValidator` falls back to RFC 7662 token introspection when `tokenValidation.introspectionEndpoint` is set — useful for opaque tokens (Ory Kratos sessions, etc.).
