import { Cacheable } from 'cacheable';

export interface McpSessionMetadata {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  authorization?: Record<string, unknown>;
}

export interface McpSessionStore {
  get(id: string): Promise<McpSessionMetadata | null>;
  set(metadata: McpSessionMetadata): Promise<void>;
  has(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
  touch(id: string): Promise<void>;
}

interface SerializedSession {
  id: string;
  createdAt: string;
  lastActivity: string;
  authorization?: Record<string, unknown>;
}

const KEY_PREFIX = 'mcp:session:';

export class CacheableSessionStore implements McpSessionStore {
  constructor(
    private readonly cache: Cacheable,
    private readonly ttlMs: number = 60 * 60 * 1000,
  ) {}

  async get(id: string): Promise<McpSessionMetadata | null> {
    const raw = (await this.cache.get(this.key(id))) as SerializedSession | undefined | null;
    if (!raw) return null;
    return {
      id: raw.id,
      createdAt: new Date(raw.createdAt),
      lastActivity: new Date(raw.lastActivity),
      authorization: raw.authorization,
    };
  }

  async set(metadata: McpSessionMetadata): Promise<void> {
    const serialized: SerializedSession = {
      id: metadata.id,
      createdAt: metadata.createdAt.toISOString(),
      lastActivity: metadata.lastActivity.toISOString(),
      authorization: metadata.authorization,
    };
    await this.cache.set(this.key(metadata.id), serialized, this.ttlMs);
  }

  async has(id: string): Promise<boolean> {
    return Boolean(await this.cache.has(this.key(id)));
  }

  async delete(id: string): Promise<void> {
    await this.cache.delete(this.key(id));
  }

  async touch(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) return;
    existing.lastActivity = new Date();
    await this.set(existing);
  }

  private key(id: string): string {
    return `${KEY_PREFIX}${id}`;
  }
}
