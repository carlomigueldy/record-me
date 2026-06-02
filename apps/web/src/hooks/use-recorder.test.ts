import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { RecorderOptions, RecorderHandle } from '@record-me/recorder';

type MockHandle = RecorderHandle & {
  opts: RecorderOptions;
  fireMemoryPressure: () => void;
  fireStorageFallback: () => void;
  fireCursorScopeMissed: () => void;
};

// Capture each created handle so tests can drive its callbacks.
const handles: MockHandle[] = [];

function getLastRecorderMock(): MockHandle {
  const h = handles.at(-1);
  if (!h) throw new Error('No recorder mock created yet');
  return h;
}

// Optional one-shot override: if set, createRecorder uses this factory once then
// falls back to the default. Used by the unmount-during-start() test.
let createRecorderOverride: ((opts: RecorderOptions) => MockHandle) | null = null;

vi.mock('@record-me/recorder', () => ({
  createRecorder: (opts: RecorderOptions) => {
    if (createRecorderOverride) {
      const factory = createRecorderOverride;
      createRecorderOverride = null;
      const handle = factory(opts);
      handles.push(handle);
      return handle;
    }
    const handle = {
      opts,
      start: vi.fn(async () => {
        opts.onStateChange?.('requesting-permissions');
        opts.onPreviewReady?.({ id: 'preview' } as unknown as MediaStream);
        opts.onStateChange?.('recording');
      }),
      pause: vi.fn(() => opts.onStateChange?.('paused')),
      resume: vi.fn(() => opts.onStateChange?.('recording')),
      stop: vi.fn(async () => {
        opts.onStateChange?.('finalizing');
        const result = {
          blob: new Blob(['x']),
          url: 'blob:mock',
          mimeType: 'video/mp4',
          durationMs: 1234,
          bytes: 1,
          suggestedFilename: 'record-me.mp4',
          release: vi.fn(async () => {}),
        };
        opts.onStateChange?.('ready');
        opts.onResult?.(result);
        return result;
      }),
      salvage: vi.fn(async () => {
        const result = {
          blob: new Blob(['partial']),
          url: 'blob:mock-partial',
          mimeType: 'video/mp4',
          durationMs: 500,
          bytes: 7,
          suggestedFilename: 'record-me-partial.mp4',
          partial: true,
          release: vi.fn(async () => {}),
        };
        opts.onResult?.(result);
        return result;
      }),
      dispose: vi.fn(),
      fireMemoryPressure: () => opts.onMemoryPressure?.(),
      fireStorageFallback: () => opts.onStorageFallback?.(),
      fireCursorScopeMissed: () => opts.onCursorScopeMissed?.(),
    };
    handles.push(handle as unknown as MockHandle);
    return handle;
  },
}));

import { useRecorder } from './use-recorder';

beforeEach(() => {
  handles.length = 0;
  createRecorderOverride = null;
});

describe('useRecorder', () => {
  it('starts in idle with zeroed counters', () => {
    const { result } = renderHook(() => useRecorder());
    expect(result.current.state).toBe('idle');
    expect(result.current.durationMs).toBe(0);
    expect(result.current.bytes).toBe(0);
    expect(result.current.result).toBeNull();
    expect(result.current.previewStream).toBeNull();
  });

  it('start() creates a recorder with the given mode and reaches recording', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    expect(handles[0]!.opts.mode).toBe('cam-only');
    expect(result.current.state).toBe('recording');
    expect(result.current.previewStream).toEqual({ id: 'preview' });
  });

  it('forwards duration and bytes ticks to state', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    act(() => {
      handles[0]!.opts.onDurationTick?.(2500);
      handles[0]!.opts.onBytesTick?.(4096);
    });
    expect(result.current.durationMs).toBe(2500);
    expect(result.current.bytes).toBe(4096);
  });

  it('stop() populates result via onResult and reaches ready', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    await act(async () => {
      result.current.stop();
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.result?.suggestedFilename).toBe('record-me.mp4');
  });

  it('onError populates the error state', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    act(() => {
      handles[0]!.opts.onError?.({
        name: 'RecorderError',
        kind: 'permission-denied',
        message: 'x',
        subject: 'camera',
      });
    });
    expect(result.current.error?.kind).toBe('permission-denied');
    expect(result.current.error?.subject).toBe('camera');
  });

  it('reset() releases the result and returns to idle', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    await act(async () => {
      result.current.stop();
    });
    const released = result.current.result!.release as ReturnType<typeof vi.fn>;
    await act(async () => {
      await result.current.reset();
    });
    expect(released).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('disposes the recorder on unmount', async () => {
    const { result, unmount } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    unmount();
    expect(vi.mocked(handles[0]!.dispose)).toHaveBeenCalledTimes(1);
  });

  // fix: reset() must dispose the handle so camera/mic tracks stop
  it('reset() disposes the handle (turns off camera/mic light)', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    await act(async () => {
      result.current.stop();
    });
    await act(async () => {
      await result.current.reset();
    });
    expect(vi.mocked(handles[0]!.dispose)).toHaveBeenCalledTimes(1);
  });

  // fix: start() over a ready recording must release the prior result's object URL
  it('start() over a ready recording releases the prior result', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    await act(async () => {
      result.current.stop();
    });
    const priorRelease = result.current.result!.release as ReturnType<typeof vi.fn>;
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    expect(priorRelease).toHaveBeenCalledTimes(1);
  });

  // fix: calling start() again must dispose the prior handle before creating a new one
  it('start() disposes any prior handle before creating a new recorder', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    // First handle must have been disposed; a second handle was created.
    expect(handles).toHaveLength(2);
    expect(vi.mocked(handles[0]!.dispose)).toHaveBeenCalledTimes(1);
  });

  // fix: unmount after a completed recording must release() the result's object URL
  it('unmount after a completed recording releases the result object URL', async () => {
    const { result, unmount } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    await act(async () => {
      result.current.stop();
    });
    const released = result.current.result!.release as ReturnType<typeof vi.fn>;
    unmount();
    // release() is async; wait one microtask for the void promise to settle.
    await act(async () => {});
    expect(released).toHaveBeenCalledTimes(1);
  });

  // fix: concurrent start() calls must not create two recorders (in-flight guard)
  it('concurrent start() calls produce exactly one recorder with no orphan', async () => {
    const { result } = renderHook(() => useRecorder());
    // Fire two start()s without awaiting the first — the second must be dropped.
    await act(async () => {
      void result.current.start({ mode: 'cam-only' });
      void result.current.start({ mode: 'cam-only' });
    });
    // Only one recorder created; no orphaned second handle.
    expect(handles).toHaveLength(1);
  });

  // holistic redesign: start() whose handle.start() await resolves AFTER unmount
  // must dispose the new handle immediately and never leave a live capture.
  it('start() that resolves AFTER unmount disposes the handle and leaves no live capture', async () => {
    // Use a deferred handle.start() so we can unmount in the middle of the await.
    let resolveStart!: () => void;
    const startBlocked = new Promise<void>((res) => {
      resolveStart = res;
    });

    const blockedHandleDispose = vi.fn();

    // Install a one-shot override: handle.start() blocks until resolveStart().
    createRecorderOverride = (opts) =>
      ({
        opts,
        start: vi.fn(async () => {
          opts.onStateChange?.('requesting-permissions');
          await startBlocked; // ← yields; unmount fires during this window
        }),
        pause: vi.fn(),
        resume: vi.fn(),
        stop: vi.fn(async () => ({
          blob: new Blob(),
          url: '',
          mimeType: 'video/mp4',
          durationMs: 0,
          bytes: 0,
          suggestedFilename: 'x.mp4',
          release: vi.fn(async () => {}),
        })),
        dispose: blockedHandleDispose,
      }) as unknown as MockHandle;

    const { result, unmount } = renderHook(() => useRecorder());

    // Kick off start() without awaiting — it will block inside handle.start().
    // We deliberately do NOT wrap in act() here so we can unmount mid-flight.
    void result.current.start({ mode: 'cam-only' });

    // Yield to let start() reach the await handle.start() point and get blocked.
    await Promise.resolve();

    // Unmount while handle.start() is still awaiting — cleanup fires:
    // mountedRef.current = false, genRef bumped, handleRef.current?.dispose().
    unmount();

    // Unblock handle.start() — post-await guard sees mountedRef.current=false,
    // calls handle.dispose() a second time (or first if cleanup beat it).
    resolveStart();
    // Flush all remaining microtasks.
    await act(async () => {});

    // The handle must have been disposed (by cleanup or post-await guard).
    expect(blockedHandleDispose).toHaveBeenCalled();
  });
});

describe('useRecorder · resilience signals', () => {
  it('exposes memoryPressure, storageFallback flags and a savePartial method', () => {
    const { result } = renderHook(() => useRecorder());
    expect(result.current.memoryPressure).toBe(false);
    expect(result.current.storageFallback).toBe(false);
    expect(typeof result.current.savePartial).toBe('function');
  });

  it('flips memoryPressure to true when the engine fires onMemoryPressure', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'screen+cursor' });
    });
    // Drive the engine's onMemoryPressure via the mock recorder used in this suite.
    act(() => {
      getLastRecorderMock().fireMemoryPressure();
    });
    expect(result.current.memoryPressure).toBe(true);
  });

  // MAJOR fix: savePartial() while idle / not track-failed must surface the
  // invalid-state error via hook's `error` state and reject so callers can await.
  it('savePartial() while idle surfaces an invalid-state error and rejects the returned promise', async () => {
    // Override salvage() to reject with an invalid-state RecorderError
    // (simulates calling savePartial() when the engine is not in error/track-failed state).
    const invalidStateError = {
      name: 'RecorderError',
      kind: 'invalid-state' as const,
      message: "cannot salvage in state 'idle'",
    };
    let salvageReject!: (err: unknown) => void;
    const salvagePromise = new Promise<never>((_, rej) => {
      salvageReject = rej;
    });

    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    // Replace salvage with a rejecting mock to simulate invalid-state
    const handle = getLastRecorderMock();
    handle.salvage = vi.fn(() => {
      salvageReject(invalidStateError);
      return salvagePromise;
    });

    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.savePartial();
      } catch (err) {
        caughtError = err;
      }
    });

    // The returned promise must have rejected with the engine error.
    expect(caughtError).toBe(invalidStateError);
    // The hook's error state must be populated (not silently swallowed).
    expect(result.current.error?.kind).toBe('invalid-state');
  });

  // MAJOR fix: savePartial() while recording (happy path) surfaces the result
  // via onResult and resolves normally — no rejection.
  it('savePartial() in a valid state delivers the partial result and resolves', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });

    await act(async () => {
      await result.current.savePartial();
    });

    // Default mock salvage() calls onResult — result should be populated.
    expect(result.current.result?.suggestedFilename).toBe('record-me-partial.mp4');
    // No error state.
    expect(result.current.error).toBeNull();
  });

  // MAJOR regression: the ONLY valid real-world salvage path is track-failed →
  // savePartial(). Error is set BEFORE salvage runs. Verify the success path
  // clears that stale error so the phase can advance to review.
  it('savePartial() after a track-failed error clears error and populates result (salvage path)', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });

    // Simulate the engine firing onError with a track-failed error (sets error state).
    act(() => {
      handles[handles.length - 1]!.opts.onError?.({
        name: 'RecorderError',
        kind: 'track-failed',
        message: 'camera track ended unexpectedly',
        subject: 'camera',
      });
    });
    expect(result.current.error?.kind).toBe('track-failed');

    // Now call savePartial() — salvage() resolves and calls onResult.
    // The mock also transitions state to 'ready' via onResult callback sequence.
    await act(async () => {
      // Manually drive state to 'ready' as the engine would after salvage.
      handles[handles.length - 1]!.opts.onStateChange?.('ready');
      await result.current.savePartial();
    });

    // After a successful savePartial(): error must be cleared.
    expect(result.current.error).toBeNull();
    // Result must be populated with the partial recording.
    expect(result.current.result?.suggestedFilename).toBe('record-me-partial.mp4');
    // State is 'ready' — the review/download screen can now render.
    expect(result.current.state).toBe('ready');
  });

  // MINOR: storageFallback flips to true when the engine fires onStorageFallback.
  it('flips storageFallback to true when the engine fires onStorageFallback', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'screen+cursor' });
    });
    act(() => {
      getLastRecorderMock().fireStorageFallback();
    });
    expect(result.current.storageFallback).toBe(true);
  });

  // MINOR: start() clears both memoryPressure and storageFallback flags.
  it('start() clears memoryPressure and storageFallback before a new session', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    // Set both flags via the engine callbacks.
    act(() => {
      getLastRecorderMock().fireMemoryPressure();
      getLastRecorderMock().fireStorageFallback();
    });
    expect(result.current.memoryPressure).toBe(true);
    expect(result.current.storageFallback).toBe(true);

    // Starting a new session must clear both flags.
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    expect(result.current.memoryPressure).toBe(false);
    expect(result.current.storageFallback).toBe(false);
  });

  // MINOR: reset() clears both memoryPressure and storageFallback flags.
  it('reset() clears memoryPressure and storageFallback', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    // Set both flags via the engine callbacks.
    act(() => {
      getLastRecorderMock().fireMemoryPressure();
      getLastRecorderMock().fireStorageFallback();
    });
    expect(result.current.memoryPressure).toBe(true);
    expect(result.current.storageFallback).toBe(true);

    await act(async () => {
      await result.current.reset();
    });
    expect(result.current.memoryPressure).toBe(false);
    expect(result.current.storageFallback).toBe(false);
  });

  // C4: cursorScopeMissed — exposes the flag from the engine callback.
  it('exposes cursorScopeMissed flag (false initially)', () => {
    const { result } = renderHook(() => useRecorder());
    expect(result.current.cursorScopeMissed).toBe(false);
  });

  it('flips cursorScopeMissed to true when the engine fires onCursorScopeMissed', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'screen+cursor' });
    });
    act(() => {
      getLastRecorderMock().fireCursorScopeMissed();
    });
    expect(result.current.cursorScopeMissed).toBe(true);
  });

  it('start() clears cursorScopeMissed before a new session', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'screen+cursor' });
    });
    act(() => {
      getLastRecorderMock().fireCursorScopeMissed();
    });
    expect(result.current.cursorScopeMissed).toBe(true);
    await act(async () => {
      await result.current.start({ mode: 'screen+cursor' });
    });
    expect(result.current.cursorScopeMissed).toBe(false);
  });

  it('reset() clears cursorScopeMissed', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'screen+cursor' });
    });
    act(() => {
      getLastRecorderMock().fireCursorScopeMissed();
    });
    expect(result.current.cursorScopeMissed).toBe(true);
    await act(async () => {
      await result.current.reset();
    });
    expect(result.current.cursorScopeMissed).toBe(false);
  });

  // MINOR: stale-session guard — reset() during in-flight salvage must not allow
  // the continuation to clear or alter the NEW session's error state.
  it('reset() during in-flight salvage does not alter the new session error state', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });

    // Set a track-failed error so there is something to salvage.
    act(() => {
      handles[handles.length - 1]!.opts.onError?.({
        name: 'RecorderError',
        kind: 'track-failed',
        message: 'screen track ended',
        subject: 'screen',
      });
    });
    expect(result.current.error?.kind).toBe('track-failed');

    // Replace salvage() with a deferred promise so we can interleave reset().
    let resolveSalvage!: () => void;
    const salvageGate = new Promise<never>((_, rej) => {
      // salvage will never resolve — we only need it to be in-flight.
      // Use reject so the continuation exercises the catch branch, but
      // hold it open until we choose to release it.
      resolveSalvage = () =>
        rej({ name: 'RecorderError', kind: 'invalid-state', message: 'stale' });
    });
    const handle = getLastRecorderMock();
    handle.salvage = vi.fn(() => salvageGate);

    // Fire savePartial() — it enters the in-flight state (awaiting salvage).
    let savePartialRejection: unknown;
    const savePartialPromise = result.current.savePartial().catch((err) => {
      savePartialRejection = err;
    });

    // reset() — bumps genRef, clears state. The salvage is still in-flight.
    await act(async () => {
      await result.current.reset();
    });
    // After reset: error is null (reset cleared it), state is idle.
    expect(result.current.error).toBeNull();
    expect(result.current.state).toBe('idle');

    // Now inject a NEW session error so we can verify the stale continuation
    // doesn't clobber it.
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    act(() => {
      handles[handles.length - 1]!.opts.onError?.({
        name: 'RecorderError',
        kind: 'permission-denied',
        message: 'cam denied',
        subject: 'camera',
      });
    });
    expect(result.current.error?.kind).toBe('permission-denied');

    // Now let the in-flight salvage reject — the stale continuation must NOT
    // overwrite the new session's 'permission-denied' error with anything.
    await act(async () => {
      resolveSalvage();
      await savePartialPromise;
    });

    // The new session's error must be intact — stale continuation was suppressed.
    expect(result.current.error?.kind).toBe('permission-denied');
    // The rejection was re-thrown for the caller.
    expect((savePartialRejection as { kind: string }).kind).toBe('invalid-state');
  });
});
