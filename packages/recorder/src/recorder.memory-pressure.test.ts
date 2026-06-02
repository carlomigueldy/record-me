import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRecorder } from './recorder';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import { setDisplayMediaResponse, resetMediaDevices } from './test/mocks/media-devices';
import { flushAsync } from './test/factories';

afterEach(() => {
  MockMediaRecorder.reset();
  resetMediaDevices();
});

describe('createRecorder · memory pressure', () => {
  it('fires onMemoryPressure exactly once when the chunk count crosses the threshold', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onMemoryPressure = vi.fn();
    const handle = createRecorder({
      mode: 'screen+cursor',
      memoryPressureChunkThreshold: 3,
      onMemoryPressure,
    });
    await handle.start();
    const mr = MockMediaRecorder.instances.at(-1)!;

    mr._emitChunk(100);
    mr._emitChunk(100);
    await flushAsync();
    expect(onMemoryPressure).not.toHaveBeenCalled();

    mr._emitChunk(100); // 3rd chunk crosses threshold
    mr._emitChunk(100); // 4th — must not re-fire
    await flushAsync();

    expect(onMemoryPressure).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  // MAJOR 1 — chunkCount / memoryPressureFired must reset between sessions
  it('chunkCount resets between sessions so session 2 needs a full fresh threshold count', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onMemoryPressure = vi.fn();
    const handle = createRecorder({
      mode: 'screen+cursor',
      memoryPressureChunkThreshold: 3,
      onMemoryPressure,
    });

    // Session 1: emit 2 chunks (below threshold=3), then stop+release.
    await handle.start();
    const mr1 = MockMediaRecorder.instances.at(-1)!;
    mr1._emitChunk(100);
    mr1._emitChunk(100);
    await flushAsync();
    expect(onMemoryPressure).not.toHaveBeenCalled();
    const result1 = await handle.stop();
    await flushAsync();
    await result1.release();

    // Session 2: emit only 1 chunk — must NOT fire pressure yet.
    // If chunkCount leaked (=2 from session 1), this would fire immediately after
    // the 1st chunk instead of waiting for the 3rd.
    await handle.start();
    const mr2 = MockMediaRecorder.instances.at(-1)!;
    mr2._emitChunk(100); // would be "3rd" if count leaked, but must be "1st"
    await flushAsync();
    expect(onMemoryPressure).not.toHaveBeenCalled();

    // Now cross the threshold in session 2.
    mr2._emitChunk(100);
    mr2._emitChunk(100); // 3rd fresh chunk in session 2
    await flushAsync();
    expect(onMemoryPressure).toHaveBeenCalledTimes(1);

    handle.dispose();
  });
});
