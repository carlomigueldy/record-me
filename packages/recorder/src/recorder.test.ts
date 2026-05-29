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
    expect(result.durationMs).toBe(0);
    handle.dispose();
  });
});

describe('createRecorder · auto-stop and error surfaces', () => {
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
    vi.setSystemTime(new Date('2026-05-28T11:00:00Z'));
    resetMediaDevices();
    MockMediaRecorder.reset();
    setUserMediaResponse({ kind: 'resolve', tracks: ['video', 'audio'] });
  });
  afterEach(() => vi.useRealTimers());

  it('auto-stops 100ms before maxDurationMs', async () => {
    const handle = createRecorder({ mode: 'cam-only', maxDurationMs: 5_000 });
    await handle.start();
    expect(handle.state).toBe('recording');

    vi.advanceTimersByTime(4_900);
    await flushAsync();
    await flushAsync();
    expect(['finalizing', 'ready']).toContain(handle.state);
  });

  it('onError fires when MediaRecorder emits error mid-recording', async () => {
    const onError = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onError });
    await handle.start();
    MockMediaRecorder.instances[0]!._emitError('UnknownError', 'kaboom');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toMatchObject({ kind: 'recorder-failed' });
    expect(handle.state).toBe('error');
    handle.dispose();
  });

  it('storage strategy "indexeddb" uses IndexedDbChunkStore for assembly', async () => {
    const handle = createRecorder({
      mode: 'cam-only',
      storage: 'indexeddb',
      maxDurationMs: 60_000,
    });
    await handle.start();
    MockMediaRecorder.instances[0]!._emitChunk(256);
    MockMediaRecorder.instances[0]!._emitChunk(256);
    const result = await handle.stop();
    expect(result.blob.size).toBe(512);
    result.release();
    handle.dispose();
  });

  it('start() throws RecorderError(unsupported-browser) when no MIME type is supported', async () => {
    MockMediaRecorder.supportedMimeTypes = new Set();
    const onError = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onError });
    await expect(handle.start()).rejects.toMatchObject({ kind: 'unsupported-browser' });
    expect(handle.state).toBe('error');
    expect(onError).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it('start() throws RecorderError(invalid-state) when called while already recording', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();
    await expect(handle.start()).rejects.toMatchObject({
      kind: 'invalid-state',
      message: expect.stringContaining('recording'),
    });
    handle.dispose();
  });

  it('release() transitions ready → idle after wiping IDB chunks', async () => {
    // C1 + M1: privacy contract. release() must await store.clear() then
    // setState('idle') so a new session can begin cleanly.
    const handle = createRecorder({
      mode: 'cam-only',
      storage: 'indexeddb',
      maxDurationMs: 60_000,
    });
    await handle.start();
    MockMediaRecorder.instances[0]!._emitChunk(128);
    const result = await handle.stop();
    expect(handle.state).toBe('ready');
    await result.release();
    expect(handle.state).toBe('idle');
    handle.dispose();
  });

  it('release() is idempotent — second call is a no-op', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();
    const result = await handle.stop();
    await result.release();
    await result.release(); // must not throw or re-trigger setState
    expect(handle.state).toBe('idle');
    handle.dispose();
  });

  it('start() fails cleanly when post-permission setup throws — state=error', async () => {
    // M2: regression guard. If new MediaRecorder() throws (or any other
    // line between acquireTracks and setState('recording')), we MUST clean
    // up acquired tracks. Otherwise the cam/mic light stays on.
    const originalMR = globalThis.MediaRecorder;
    // Force MediaRecorder construction to fail post-permission acquisition.
    class FailingMediaRecorder {
      constructor() {
        throw new Error('synthetic ctor failure');
      }
      static isTypeSupported(): boolean {
        return true;
      }
    }
    // @ts-expect-error replacing the global for this test
    globalThis.MediaRecorder = FailingMediaRecorder;
    try {
      const onError = vi.fn();
      const handle = createRecorder({ mode: 'cam-only', onError });
      await expect(handle.start()).rejects.toMatchObject({
        kind: 'recorder-failed',
      });
      expect(handle.state).toBe('error');
      expect(onError).toHaveBeenCalledTimes(1);
      handle.dispose();
    } finally {
      globalThis.MediaRecorder = originalMR;
    }
  });

  it('C2: dispose() mid-append drains pending appends before wiping IDB', async () => {
    // Regression guard. cleanupResources() must await in-flight store.append()
    // promises before calling store.clear(). Without the drain, deleteDatabase
    // can race against an open append transaction and the row briefly survives
    // on disk after dispose() returns.
    const sessionId = `cancel-race-${Math.random().toString(36).slice(2, 8)}`;
    const handle = createRecorder({
      mode: 'cam-only',
      storage: 'indexeddb',
      maxDurationMs: 60_000,
    });
    await handle.start();
    // Capture the session DB name pattern. The factory generates session IDs
    // we can't predict, but `record-me-chunks-*` is the universal prefix.
    void sessionId;
    // Emit a chunk and immediately dispose — the IDB append is still in flight.
    MockMediaRecorder.instances[0]!._emitChunk(64);
    handle.dispose();
    expect(handle.state).toBe('idle');
    // Wait for the pendingCleanup drain to settle. We can't observe internal
    // state from out here, but we can prove the drain happened by starting a
    // fresh session and asserting it works (start() awaits pendingCleanup).
    await handle.start();
    expect(handle.state).toBe('recording');
    handle.dispose();
  });

  it('M4: a stale release() does not clobber the state of a new session', async () => {
    // Regression guard. release() may be called late (e.g. "Save another"
    // button still holds the prior result). If a new session has already
    // begun, release() must NOT setState('idle') over a live state.
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();
    const result1 = await handle.stop();
    expect(handle.state).toBe('ready');

    // Step the timer past the first session's start time so the second start()
    // doesn't trip on shared timer / sequence collisions.
    vi.setSystemTime(new Date('2026-05-28T11:30:00Z'));
    await result1.release();
    expect(handle.state).toBe('idle');

    // Start session 2 — handle moves to recording.
    await handle.start();
    expect(handle.state).toBe('recording');

    // Now call the OLD result's release again (e.g. UI auto-cleanup). The
    // idempotent flag short-circuits before reaching setState, but if a
    // misbehaving caller resurrects the result, the state guard kicks in.
    // The second release is a no-op due to `released = true` (covered already);
    // here we explicitly construct a stale post-release scenario by checking
    // that EVEN IF we had reached the state check, state !== 'ready' would
    // skip the setState('idle') call. We verify by snapshotting state.
    await result1.release();
    expect(handle.state).toBe('recording'); // not clobbered to 'idle'

    handle.dispose();
  });

  it('M5: chained dispose() preserves all prior IDB wipes in pendingCleanup', async () => {
    // Regression guard. Two dispose() calls in succession (e.g. React
    // StrictMode dev double-invoke) must NOT drop the first dispose's IDB
    // wipe from the await chain. cleanupResources now chains rather than
    // replaces pendingCleanup so start() awaits every prior wipe.
    const handle = createRecorder({
      mode: 'cam-only',
      storage: 'indexeddb',
      maxDurationMs: 60_000,
    });
    await handle.start();
    // Emit a chunk and immediately double-dispose. Without M5, the 2nd
    // dispose's pendingCleanup overwrites the 1st, and the 1st's clear()
    // continues in the background instead of being awaited by the next
    // start(). We can't observe the background promise directly, but a
    // successful subsequent start() confirms the await chain held.
    MockMediaRecorder.instances[0]!._emitChunk(64);
    handle.dispose();
    handle.dispose(); // double-dispose: must chain, not replace
    expect(handle.state).toBe('idle');

    // start() awaits internal.pendingCleanup before proceeding. If M5's
    // chain works, the wait will encompass both dispose calls' wipes.
    await handle.start();
    expect(handle.state).toBe('recording');
    handle.dispose();
  });

  it('M6: cross-session stale release() does not clobber a session-2 ready state', async () => {
    // Regression guard. Scenario from principal review:
    // 1. Session 1: start → stop → result1 (state=ready, store=S1)
    // 2. dispose() (state=idle, store wiped)
    // 3. Session 2: start → stop → result2 (state=ready, store=S2)
    // 4. First-time call result1.release() — released starts at false.
    // M4's state-only guard saw state==='ready' and clobbered session 2 to 'idle'.
    // M6 requires the store-ownership check to gate the state transition too:
    // if internal.store !== captured store, this release is stale and must
    // not touch state.
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();
    const result1 = await handle.stop();
    expect(handle.state).toBe('ready');

    handle.dispose();
    expect(handle.state).toBe('idle');

    // Advance time so the second session's filename + start clock differ.
    vi.setSystemTime(new Date('2026-05-28T12:00:00Z'));
    await handle.start();
    const result2 = await handle.stop();
    expect(handle.state).toBe('ready'); // session 2's ready

    // Stale release (first time for result1). M6 guard: internal.store now
    // points at S2, captured store points at S1 — ownership mismatch.
    await result1.release();
    expect(handle.state).toBe('ready'); // NOT clobbered to 'idle'

    // Cleanup session 2.
    await result2.release();
    expect(handle.state).toBe('idle');
    handle.dispose();
  });

  it('onResult fires with the result on a manual stop', async () => {
    const onResult = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onResult });
    await handle.start();
    MockMediaRecorder.instances[0]!._emitChunk(1024);
    const result = await handle.stop();
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0]![0]).toBe(result);
    await result.release();
    handle.dispose();
  });

  it('onResult fires on auto-stop even though stop()’s return is discarded', async () => {
    const onResult = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', maxDurationMs: 5_000, onResult });
    await handle.start();
    MockMediaRecorder.instances[0]!._emitChunk(512);
    vi.advanceTimersByTime(4_900);
    await flushAsync();
    await flushAsync();
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0]![0]).toMatchObject({ bytes: 512 });
    handle.dispose();
  });

  it('onPreviewReady fires once after start with a video-only stream', async () => {
    const onPreviewReady = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onPreviewReady });
    await handle.start();
    expect(onPreviewReady).toHaveBeenCalledTimes(1);
    const stream = onPreviewReady.mock.calls[0]![0] as MediaStream;
    expect(stream.getVideoTracks().length).toBeGreaterThanOrEqual(1);
    expect(stream.getAudioTracks().length).toBe(0);
    handle.dispose();
  });

  it('camera permission denial carries subject "camera"', async () => {
    setUserMediaResponse({ kind: 'reject', error: new DOMException('denied', 'NotAllowedError') });
    const handle = createRecorder({ mode: 'cam-only' });
    await expect(handle.start()).rejects.toMatchObject({
      kind: 'permission-denied',
      subject: 'camera',
    });
    handle.dispose();
  });

  it('screen permission denial carries subject "screen"', async () => {
    setDisplayMediaResponse({
      kind: 'reject',
      error: new DOMException('denied', 'NotAllowedError'),
    });
    const handle = createRecorder({ mode: 'screen+cursor' });
    await expect(handle.start()).rejects.toMatchObject({
      kind: 'permission-denied',
      subject: 'screen',
    });
    handle.dispose();
  });
});
