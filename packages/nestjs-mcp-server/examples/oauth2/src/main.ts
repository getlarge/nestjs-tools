import 'reflect-metadata';

import { Injectable, Module, UseGuards } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  McpAuthGuard,
  McpModule,
  McpScopes,
  McpTool,
  TokenValidationResult,
  TokenValidator,
} from '@getlarge/nestjs-mcp-server';
import { z } from 'zod';

/**
 * Stub TokenValidator for demo purposes. In production replace this with the
 * bundled JwksTokenValidator (or your own implementation):
 *
 *   import { JwksTokenValidator } from '@getlarge/nestjs-mcp-server';
 *   import buildGetJwks from 'get-jwks';
 *
 *   const getJwks = buildGetJwks({ max: 50, ttl: 600_000 });
 *   const validator = new JwksTokenValidator(authConfig, {
 *     getJwks: {
 *       getPublicKey: ({ kid, alg }) =>
 *         getJwks.getPublicKey({ kid, alg, domain: 'https://idp.example.com' }),
 *     },
 *   });
 */
const demoValidator: TokenValidator = {
  async validateToken(token: string): Promise<TokenValidationResult> {
    if (token === 'admin-token') {
      return {
        valid: true,
        payload: {
          sub: 'alice',
          scope: 'records:write records:read',
          aud: 'https://mcp.example.com',
        },
      };
    }
    if (token === 'reader-token') {
      return {
        valid: true,
        payload: {
          sub: 'bob',
          scope: 'records:read',
          aud: 'https://mcp.example.com',
        },
      };
    }
    return { valid: false, error: 'Unknown token' };
  },
};

@Injectable()
class RecordTools {
  private readonly records = new Map<string, string>();

  @McpTool({
    name: 'list-records',
    description: 'List record ids (read scope)',
    inputSchema: z.object({}),
    outputSchema: z.object({ ids: z.array(z.string()) }),
  })
  @UseGuards(McpAuthGuard)
  @McpScopes('records:read')
  async list() {
    return { ids: Array.from(this.records.keys()) };
  }

  @McpTool({
    name: 'write-record',
    description: 'Create or update a record (write scope)',
    inputSchema: z.object({ id: z.string(), value: z.string() }),
    outputSchema: z.object({ ok: z.boolean() }),
  })
  @UseGuards(McpAuthGuard)
  @McpScopes('records:write')
  async write(input: { id: string; value: string }) {
    this.records.set(input.id, input.value);
    return { ok: true };
  }
}

@Module({
  imports: [
    McpModule.forRoot({
      serverInfo: { name: 'records-mcp', version: '1.0.0' },
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
      tokenValidator: demoValidator,
    }),
  ],
  providers: [RecordTools],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = Number(process.env['PORT'] ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`MCP server listening on http://localhost:${port}/mcp`);
  console.log(`Protected-resource metadata at`);
  console.log(`  http://localhost:${port}/.well-known/oauth-protected-resource`);
}

void bootstrap();
