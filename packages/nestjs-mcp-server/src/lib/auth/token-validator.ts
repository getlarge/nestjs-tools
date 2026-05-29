import { TokenValidationResult } from './authorization-config';

export interface TokenValidator {
  validateToken(token: string): Promise<TokenValidationResult>;
}

export const MCP_TOKEN_VALIDATOR = Symbol.for('nestjs-mcp-server:token-validator');
