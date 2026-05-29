export type IntrospectionAuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'basic'; clientId: string; clientSecret: string }
  | { type: 'none' };

export interface TokenValidationConfig {
  introspectionEndpoint?: string;
  jwksUri?: string;
  validateAudience?: boolean;
  introspectionAuth?: IntrospectionAuthConfig;
}

export interface OAuth2ClientConfig {
  clientId?: string;
  clientSecret?: string;
  authorizationServer: string;
  resourceUri?: string;
  scopes?: string[];
  dynamicRegistration?: boolean;
}

export interface DcrHooks {
  upstreamEndpoint: string;
  onRequest?: (request: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
  onResponse?: (
    response: Record<string, unknown>,
    request: Record<string, unknown>,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

export type AuthorizationConfig =
  | { enabled: false }
  | {
      enabled: true;
      authorizationServers: string[];
      resourceUri: string;
      excludedPaths?: (string | RegExp)[];
      tokenValidation: TokenValidationConfig;
      oauth2Client?: OAuth2ClientConfig;
      dcrHooks?: DcrHooks;
    };

export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: Record<string, unknown>;
  error?: string;
}

export function buildProtectedResourceMetadata(config: AuthorizationConfig): ProtectedResourceMetadata {
  if (!config.enabled) {
    throw new Error('Cannot build protected resource metadata when authorization is disabled');
  }
  return {
    resource: config.resourceUri,
    authorization_servers: config.authorizationServers,
  };
}

export function buildWwwAuthenticateHeader(config: AuthorizationConfig): string {
  if (!config.enabled) {
    throw new Error('Cannot build WWW-Authenticate header when authorization is disabled');
  }
  const resourceMetadataUrl = `${config.resourceUri}/.well-known/oauth-protected-resource`;
  return `Bearer realm="MCP Server", resource_metadata="${resourceMetadataUrl}"`;
}
