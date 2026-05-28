import type { AbstractHttpAdapter } from '@nestjs/core';

export interface McpHttpAdapter {
  readonly kind: 'fastify' | 'express';
  readonly adapter: AbstractHttpAdapter;
}

export class FastifyMcpAdapter implements McpHttpAdapter {
  readonly kind = 'fastify';
  constructor(public readonly adapter: AbstractHttpAdapter) {}
}

export class ExpressMcpAdapter implements McpHttpAdapter {
  readonly kind = 'express';
  constructor(public readonly adapter: AbstractHttpAdapter) {}
}

export function resolveMcpHttpAdapter(
  adapter: AbstractHttpAdapter
): McpHttpAdapter {
  const type = readAdapterType(adapter);
  if (type === 'fastify') return new FastifyMcpAdapter(adapter);
  if (type === 'express') return new ExpressMcpAdapter(adapter);
  throw new Error(
    `Unsupported HTTP adapter for nestjs-mcp-server. Expected a FastifyAdapter or ExpressAdapter, got ${describe(adapter)}.`
  );
}

function readAdapterType(
  adapter: AbstractHttpAdapter
): 'fastify' | 'express' | null {
  const candidate = adapter as {
    getType?: () => string;
    constructor?: { name?: string };
  };
  if (typeof candidate.getType === 'function') {
    const type = candidate.getType();
    if (type === 'fastify' || type === 'express') return type;
  }
  const ctorName = candidate.constructor?.name ?? '';
  if (ctorName === 'FastifyAdapter') return 'fastify';
  if (ctorName === 'ExpressAdapter') return 'express';
  return null;
}

function describe(adapter: unknown): string {
  if (adapter && typeof adapter === 'object') {
    return (adapter as { constructor?: { name?: string } }).constructor?.name ?? 'unknown';
  }
  return typeof adapter;
}
