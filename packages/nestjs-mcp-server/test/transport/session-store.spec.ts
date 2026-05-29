import 'reflect-metadata';

import { Cacheable } from 'cacheable';

import { CacheableSessionStore, McpSessionMetadata } from '../../src';

const sample: McpSessionMetadata = {
  id: 'session-1',
  createdAt: new Date('2020-01-01T00:00:00Z'),
  lastActivity: new Date('2020-01-01T00:00:00Z'),
};

describe('CacheableSessionStore', () => {
  it('round-trips metadata through an in-memory Cacheable', async () => {
    const store = new CacheableSessionStore(new Cacheable());
    expect(await store.has(sample.id)).toBe(false);
    await store.set(sample);
    expect(await store.has(sample.id)).toBe(true);
    const round = await store.get(sample.id);
    expect(round?.id).toBe(sample.id);
    expect(round?.createdAt.getTime()).toBe(sample.createdAt.getTime());
  });

  it('deletes a session by id', async () => {
    const store = new CacheableSessionStore(new Cacheable());
    await store.set(sample);
    await store.delete(sample.id);
    expect(await store.has(sample.id)).toBe(false);
  });

  it('touch() updates lastActivity without reissuing the record', async () => {
    const store = new CacheableSessionStore(new Cacheable());
    await store.set(sample);
    await new Promise((r) => setTimeout(r, 5));
    await store.touch(sample.id);
    const refreshed = await store.get(sample.id);
    expect(refreshed?.lastActivity.getTime()).toBeGreaterThan(sample.lastActivity.getTime());
  });
});
