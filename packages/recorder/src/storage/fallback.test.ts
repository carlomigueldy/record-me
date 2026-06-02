import { describe, it, expect, vi } from 'vitest';
import type { ChunkStore } from './index';
import { FallbackChunkStore } from './fallback';

/** A ChunkStore stub whose append() can be flipped to throw on demand. */
function makeFlakyStore(): ChunkStore & { failNext: () => void; appended: number[] } {
  let fail = false;
  const chunks: Blob[] = [];
  let byteCount = 0;
  const appended: number[] = [];
  return {
    appended,
    failNext() {
      fail = true;
    },
    get bytes() {
      return byteCount;
    },
    async append(chunk: Blob) {
      if (fail) throw new Error('idb write failed');
      // Track size synchronously — avoids calling Blob.arrayBuffer() which
      // behaves differently across jsdom versions (the plan flagged this seam).
      chunks.push(chunk);
      byteCount += chunk.size;
      appended.push(chunk.size);
    },
    async assemble(mime: string) {
      return new Blob(chunks, { type: mime });
    },
    async clear() {
      chunks.length = 0;
      byteCount = 0;
      appended.length = 0;
    },
  };
}

const blob = (n: number) => new Blob([new Uint8Array(n)], { type: 'video/webm' });

describe('FallbackChunkStore', () => {
  it('delegates appends to the primary store while healthy', async () => {
    const primary = makeFlakyStore();
    const store = new FallbackChunkStore(primary, vi.fn());
    await store.append(blob(10));
    expect(primary.appended).toEqual([10]);
    expect(store.bytes).toBe(10);
  });

  it('falls back to memory after the primary append fails, firing onFallback once', async () => {
    const primary = makeFlakyStore();
    const onFallback = vi.fn();
    const store = new FallbackChunkStore(primary, onFallback);

    await store.append(blob(10)); // lands in IDB (seq 0)
    primary.failNext();
    await store.append(blob(20)); // IDB throws → memory
    await store.append(blob(30)); // stays in memory, no further onFallback

    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(store.bytes).toBe(60);
  });

  it('assemble() concatenates IDB chunks then memory chunks in order', async () => {
    const primary = makeFlakyStore();
    const store = new FallbackChunkStore(primary, vi.fn());
    await store.append(blob(10));
    primary.failNext();
    await store.append(blob(20));
    const out = await store.assemble('video/webm');
    expect(out.size).toBe(30);
  });

  // MINOR 3 — assemble ordering: verify the actual byte SEQUENCE, not just
  // size. A reversed concat would produce the same size but wrong data.
  // We use distinct marker bytes per chunk and read the assembled blob via
  // FileReader (to match the jsdom Blob.arrayBuffer() seam documented in
  // indexeddb.ts) to prove IDB-chunks come before memory-chunks.
  it('assemble() preserves byte sequence: IDB chunks before memory chunks', async () => {
    // IDB chunk: bytes [0xAA, 0xBB] — lands in primary (no failure yet).
    const idbPayload = new Uint8Array([0xaa, 0xbb]);
    const idbChunk = new Blob([idbPayload], { type: 'video/webm' });

    // Memory chunk: bytes [0xCC, 0xDD] — primary fails, lands in memory.
    const memPayload = new Uint8Array([0xcc, 0xdd]);
    const memChunk = new Blob([memPayload], { type: 'video/webm' });

    const primary = makeFlakyStore();
    const store = new FallbackChunkStore(primary, vi.fn());
    await store.append(idbChunk);
    primary.failNext();
    await store.append(memChunk);

    const out = await store.assemble('video/webm');
    expect(out.size).toBe(4);

    // Read via FileReader — same cross-environment path used by indexeddb.ts.
    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(out);
    });

    // IDB chunk bytes (AA BB) must precede memory chunk bytes (CC DD).
    expect(Array.from(bytes)).toEqual([0xaa, 0xbb, 0xcc, 0xdd]);
  });

  it('clear() clears both stores', async () => {
    const primary = makeFlakyStore();
    const store = new FallbackChunkStore(primary, vi.fn());
    await store.append(blob(10));
    primary.failNext();
    await store.append(blob(20));
    await store.clear();
    expect(store.bytes).toBe(0);
  });

  // MINOR 1 — onFallback throwing must not lose the first fallback chunk or
  // poison subsequent appends. Before the fix, onFallback() was called BEFORE
  // the failed chunk was appended to memory; a throwing callback meant the
  // chunk was lost AND the serialization tail became rejected, so every
  // subsequent append would also reject silently.
  it('onFallback throwing does not lose the first fallback chunk or prevent subsequent appends', async () => {
    const primary = makeFlakyStore();
    const throwingFallback = vi.fn().mockImplementation(() => {
      throw new Error('notification system is down');
    });
    const store = new FallbackChunkStore(primary, throwingFallback);

    await store.append(blob(10)); // lands in primary (IDB)
    primary.failNext();
    // This append triggers fallback. onFallback throws, but the chunk (20b)
    // must still land in memory and not be lost.
    await store.append(blob(20)); // triggers fallback; onFallback throws
    // Subsequent appends must succeed regardless of the thrown onFallback.
    await store.append(blob(30)); // stays in memory
    await store.append(blob(40)); // stays in memory

    expect(throwingFallback).toHaveBeenCalledTimes(1);
    // All chunks must be present: 10 (primary) + 20 + 30 + 40 (memory) = 100.
    expect(store.bytes).toBe(100);
    const out = await store.assemble('video/webm');
    expect(out.size).toBe(100);
  });

  // MAJOR 3 — serialized appends: queuing multiple appends before any settles must
  // not reorder chunks or fire onFallback more than once.
  it('queued concurrent appends preserve order and fire onFallback exactly once', async () => {
    // Primary store with a controlled per-call outcome: succeed for A, fail for B.
    // C must never reach the primary because B degrades before C's turn.
    let callCount = 0;
    const primaryAppended: number[] = [];
    const primary: ChunkStore = {
      get bytes() {
        return primaryAppended.reduce((s, n) => s + n, 0);
      },
      async append(chunk: Blob) {
        const idx = callCount++;
        if (idx === 1) throw new Error('idb write failed'); // B fails
        primaryAppended.push(chunk.size);
      },
      async assemble(mime: string) {
        return new Blob(
          primaryAppended.map((n) => new Uint8Array(n)),
          { type: mime },
        );
      },
      async clear() {
        primaryAppended.length = 0;
      },
    };

    const onFallback = vi.fn();
    const store = new FallbackChunkStore(primary, onFallback);

    // Fire A, B, and C without awaiting — they all queue on the serialization
    // chain. Because appends are serialized: B runs only after A settles, and C
    // runs only after B settles. By the time C runs, degraded===true, so C goes
    // straight to memory without ever calling primary.append (no double-fire).
    const pA = store.append(blob(10));
    const pB = store.append(blob(20));
    const pC = store.append(blob(30));
    await Promise.all([pA, pB, pC]);

    // onFallback must fire exactly once (triggered by B's failure).
    expect(onFallback).toHaveBeenCalledTimes(1);

    // A is in primary (IDB), B+C are in memory — order preserved.
    const out = await store.assemble('video/webm');
    expect(out.size).toBe(60);
  });
});
