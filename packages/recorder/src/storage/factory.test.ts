// packages/recorder/src/storage/factory.test.ts
import { describe, it, expect } from 'vitest';
import { createChunkStore } from './index';
import { MemoryChunkStore } from './memory';
import { IndexedDbChunkStore } from './indexeddb';

describe('createChunkStore', () => {
  it('strategy="memory" always returns MemoryChunkStore', () => {
    const a = createChunkStore({ strategy: 'memory', maxDurationMs: 1_000 });
    const b = createChunkStore({ strategy: 'memory', maxDurationMs: 60 * 60_000 });
    expect(a).toBeInstanceOf(MemoryChunkStore);
    expect(b).toBeInstanceOf(MemoryChunkStore);
  });

  it('strategy="indexeddb" always returns IndexedDbChunkStore', () => {
    const store = createChunkStore({
      strategy: 'indexeddb',
      maxDurationMs: 1_000,
      sessionId: 'sess-a',
    });
    expect(store).toBeInstanceOf(IndexedDbChunkStore);
  });

  it('strategy="auto" picks memory for caps ≤ 10 minutes', () => {
    const store = createChunkStore({ strategy: 'auto', maxDurationMs: 10 * 60_000 });
    expect(store).toBeInstanceOf(MemoryChunkStore);
  });

  it('strategy="auto" picks IDB for caps > 10 minutes', () => {
    const store = createChunkStore({
      strategy: 'auto',
      maxDurationMs: 10 * 60_000 + 1,
      sessionId: 'sess-auto',
    });
    expect(store).toBeInstanceOf(IndexedDbChunkStore);
  });

  it('auto-generates a session id for IDB when not provided', () => {
    const store = createChunkStore({ strategy: 'indexeddb', maxDurationMs: 60_000 });
    expect(store).toBeInstanceOf(IndexedDbChunkStore);
  });
});
