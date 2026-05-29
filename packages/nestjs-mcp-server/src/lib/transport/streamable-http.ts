import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { IncomingMessage, ServerResponse } from 'node:http';

import { McpHttpAdapter } from './mcp-http-adapter';
import { McpSessionStore } from './session-store';

export interface McpStreamableMountOptions {
  path: string;
  stateless: boolean;
  /**
   * Build (or reuse) the McpServer for a given session. Stateless mode receives
   * undefined sessionId and is expected to return a fresh server each call.
   */
  buildServer: (sessionId: string | undefined) => McpServer;
  /**
   * Pluggable persistent session metadata store. In-memory by default; users
   * can pass a Cacheable instance backed by Redis or any Keyv store for
   * distributed deployments.
   */
  sessionStore?: McpSessionStore;
}

interface FastifyLike {
  all(
    path: string,
    handler: (
      request: { raw: IncomingMessage; body: unknown },
      reply: { raw: ServerResponse; hijack(): void }
    ) => unknown
  ): unknown;
}

interface ExpressLike {
  all(
    path: string,
    handler: (
      req: IncomingMessage & { body?: unknown },
      res: ServerResponse,
      next: (err?: unknown) => void
    ) => unknown
  ): unknown;
}

const SESSION_HEADER = 'mcp-session-id';

interface ActiveTransport {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
}

class TransportRegistry {
  private readonly transports = new Map<string, ActiveTransport>();

  get(id: string): ActiveTransport | undefined {
    return this.transports.get(id);
  }

  set(id: string, entry: ActiveTransport): void {
    this.transports.set(id, entry);
  }

  delete(id: string): void {
    this.transports.delete(id);
  }
}

export function mountStreamableHttp(
  http: McpHttpAdapter,
  options: McpStreamableMountOptions
): void {
  const registry = new TransportRegistry();
  if (http.kind === 'fastify') {
    mountFastify(http.adapter.getInstance() as FastifyLike, options, registry);
    return;
  }
  if (http.kind === 'express') {
    mountExpress(http.adapter.getInstance() as ExpressLike, options, registry);
  }
}

interface DispatchContext {
  options: McpStreamableMountOptions;
  registry: TransportRegistry;
}

function mountFastify(
  instance: FastifyLike,
  options: McpStreamableMountOptions,
  registry: TransportRegistry
): void {
  const ctx: DispatchContext = { options, registry };
  instance.all(options.path, async (request, reply) => {
    reply.hijack();
    await dispatch(ctx, request.raw, reply.raw, request.body);
  });
}

function mountExpress(
  instance: ExpressLike,
  options: McpStreamableMountOptions,
  registry: TransportRegistry
): void {
  const ctx: DispatchContext = { options, registry };
  instance.all(options.path, async (req, res, next) => {
    try {
      const body = await readJsonBody(req);
      await dispatch(ctx, req, res, body);
    } catch (err) {
      next(err);
    }
  });
}

async function dispatch(
  ctx: DispatchContext,
  rawReq: IncomingMessage,
  rawRes: ServerResponse,
  body: unknown
): Promise<void> {
  const req = attachAuth(rawReq);
  const incomingSessionId = readSessionId(req);
  if (incomingSessionId) {
    const existing = ctx.registry.get(incomingSessionId);
    if (existing) {
      await ctx.options.sessionStore?.touch(incomingSessionId);
      await existing.transport.handleRequest(
        req as Parameters<typeof existing.transport.handleRequest>[0],
        rawRes,
        body
      );
      return;
    }
  }
  await dispatchFreshTransport(ctx, req, rawRes, body);
}

async function dispatchFreshTransport(
  ctx: DispatchContext,
  req: IncomingMessage,
  rawRes: ServerResponse,
  body: unknown
): Promise<void> {
  const transport = buildTransport(ctx);
  const server = ctx.options.buildServer(transport.sessionId);
  await server.connect(transport);
  transport.onclose = (): void => {
    if (transport.sessionId) ctx.registry.delete(transport.sessionId);
    void server.close();
  };
  await transport.handleRequest(
    req as Parameters<typeof transport.handleRequest>[0],
    rawRes,
    body
  );
  if (!ctx.options.stateless && transport.sessionId) {
    ctx.registry.set(transport.sessionId, { transport, server });
  }
}

function buildTransport(
  ctx: DispatchContext
): StreamableHTTPServerTransport {
  return new StreamableHTTPServerTransport({
    sessionIdGenerator: ctx.options.stateless ? undefined : () => randomId(),
    enableJsonResponse: true,
    onsessioninitialized: ctx.options.stateless
      ? undefined
      : async (sessionId: string) => {
          await ctx.options.sessionStore?.set({
            id: sessionId,
            createdAt: new Date(),
            lastActivity: new Date(),
          });
        },
    onsessionclosed: ctx.options.stateless
      ? undefined
      : async (sessionId: string) => {
          ctx.registry.delete(sessionId);
          await ctx.options.sessionStore?.delete(sessionId);
        },
  });
}

function readSessionId(req: IncomingMessage): string | undefined {
  const value = req.headers?.[SESSION_HEADER];
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

async function readJsonBody(
  req: IncomingMessage & { body?: unknown }
): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) return req.body;
  if (req.method && req.method.toUpperCase() === 'GET') return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return undefined;
  return JSON.parse(raw);
}

function attachAuth(
  req: IncomingMessage & {
    auth?: { token: string; clientId: string; scopes: string[] };
  }
): IncomingMessage & {
  auth?: { token: string; clientId: string; scopes: string[] };
} {
  if (req.auth) return req;
  const header = req.headers?.authorization;
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw || typeof raw !== 'string') return req;
  if (!raw.toLowerCase().startsWith('bearer ')) return req;
  const token = raw.slice(7).trim();
  if (!token) return req;
  req.auth = { token, clientId: '', scopes: [] };
  return req;
}

function randomId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}
