import {
  AuthorizationConfig,
  buildProtectedResourceMetadata,
} from '../auth/authorization-config';
import { McpHttpAdapter } from './mcp-http-adapter';

const PROTECTED_RESOURCE_PATH = '/.well-known/oauth-protected-resource';

interface FastifyRouter {
  get(
    path: string,
    handler: (req: unknown, reply: FastifyReply) => unknown
  ): unknown;
}

interface FastifyReply {
  code(status: number): FastifyReply;
  header(name: string, value: string): FastifyReply;
  send(payload: unknown): unknown;
}

interface ExpressRouter {
  get(
    path: string,
    handler: (req: unknown, res: ExpressResponse) => unknown
  ): unknown;
}

interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(body: unknown): unknown;
}

export function mountWellKnownRoutes(
  http: McpHttpAdapter,
  config: AuthorizationConfig
): void {
  if (!config.enabled) return;
  const metadata = buildProtectedResourceMetadata(config);
  if (http.kind === 'fastify') {
    mountFastify(http.adapter.getInstance() as FastifyRouter, metadata);
    return;
  }
  if (http.kind === 'express') {
    mountExpress(http.adapter.getInstance() as ExpressRouter, metadata);
    return;
  }
}

function mountFastify(
  instance: FastifyRouter,
  metadata: ReturnType<typeof buildProtectedResourceMetadata>
): void {
  instance.get(PROTECTED_RESOURCE_PATH, (_req, reply) =>
    reply.code(200).header('content-type', 'application/json').send(metadata)
  );
}

function mountExpress(
  instance: ExpressRouter,
  metadata: ReturnType<typeof buildProtectedResourceMetadata>
): void {
  instance.get(PROTECTED_RESOURCE_PATH, (_req, res) =>
    res.status(200).json(metadata)
  );
}
