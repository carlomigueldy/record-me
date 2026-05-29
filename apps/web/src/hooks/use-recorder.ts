'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createRecorder,
  type RecorderHandle,
  type RecorderOptions,
  type RecorderState,
  type RecordingResult,
  type RecorderErrorLike,
} from '@record-me/recorder';

/** Options the caller supplies at start() — the hook owns all engine callbacks. */
export type StartOptions = Omit<
  RecorderOptions,
  'onStateChange' | 'onDurationTick' | 'onBytesTick' | 'onError' | 'onResult' | 'onPreviewReady'
>;

export interface UseRecorderApi {
  state: RecorderState;
  durationMs: number;
  bytes: number;
  previewStream: MediaStream | null;
  result: RecordingResult | null;
  error: RecorderErrorLike | null;
  start: (opts: StartOptions) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => Promise<void>;
}

export function useRecorder(): UseRecorderApi {
  const [state, setState] = useState<RecorderState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState<RecorderErrorLike | null>(null);
  const handleRef = useRef<RecorderHandle | null>(null);

  const start = useCallback(async (opts: StartOptions) => {
    setDurationMs(0);
    setBytes(0);
    setResult(null);
    setError(null);
    const handle = createRecorder({
      ...opts,
      onStateChange: setState,
      onDurationTick: setDurationMs,
      onBytesTick: setBytes,
      onPreviewReady: setPreviewStream,
      onResult: setResult,
      onError: setError,
    });
    handleRef.current = handle;
    // Failures surface through onError → `error`; swallow the rejection so the
    // component tree never sees an unhandled promise.
    try {
      await handle.start();
    } catch {
      /* surfaced via onError */
    }
  }, []);

  const pause = useCallback(() => handleRef.current?.pause(), []);
  const resume = useCallback(() => handleRef.current?.resume(), []);

  const stop = useCallback(() => {
    // The result arrives via onResult — ignore stop()'s returned value.
    void handleRef.current?.stop().catch(() => {
      /* surfaced via onError */
    });
  }, []);

  const reset = useCallback(async () => {
    await result?.release();
    setPreviewStream(null);
    setResult(null);
    setError(null);
    setDurationMs(0);
    setBytes(0);
    setState('idle');
  }, [result]);

  // Stop tracks + wipe IDB if the user navigates away mid-session.
  useEffect(() => {
    return () => {
      handleRef.current?.dispose();
    };
  }, []);

  return {
    state,
    durationMs,
    bytes,
    previewStream,
    result,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
