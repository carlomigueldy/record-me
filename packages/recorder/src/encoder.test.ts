// packages/recorder/src/encoder.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEncoder } from './encoder';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import { MockMediaStream } from './test/mocks/media-stream';

function makeStream(): MockMediaStream {
  return new MockMediaStream();
}

describe('createEncoder', () => {
  beforeEach(() => MockMediaRecorder.reset());

  it('constructs a MediaRecorder with the supplied options', () => {
    createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
    });
    expect(MockMediaRecorder.instances).toHaveLength(1);
    const rec = MockMediaRecorder.instances[0]!;
    expect(rec.mimeType).toBe('video/mp4;codecs=avc1.42E01E,mp4a.40.2');
    expect(rec.videoBitsPerSecond).toBe(4_000_000);
  });

  it('start() passes the timeslice to MediaRecorder.start()', () => {
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
    });
    enc.start();
    expect(MockMediaRecorder.instances[0]!.startCalls).toEqual([1_000]);
  });

  it('forwards dataavailable chunks to onChunk + bumps bytes', () => {
    const onChunk = vi.fn();
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
      onChunk,
    });
    enc.start();
    const rec = MockMediaRecorder.instances[0]!;
    rec._emitChunk(100);
    rec._emitChunk(50);
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk.mock.calls[0]![0].size).toBe(100);
    expect(enc.bytes).toBe(150);
  });

  it('drops zero-byte chunks (MediaRecorder sometimes emits empty Blobs at stop)', () => {
    const onChunk = vi.fn();
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
      onChunk,
    });
    enc.start();
    MockMediaRecorder.instances[0]!._emitChunk(0);
    expect(onChunk).not.toHaveBeenCalled();
    expect(enc.bytes).toBe(0);
  });

  it('pause / resume forward to MediaRecorder', () => {
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
    });
    enc.start();
    enc.pause();
    enc.resume();
    const rec = MockMediaRecorder.instances[0]!;
    expect(rec.pauseCalls).toBe(1);
    expect(rec.resumeCalls).toBe(1);
  });

  it('stop() resolves once the underlying recorder emits stop', async () => {
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
    });
    enc.start();
    const stopPromise = enc.stop();
    // The mock stop synchronously dispatches the 'stop' event.
    await expect(stopPromise).resolves.toBeUndefined();
    expect(MockMediaRecorder.instances[0]!.stopCalls).toBe(1);
  });

  it('forwards error events to onError as RecorderError(recorder-failed)', () => {
    const onError = vi.fn();
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
      onError,
    });
    enc.start();
    MockMediaRecorder.instances[0]!._emitError('UnknownError', 'kaboom');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toMatchObject({ kind: 'recorder-failed' });
  });
});
