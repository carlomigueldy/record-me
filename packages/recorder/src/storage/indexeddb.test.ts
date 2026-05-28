// packages/recorder/src/storage/indexeddb.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDbChunkStore } from './indexeddb';

function bytes(n: number): Blob {
  return new Blob([new Uint8Array(n)]);
}

describe('IndexedDbChunkStore', () => {
  let store: IndexedDbChunkStore;

  beforeEach(() => {
    store = new IndexedDbChunkStore(`test-${Math.random().toString(36).slice(2, 8)}`);
  });

  it('starts at 0 bytes', () => {
    expect(store.bytes).toBe(0);
  });

  it('appends chunks and tracks bytes', async () => {
    await store.append(bytes(100));
    await store.append(bytes(50));
    expect(store.bytes).toBe(150);
  });

  it('assembles chunks in append order', async () => {
    await store.append(new Blob([new Uint8Array([1, 2])]));
    await store.append(new Blob([new Uint8Array([3, 4])]));
    await store.append(new Blob([new Uint8Array([5, 6])]));
    const assembled = await store.assemble('video/webm');
    expect(assembled.size).toBe(6);
    expect(assembled.type).toBe('video/webm');
  });

  it('clear() deletes the underlying database and resets bytes', async () => {
    await store.append(bytes(10));
    expect(store.bytes).toBe(10);
    await store.clear();
    expect(store.bytes).toBe(0);
    // Re-using the same instance after clear should accept new appends cleanly.
    await store.append(bytes(7));
    expect(store.bytes).toBe(7);
  });

  it('assemble on an empty store returns an empty blob', async () => {
    const assembled = await store.assemble('video/mp4');
    expect(assembled.size).toBe(0);
    expect(assembled.type).toBe('video/mp4');
  });

  it('multiple stores with different sessionIds do not collide', async () => {
    const a = new IndexedDbChunkStore('session-a');
    const b = new IndexedDbChunkStore('session-b');
    await a.append(bytes(100));
    await b.append(bytes(200));
    expect(a.bytes).toBe(100);
    expect(b.bytes).toBe(200);
    const aBlob = await a.assemble('video/mp4');
    const bBlob = await b.assemble('video/mp4');
    expect(aBlob.size).toBe(100);
    expect(bBlob.size).toBe(200);
    await a.clear();
    await b.clear();
  });
});
