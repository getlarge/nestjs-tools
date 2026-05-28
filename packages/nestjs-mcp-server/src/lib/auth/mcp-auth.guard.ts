import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { McpExecutionContext } from '../execution/mcp-execution-context';
import { AuthorizationConfig } from './authorization-config';
import { MCP_SCOPES_METADATA } from './mcp-scopes.decorator';
import { MCP_TOKEN_VALIDATOR, TokenValidator } from './token-validator';

export const MCP_AUTH_CONFIG = Symbol.for('nestjs-mcp-server:auth-config');

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    @Inject(MCP_AUTH_CONFIG)
    @Optional()
    private readonly config: AuthorizationConfig | undefined,
    @Inject(MCP_TOKEN_VALIDATOR)
    @Optional()
    private readonly validator: TokenValidator | undefined,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.config || !this.config.enabled) {
      return true;
    }
    if (!this.validator) {
      throw new Error(
        'McpAuthGuard: authorization is enabled but no TokenValidator is bound (use MCP_TOKEN_VALIDATOR provider).'
      );
    }
    const mcp = context as McpExecutionContext;
    const token = this.extractToken(mcp);
    if (!token) {
      throw new UnauthorizedException('Authorization header required');
    }
    const result = await this.validator.validateToken(token);
    if (!result.valid || !result.payload) {
      throw new UnauthorizedException(result.error ?? 'Invalid token');
    }
    const required = this.getRequiredScopes(mcp);
    if (required.length > 0) {
      const granted = this.extractScopes(result.payload);
      const missing = required.filter((scope) => !granted.includes(scope));
      if (missing.length > 0) {
        throw new ForbiddenException(
          `Missing required MCP scope(s): ${missing.join(', ')}`
        );
      }
    }
    return true;
  }

  private extractToken(ctx: McpExecutionContext): string | undefined {
    const request = ctx.getMcpRequest();
    if (request.auth?.token) return request.auth.token;
    const httpReq = ctx.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const header = httpReq?.headers?.['authorization'];
    const raw = Array.isArray(header) ? header[0] : header;
    if (!raw || typeof raw !== 'string') return undefined;
    if (!raw.toLowerCase().startsWith('bearer ')) return undefined;
    return raw.slice(7).trim() || undefined;
  }

  private getRequiredScopes(ctx: McpExecutionContext): string[] {
    return (
      this.reflector.getAllAndOverride<string[]>(MCP_SCOPES_METADATA, [
        ctx.getOriginalMethod() ?? ctx.getHandler(),
        ctx.getClass(),
      ]) ?? []
    );
  }

  private extractScopes(payload: Record<string, unknown>): string[] {
    const scope = payload['scope'];
    if (typeof scope === 'string') return scope.split(/\s+/).filter(Boolean);
    if (Array.isArray(payload['scopes'])) {
      return (payload['scopes'] as unknown[]).filter(
        (s): s is string => typeof s === 'string'
      );
    }
    return [];
  }
}
