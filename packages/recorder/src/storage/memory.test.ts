// packages/recorder/src/storage/memory.test.ts
import { describe, it, expect } from 'vitest';
import { MemoryChunkStore } from './memory';

describe('MemoryChunkStore', () => {
  it('starts at 0 bytes', () => {
    const store = new MemoryChunkStore();
    expect(store.bytes).toBe(0);
  });

  it('accumulates bytes as chunks are appended', async () => {
    const store = new MemoryChunkStore();
    await store.append(new Blob([new Uint8Array(100)], { type: 'video/mp4' }));
    await store.append(new Blob([new Uint8Array(50)], { type: 'video/mp4' }));
    expect(store.bytes).toBe(150);
  });

  it('assembles chunks in append order into one blob with the requested mime', async () => {
    const store = new MemoryChunkStore();
    await store.append(new Blob([new Uint8Array([1, 2])]));
    await store.append(new Blob([new Uint8Array([3, 4])]));
    const assembled = await store.assemble('video/mp4');
    expect(assembled.size).toBe(4);
    expect(assembled.type).toBe('video/mp4');
  });

  it('clear() resets bytes and drops chunks', async () => {
    const store = new MemoryChunkStore();
    await store.append(new Blob([new Uint8Array(10)]));
    await store.clear();
    expect(store.bytes).toBe(0);
    const empty = await store.assemble('video/mp4');
    expect(empty.size).toBe(0);
  });
});
