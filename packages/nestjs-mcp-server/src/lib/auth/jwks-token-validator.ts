import { createVerifier } from 'fast-jwt';

import { AuthorizationConfig, IntrospectionAuthConfig, TokenValidationResult } from './authorization-config';
import { TokenValidator } from './token-validator';

export interface JwksFetcher {
  getPublicKey(args: { kid?: string; alg?: string }): Promise<string>;
}

export interface JwksTokenValidatorDeps {
  getJwks?: JwksFetcher;
  fetch?: typeof fetch;
}

type EnabledAuthorizationConfig = Extract<AuthorizationConfig, { enabled: true }>;

export class JwksTokenValidator implements TokenValidator {
  private readonly config?: EnabledAuthorizationConfig;
  private readonly verifier?: (token: string) => Promise<Record<string, unknown>>;
  private readonly fetcher: typeof fetch = globalThis.fetch;

  constructor(config: AuthorizationConfig, deps: JwksTokenValidatorDeps = {}) {
    if (!config.enabled) return;
    this.config = config;
    if (deps.fetch) this.fetcher = deps.fetch;
    if (config.tokenValidation.jwksUri && deps.getJwks) {
      this.verifier = this.buildVerifier(deps.getJwks);
    }
  }

  private buildVerifier(getJwks: JwksFetcher): (token: string) => Promise<Record<string, unknown>> {
    const getKey = async (info: { header?: { kid?: string; alg?: string } } = {}): Promise<string> =>
      getJwks.getPublicKey({
        kid: info.header?.kid,
        alg: info.header?.alg,
      });
    return createVerifier({
      key: getKey,
      algorithms: ['RS256', 'ES256'],
    }) as unknown as (token: string) => Promise<Record<string, unknown>>;
  }

  async validateToken(token: string): Promise<TokenValidationResult> {
    if (!this.config) {
      return { valid: false, error: 'Authorization is disabled' };
    }
    if (this.verifier) {
      try {
        const payload = await this.verifier(token);
        if (this.config.tokenValidation.validateAudience && !this.audienceMatches(payload)) {
          return { valid: false, error: 'Invalid audience claim' };
        }
        return { valid: true, payload };
      } catch (err) {
        if (!this.config.tokenValidation.introspectionEndpoint) {
          return { valid: false, error: this.errorMessage(err) };
        }
      }
    }
    if (this.config.tokenValidation.introspectionEndpoint) {
      return this.introspect(token);
    }
    return { valid: false, error: 'No token validation method configured' };
  }

  private audienceMatches(payload: Record<string, unknown>): boolean {
    if (!this.config) return false;
    const claim = payload['aud'];
    const expected = this.config.resourceUri;
    if (Array.isArray(claim)) return claim.some((aud) => typeof aud === 'string' && aud === expected);
    return claim === expected;
  }

  private async introspect(token: string): Promise<TokenValidationResult> {
    if (!this.config?.tokenValidation.introspectionEndpoint) {
      return { valid: false, error: 'No introspection endpoint configured' };
    }
    const headers = new Headers({
      'content-type': 'application/x-www-form-urlencoded',
    });
    this.applyIntrospectionAuth(headers, this.config.tokenValidation.introspectionAuth);
    const body = new URLSearchParams({ token }).toString();
    try {
      const response = await this.fetcher(this.config.tokenValidation.introspectionEndpoint, {
        method: 'POST',
        headers,
        body,
      });
      if (!response.ok) {
        return {
          valid: false,
          error: `Introspection failed with status ${response.status}`,
        };
      }
      const payload = (await response.json()) as Record<string, unknown>;
      if (!payload['active']) {
        return { valid: false, error: 'Token is not active' };
      }
      return { valid: true, payload };
    } catch (err) {
      return { valid: false, error: this.errorMessage(err) };
    }
  }

  private applyIntrospectionAuth(headers: Headers, auth?: IntrospectionAuthConfig): void {
    if (!auth || auth.type === 'none') return;
    if (auth.type === 'bearer') {
      headers.set('authorization', `Bearer ${auth.token}`);
      return;
    }
    if (auth.type === 'basic') {
      const encoded = Buffer.from(`${auth.clientId}:${auth.clientSecret}`).toString('base64');
      headers.set('authorization', `Basic ${encoded}`);
    }
  }

  private errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : 'Unknown validation error';
  }
}
