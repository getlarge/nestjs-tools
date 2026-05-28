import 'reflect-metadata';

import { generateKeyPairSync, randomBytes } from 'crypto';
import { createSigner } from 'fast-jwt';

import { JwksTokenValidator } from '../../src';

interface TestKey {
  privateKey: string;
  publicKey: string;
  kid: string;
}

function makeKey(): TestKey {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { format: 'pem', type: 'spki' },
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
  });
  return { privateKey, publicKey, kid: randomBytes(8).toString('hex') };
}

function signToken(
  key: TestKey,
  payload: Record<string, unknown> = {}
): string {
  const signer = createSigner({
    key: key.privateKey,
    algorithm: 'RS256',
    header: { kid: key.kid, alg: 'RS256' },
  });
  return signer(payload) as string;
}

const key = makeKey();
const audience = 'https://mcp.example.com';

describe('JwksTokenValidator JWKS path', () => {
  it('validates a JWT signed by a key the JWKS resolver returns', async () => {
    const validator = new JwksTokenValidator({
      enabled: true,
      authorizationServers: ['https://idp.example.com'],
      resourceUri: audience,
      tokenValidation: {
        jwksUri: 'https://idp.example.com/.well-known/jwks.json',
        validateAudience: true,
      },
    }, {
      getJwks: { getPublicKey: async () => key.publicKey },
    });
    const token = signToken(key, {
      sub: 'alice',
      aud: audience,
      scope: 'tools:read',
    });
    const result = await validator.validateToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload?.['sub']).toBe('alice');
  });

  it('rejects a token whose audience does not match', async () => {
    const validator = new JwksTokenValidator({
      enabled: true,
      authorizationServers: ['https://idp.example.com'],
      resourceUri: audience,
      tokenValidation: {
        jwksUri: 'https://idp.example.com/.well-known/jwks.json',
        validateAudience: true,
      },
    }, {
      getJwks: { getPublicKey: async () => key.publicKey },
    });
    const token = signToken(key, {
      sub: 'alice',
      aud: 'https://other.example.com',
    });
    const result = await validator.validateToken(token);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/audience/i);
  });

});

describe('JwksTokenValidator introspection path', () => {
  it('falls back to introspection when no JWKS is configured', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ active: true, sub: 'alice', scope: 'tools:write' }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );
    const validator = new JwksTokenValidator(
      {
        enabled: true,
        authorizationServers: ['https://idp.example.com'],
        resourceUri: audience,
        tokenValidation: {
          introspectionEndpoint: 'https://idp.example.com/introspect',
          introspectionAuth: { type: 'none' },
        },
      },
      { fetch: fetcher as unknown as typeof fetch }
    );
    const result = await validator.validateToken('opaque-token');
    expect(result.valid).toBe(true);
    expect(result.payload?.['sub']).toBe('alice');
    expect(fetcher).toHaveBeenCalled();
  });

  it('marks the token invalid when introspection returns active:false', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ active: false }), { status: 200 })
    );
    const validator = new JwksTokenValidator(
      {
        enabled: true,
        authorizationServers: ['https://idp.example.com'],
        resourceUri: audience,
        tokenValidation: {
          introspectionEndpoint: 'https://idp.example.com/introspect',
          introspectionAuth: { type: 'none' },
        },
      },
      { fetch: fetcher as unknown as typeof fetch }
    );
    const result = await validator.validateToken('expired');
    expect(result.valid).toBe(false);
  });
});
