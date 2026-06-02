import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRecorder } from './recorder';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import type { MockMediaStreamTrack } from './test/mocks/media-stream';
import {
  setDisplayMediaResponse,
  setUserMediaResponse,
  resetMediaDevices,
} from './test/mocks/media-devices';
import { flushAsync } from './test/factories';
import type { RecorderState } from './types';

afterEach(() => {
  MockMediaRecorder.reset();
  resetMediaDevices();
  vi.restoreAllMocks();
});

/**
 * Capture the screen track returned by getDisplayMedia so we can simulate the
 * user clicking the browser's native "Stop sharing" button. The canvas
 * compositor wraps the acquired track in a new canvas-capture stream, so
 * mr.stream.getVideoTracks()[0] is the canvas track — NOT the screen track.
 * We must intercept getDisplayMedia to get a reference to the original track.
 */
async function startWithScreenTrackCapture(
  handle: ReturnType<typeof createRecorder>,
): Promise<MockMediaStreamTrack> {
  let capturedScreenTrack: MockMediaStreamTrack | undefined;
  const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
  vi.spyOn(navigator.mediaDevices, 'getDisplayMedia').mockImplementation(
    async (...args: Parameters<typeof origGetDisplayMedia>) => {
      const stream = await origGetDisplayMedia(...args);
      capturedScreenTrack = stream.getVideoTracks()[0] as unknown as MockMediaStreamTrack;
      return stream;
    },
  );
  await handle.start();
  vi.restoreAllMocks();
  if (!capturedScreenTrack) throw new Error('screen track not captured');
  return capturedScreenTrack;
}

describe('createRecorder · track failure + salvage', () => {
  it('a screen track ending mid-recording surfaces a track-failed error', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const states: RecorderState[] = [];
    const onError = vi.fn();
    const handle = createRecorder({
      mode: 'screen+cursor',
      onStateChange: (s) => states.push(s),
      onError,
    });
    const screenTrack = await startWithScreenTrackCapture(handle);
    expect(handle.state).toBe('recording');

    // Simulate the user clicking the browser's native "Stop sharing" pill.
    screenTrack._simulateEnded();
    await flushAsync();

    expect(handle.state).toBe('error');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'track-failed' }));
  });

  it('salvage() assembles buffered chunks into a partial result and goes ready', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onResult = vi.fn();
    const handle = createRecorder({ mode: 'screen+cursor', onResult });
    const screenTrack = await startWithScreenTrackCapture(handle);

    const mr = MockMediaRecorder.instances.at(-1)!;
    mr._emitChunk(2048);
    await flushAsync();

    screenTrack._simulateEnded();
    await flushAsync();
    expect(handle.state).toBe('error');

    const result = await handle.salvage();
    expect(result.partial).toBe(true);
    expect(result.bytes).toBeGreaterThan(0);
    expect(handle.state).toBe('ready');
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ partial: true }));

    await result.release();
  });

  it('salvage() rejects with invalid-state when not in an error state', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await expect(handle.salvage()).rejects.toMatchObject({ kind: 'invalid-state' });
  });

  it('a normal stop() does NOT trigger the track-failure path', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onError = vi.fn();
    const handle = createRecorder({ mode: 'screen+cursor', onError });
    await handle.start();
    const mr = MockMediaRecorder.instances.at(-1)!;
    mr._emitChunk(1024);
    const result = await handle.stop(); // stop() internally stops tracks
    await flushAsync();
    expect(onError).not.toHaveBeenCalled();
    expect(result.partial).toBeUndefined();
    await result.release();
  });

  // CRITICAL §15 — privacy contract
  it('all acquired tracks are stopped once the recorder enters the track-failed error state', async () => {
    // screen+cursor mode acquires a screen video track + a mic audio track.
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    setUserMediaResponse({ kind: 'resolve', tracks: ['audio'] });

    const capturedTracks: MockMediaStreamTrack[] = [];

    // Intercept getDisplayMedia to capture the screen track reference.
    const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    vi.spyOn(navigator.mediaDevices, 'getDisplayMedia').mockImplementation(
      async (...args: Parameters<typeof origGetDisplayMedia>) => {
        const stream = await origGetDisplayMedia(...args);
        stream
          .getTracks()
          .forEach((t) => capturedTracks.push(t as unknown as MockMediaStreamTrack));
        return stream;
      },
    );

    // Intercept getUserMedia to capture the mic track reference.
    const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(
      async (...args: Parameters<typeof origGetUserMedia>) => {
        const stream = await origGetUserMedia(...args);
        stream
          .getTracks()
          .forEach((t) => capturedTracks.push(t as unknown as MockMediaStreamTrack));
        return stream;
      },
    );

    const handle = createRecorder({ mode: 'screen+cursor' });
    await handle.start();
    vi.restoreAllMocks();

    expect(capturedTracks.length).toBeGreaterThanOrEqual(1);

    // Simulate the screen track ending (user clicks "Stop sharing").
    const screenTrack = capturedTracks.find((t) => t.kind === 'video');
    expect(screenTrack).toBeDefined();
    screenTrack!._simulateEnded();
    await flushAsync();

    expect(handle.state).toBe('error');

    // Every acquired track must be stopped — camera/mic indicator light must be OFF.
    for (const track of capturedTracks) {
      expect(track.readyState).toBe('ended');
    }
  });

  // MAJOR (Phase 6) — stale encoder flush must not corrupt the new session.
  // Scenario: track-failure → dispose() → start() (new session) → old
  // MediaRecorder emits a late 'dataavailable' chunk. The new session's
  // result.bytes must exclude the stale chunk (88888) and contain only its own
  // legitimate bytes. Proved by verifying bytes === LEGITIMATE_BYTES (50).
  it('late chunk from a disposed encoder does not bleed into the new session store', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const handle = createRecorder({ mode: 'screen+cursor' });
    const screenTrack = await startWithScreenTrackCapture(handle);

    // Emit a chunk in session 1 to prove it does NOT show up in session 2.
    const oldMr = MockMediaRecorder.instances.at(-1)!;
    oldMr._emitChunk(88888);
    await flushAsync();

    // Trigger track failure → recorder enters 'error'.
    screenTrack._simulateEnded();
    await flushAsync();
    expect(handle.state).toBe('error');

    // dispose() — cleanupResources() runs: detachDataAvailable() + sessionToken++.
    handle.dispose();
    expect(handle.state).toBe('idle');

    // Start a fresh session.
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    await handle.start();
    expect(handle.state).toBe('recording');

    // Emit a legitimate chunk in the new session (50 bytes).
    const LEGITIMATE_BYTES = 50;
    const newMr = MockMediaRecorder.instances.at(-1)!;
    newMr._emitChunk(LEGITIMATE_BYTES);
    await flushAsync();

    // Now the old MediaRecorder emits a LATE chunk (stale flush after stop).
    // After the fix: the dataavailable listener was detached from oldMr by
    // detachDataAvailable() during cleanupResources(), so this goes nowhere.
    // The session-token guard provides a second layer of protection.
    const STALE_BYTES = 88888;
    oldMr._emitChunk(STALE_BYTES);
    await flushAsync();

    const result = await handle.stop();
    // The new session's blob must contain ONLY the legitimate chunk.
    expect(result.bytes).toBe(LEGITIMATE_BYTES);
    await result.release();
  });

  // MAJOR P2 regression — re-entrancy guard: concurrent salvage() calls must
  // fire onResult exactly once. Before the fix, salvage() stayed in 'error'
  // across the buildResult() await, so two concurrent calls both passed the
  // state guard — onResult fired twice and two object URLs were created.
  // After the fix: the synchronous setState('finalizing') before buildResult()
  // makes the second call fail the state !== 'error' guard with invalid-state.
  it('concurrent salvage() calls: onResult fires exactly once and second call rejects', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onResult = vi.fn();
    const handle = createRecorder({ mode: 'screen+cursor', onResult });
    const screenTrack = await startWithScreenTrackCapture(handle);

    // Emit a chunk so there is something to salvage.
    const mr = MockMediaRecorder.instances.at(-1)!;
    mr._emitChunk(512);
    await flushAsync();

    // Trigger track failure → recorder enters 'error'.
    screenTrack._simulateEnded();
    await flushAsync();
    expect(handle.state).toBe('error');

    // Fire two concurrent salvage() calls — do NOT await between them so both
    // see state === 'error' before the synchronous guard transition.
    const p1 = handle.salvage();
    const p2 = handle.salvage();

    const results = await Promise.allSettled([p1, p2]);

    // Exactly one call must succeed.
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // The rejected call must be invalid-state (not any other error kind).
    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason as { kind: string };
    expect(rejectedReason.kind).toBe('invalid-state');

    // onResult must have fired exactly once (no double-fire analytics corruption).
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ partial: true }));

    // Exactly one object URL was created — clean up.
    const successResult = (
      fulfilled[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof handle.salvage>>>
    ).value;
    await successResult.release();
  });

  // MAJOR 2 — salvage() contract: only valid after track-failed, not any error
  it('salvage() rejects with invalid-state after a non-track-failed error', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const handle = createRecorder({ mode: 'screen+cursor' });
    await handle.start();

    // Simulate a recorder-failed MediaRecorder error (not a track failure).
    const mr = MockMediaRecorder.instances.at(-1)!;
    mr._emitError('UnknownError', 'simulated recorder error');
    await flushAsync();

    expect(handle.state).toBe('error');
    // salvage() must reject because lastErrorKind !== 'track-failed'.
    await expect(handle.salvage()).rejects.toMatchObject({ kind: 'invalid-state' });
  });

  // MAJOR 1 — re-entrancy guard: near-simultaneous involuntary track ends must
  // fire onError exactly once and report the subject of the FIRST failing track.
  // Before the fix, intentionalStop was set too late: the 2nd track's 'ended'
  // (dispatched synchronously by t.stop() in the first handleTrackFailure call)
  // re-entered the function while intentionalStop was still false, producing a
  // second onError call with the wrong subject. See recorder.ts handleTrackFailure.
  it('simultaneous involuntary track ends fire onError exactly once', async () => {
    // screen+cursor mode acquires screen (video) + mic (audio).
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    setUserMediaResponse({ kind: 'resolve', tracks: ['audio'] });

    const capturedTracks: MockMediaStreamTrack[] = [];

    const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    vi.spyOn(navigator.mediaDevices, 'getDisplayMedia').mockImplementation(
      async (...args: Parameters<typeof origGetDisplayMedia>) => {
        const stream = await origGetDisplayMedia(...args);
        stream
          .getTracks()
          .forEach((t) => capturedTracks.push(t as unknown as MockMediaStreamTrack));
        return stream;
      },
    );
    const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(
      async (...args: Parameters<typeof origGetUserMedia>) => {
        const stream = await origGetUserMedia(...args);
        stream
          .getTracks()
          .forEach((t) => capturedTracks.push(t as unknown as MockMediaStreamTrack));
        return stream;
      },
    );

    const onError = vi.fn();
    const handle = createRecorder({ mode: 'screen+cursor', onError });
    await handle.start();
    vi.restoreAllMocks();

    expect(capturedTracks.length).toBeGreaterThanOrEqual(2);

    // Simulate the OS revoking both tracks simultaneously. The screen track's
    // _simulateEnded() calls stop() which synchronously dispatches 'ended' on
    // the screen track, entering handleTrackFailure. Inside that call, the
    // t.stop() loop fires 'ended' on the mic track synchronously — a second
    // re-entrant call to handleTrackFailure. The re-entrancy guard (intentionalStop
    // set first) must absorb that second call so onError fires only once.
    const screenTrack = capturedTracks.find((t) => t.kind === 'video')!;
    const micTrack = capturedTracks.find((t) => t.kind === 'audio')!;
    expect(screenTrack).toBeDefined();
    expect(micTrack).toBeDefined();

    screenTrack._simulateEnded();
    await flushAsync();

    expect(handle.state).toBe('error');
    // The critical assertion: exactly ONE error, not two.
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'track-failed' }));

    // Both tracks must be stopped (privacy contract §15).
    expect(screenTrack.readyState).toBe('ended');
    expect(micTrack.readyState).toBe('ended');
  });

  // MAJOR (Phase 6 Section A) — buildResult() session-ownership guard.
  // Scenario: track-failure → salvage() is called → dispose() fires DURING the
  // in-flight awaits inside buildResult() → the stale continuation must NOT
  // flip the disposed recorder back to 'ready', must NOT fire onResult, and
  // must NOT stop tracks from a subsequently-started new session.
  it('dispose() mid-salvage: final state is idle, onResult fires zero times, new session tracks are intact', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onResult = vi.fn();
    const handle = createRecorder({ mode: 'screen+cursor', onResult });
    const screenTrack = await startWithScreenTrackCapture(handle);

    // Emit a chunk so there is something to salvage.
    const mr = MockMediaRecorder.instances.at(-1)!;
    mr._emitChunk(512);
    await flushAsync();

    // Trigger track failure → recorder enters 'error'.
    screenTrack._simulateEnded();
    await flushAsync();
    expect(handle.state).toBe('error');

    // Call salvage() — this transitions synchronously to 'finalizing' then enters
    // the async body (awaiting finalFlush + pendingAppends + store.assemble).
    // We do NOT await it yet; instead we immediately call dispose() to simulate
    // the component unmounting or "Start over" button pressed mid-flight.
    const salvagePromise = handle.salvage();

    // dispose() bumps sessionToken and sets state to idle.
    handle.dispose();
    expect(handle.state).toBe('idle');

    // Let the salvage() continuation finish — it should detect the token mismatch
    // and return the dummy early-exit result without touching state or calling onResult.
    await salvagePromise;
    await flushAsync();

    // The recorder must remain in 'idle' — the stale continuation must NOT
    // have flipped it back to 'ready'.
    expect(handle.state).toBe('idle');

    // onResult must NOT have been called — the phantom result spec §10 must not fire.
    expect(onResult).toHaveBeenCalledTimes(0);

    // Now start a fresh session and confirm its tracks are not stopped by the
    // stale buildResult() continuation's t.stop() loop (which was guarded away).
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    await handle.start();
    expect(handle.state).toBe('recording');

    // Emit a legitimate chunk and stop cleanly — proves the new session is healthy.
    const newMr = MockMediaRecorder.instances.at(-1)!;
    newMr._emitChunk(256);
    await flushAsync();

    const newResult = await handle.stop();
    expect(handle.state).toBe('ready');
    // The new session's result must contain only its own bytes (not stale data).
    expect(newResult.bytes).toBe(256);
    // onResult fires exactly once — for the new (healthy) session's stop().
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ bytes: 256 }));

    await newResult.release();
    handle.dispose();
  });
});
