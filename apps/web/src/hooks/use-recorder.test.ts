import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { RecorderOptions, RecorderHandle } from '@record-me/recorder';

type MockHandle = RecorderHandle & { opts: RecorderOptions };

// Capture each created handle so tests can drive its callbacks.
const handles: MockHandle[] = [];
vi.mock('@record-me/recorder', () => ({
  createRecorder: (opts: RecorderOptions) => {
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
      dispose: vi.fn(),
    };
    handles.push(handle as unknown as MockHandle);
    return handle;
  },
}));

import { useRecorder } from './use-recorder';

beforeEach(() => {
  handles.length = 0;
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
});
