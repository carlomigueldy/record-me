// packages/recorder/src/recorder.test.ts
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRecorder } from './recorder';
import type { RecorderState } from './types';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import {
  setDisplayMediaResponse,
  setUserMediaResponse,
  resetMediaDevices,
} from './test/mocks/media-devices';
import { flushAsync } from './test/factories';

describe('createRecorder · skeleton', () => {
  it('starts in idle state', () => {
    const handle = createRecorder({ mode: 'cam-only' });
    expect(handle.state).toBe('idle');
  });

  it('exposes start / pause / resume / stop / dispose methods', () => {
    const handle = createRecorder({ mode: 'cam-only' });
    expect(typeof handle.start).toBe('function');
    expect(typeof handle.pause).toBe('function');
    expect(typeof handle.resume).toBe('function');
    expect(typeof handle.stop).toBe('function');
    expect(typeof handle.dispose).toBe('function');
  });

  it('throws RecorderError(invalid-state) when pausing before start', () => {
    const handle = createRecorder({ mode: 'cam-only' });
    expect(() => handle.pause()).toThrowError(/invalid-state|cannot pause/i);
  });

  it('throws RecorderError(invalid-state) when stopping before start', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await expect(handle.stop()).rejects.toMatchObject({ kind: 'invalid-state' });
  });

  it('dispose() in idle leaves state as idle (no-op)', () => {
    const handle = createRecorder({ mode: 'cam-only' });
    handle.dispose();
    expect(handle.state).toBe('idle');
  });

  it('onStateChange is wired but quiet until a transition occurs', () => {
    const onStateChange = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onStateChange });
    expect(handle.state).toBe('idle');
    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('exposes state as a live getter (reads at access time)', () => {
    const handle = createRecorder({ mode: 'cam-only' });
    // We cannot mutate the public state directly, but typeof should be a string
    // and re-reads should return the same value while in idle.
    const a = handle.state as RecorderState;
    const b = handle.state as RecorderState;
    expect(a).toBe('idle');
    expect(b).toBe('idle');
  });
});

describe('createRecorder · full lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
        'Date',
      ],
    });
    vi.setSystemTime(new Date('2026-05-28T10:00:00Z'));
    resetMediaDevices();
    MockMediaRecorder.reset();
    setUserMediaResponse({ kind: 'resolve', tracks: ['video', 'audio'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('start() transitions idle → requesting-permissions → recording', async () => {
    const states: string[] = [];
    const handle = createRecorder({
      mode: 'cam-only',
      onStateChange: (s) => states.push(s),
    });

    const startPromise = handle.start();
    await flushAsync();
    await startPromise;
    expect(states).toEqual(['requesting-permissions', 'recording']);
    expect(handle.state).toBe('recording');
    handle.dispose();
  });

  it('start() transitions to error on permission denial', async () => {
    setUserMediaResponse({
      kind: 'reject',
      error: new DOMException('denied', 'NotAllowedError'),
    });
    const onError = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onError });

    await expect(handle.start()).rejects.toMatchObject({ kind: 'permission-denied' });
    expect(handle.state).toBe('error');
    expect(onError).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it('pause / resume toggles paused state and forwards to encoder', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();
    handle.pause();
    expect(handle.state).toBe('paused');
    handle.resume();
    expect(handle.state).toBe('recording');
    expect(MockMediaRecorder.instances[0]!.pauseCalls).toBe(1);
    expect(MockMediaRecorder.instances[0]!.resumeCalls).toBe(1);
    handle.dispose();
  });

  it('stop() finalizes and returns a RecordingResult with a Blob + suggestedFilename', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();

    // Drive two chunks through MediaRecorder before stop().
    const rec = MockMediaRecorder.instances[0]!;
    rec._emitChunk(1024);
    rec._emitChunk(2048);

    const result = await handle.stop();
    expect(handle.state).toBe('ready');
    expect(result.blob.size).toBe(3072);
    expect(result.bytes).toBe(3072);
    expect(result.mimeType).toMatch(/^video\//);
    expect(result.suggestedFilename).toMatch(/^record-me-2026-05-28-\d{3}\.(mp4|webm)$/);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.url.startsWith('blob:')).toBe(true);
    expect(typeof result.release).toBe('function');
    result.release();
    handle.dispose();
  });

  it('onDurationTick fires periodically while recording', async () => {
    const onDurationTick = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onDurationTick });
    await handle.start();
    vi.advanceTimersByTime(1_000);
    expect(onDurationTick).toHaveBeenCalled();
    expect(onDurationTick.mock.calls.at(-1)?.[0]).toBeGreaterThan(0);
    handle.dispose();
  });

  it('onBytesTick fires for each chunk', async () => {
    const onBytesTick = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onBytesTick });
    await handle.start();
    MockMediaRecorder.instances[0]!._emitChunk(500);
    MockMediaRecorder.instances[0]!._emitChunk(500);
    expect(onBytesTick).toHaveBeenCalledTimes(2);
    expect(onBytesTick.mock.calls.at(-1)?.[0]).toBe(1000);
    handle.dispose();
  });

  it('mode screen+cam+cursor acquires display + user media', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    setUserMediaResponse({ kind: 'resolve', tracks: ['video', 'audio'] });
    const handle = createRecorder({ mode: 'screen+cam+cursor' });
    await handle.start();
    expect(handle.state).toBe('recording');
    handle.dispose();
  });

  it('dispose() in recording stops tracks and transitions to idle', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();
    handle.dispose();
    expect(handle.state).toBe('idle');
  });

  it('resume() throws RecorderError(invalid-state) when not paused', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();
    expect(() => handle.resume()).toThrowError(/invalid-state|cannot resume/i);
    handle.dispose();
  });

  it('stop() while paused finalizes correctly and accumulates paused time', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();
    handle.pause();
    vi.advanceTimersByTime(500); // 500ms paused
    const result = await handle.stop();
    expect(handle.state).toBe('ready');
    // durationMs should be near zero because the entire recording was paused.
    expect(result.durationMs).toBe(0);
    handle.dispose();
  });
});
