import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { IncomingMessage, ServerResponse } from 'node:http';

import { McpHttpAdapter } from './mcp-http-adapter';

export interface McpStreamableMountOptions {
  path: string;
  stateless: boolean;
  /**
   * Build (or reuse) the McpServer for a given session. Stateless mode receives
   * undefined sessionId and is expected to return a fresh server each call.
   */
  buildServer: (sessionId: string | undefined) => McpServer;
}

interface FastifyLike {
  all(
    path: string,
    handler: (
      request: { raw: IncomingMessage; body: unknown },
      reply: { raw: ServerResponse; hijack(): void }
    ) => unknown
  ): unknown;
  removeAllContentTypeParsers?(): unknown;
  addContentTypeParser?(
    type: string,
    options: { parseAs: 'string' },
    handler: (
      _req: unknown,
      body: string,
      done: (err: Error | null, value?: unknown) => void
    ) => void
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

export function mountStreamableHttp(
  http: McpHttpAdapter,
  options: McpStreamableMountOptions
): void {
  if (http.kind === 'fastify') {
    mountFastify(http.adapter.getInstance() as FastifyLike, options);
    return;
  }
  if (http.kind === 'express') {
    mountExpress(http.adapter.getInstance() as ExpressLike, options);
  }
}

function mountFastify(
  instance: FastifyLike,
  options: McpStreamableMountOptions
): void {
  // Ensure JSON arrives as a parsed object on Fastify.
  instance.all(options.path, async (request, reply) => {
    reply.hijack();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: options.stateless ? undefined : () => randomId(),
      enableJsonResponse: true,
    });
    const server = options.buildServer(transport.sessionId);
    await server.connect(transport);
    const reqWithAuth = attachAuth(request.raw);
    await transport.handleRequest(
      reqWithAuth as Parameters<typeof transport.handleRequest>[0],
      reply.raw,
      request.body
    );
    transport.onclose = (): void => {
      void server.close();
    };
  });
}

function mountExpress(
  instance: ExpressLike,
  options: McpStreamableMountOptions
): void {
  instance.all(options.path, async (req, res, next) => {
    try {
      const body = await readJsonBody(req);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: options.stateless ? undefined : () => randomId(),
        enableJsonResponse: true,
      });
      const server = options.buildServer(transport.sessionId);
      await server.connect(transport);
      const reqWithAuth = attachAuth(req);
      await transport.handleRequest(
        reqWithAuth as Parameters<typeof transport.handleRequest>[0],
        res,
        body
      );
      transport.onclose = (): void => {
        void server.close();
      };
    } catch (err) {
      next(err);
    }
  });
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
  req: IncomingMessage & { auth?: { token: string; clientId: string; scopes: string[] } }
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
