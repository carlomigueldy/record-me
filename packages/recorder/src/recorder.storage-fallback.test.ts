import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRecorder } from './recorder';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import { setDisplayMediaResponse, resetMediaDevices } from './test/mocks/media-devices';
import { flushAsync } from './test/factories';
import { IndexedDbChunkStore } from './storage/indexeddb';

afterEach(() => {
  MockMediaRecorder.reset();
  resetMediaDevices();
  vi.restoreAllMocks();
});

describe('createRecorder · storage fallback', () => {
  it('fires onStorageFallback when an IDB append fails mid-recording', async () => {
    // Force IDB strategy + spy on IndexedDbChunkStore.prototype.append to
    // simulate a write failure. This is the approved alternative seam: the
    // plan flagged that spying on indexedDB.open is brittle with fake-indexeddb,
    // and that "an acceptable alternative is to inject a failing store via the
    // storage seam". Spying on the prototype is minimally invasive — it still
    // exercises the FallbackChunkStore wiring through createChunkStore.
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onStorageFallback = vi.fn();

    // Make the first IDB append throw so the FallbackChunkStore degrades.
    vi.spyOn(IndexedDbChunkStore.prototype, 'append').mockRejectedValueOnce(
      new Error('simulated idb write failure'),
    );

    const handle = createRecorder({
      mode: 'screen+cursor',
      storage: 'indexeddb',
      onStorageFallback,
    });

    await handle.start();
    const mr = MockMediaRecorder.instances.at(-1)!;
    mr._emitChunk(1024);
    await flushAsync();
    await flushAsync();

    expect(onStorageFallback).toHaveBeenCalledTimes(1);

    handle.dispose();
  });
});
