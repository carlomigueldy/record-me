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
  // Mirrors the latest RecordingResult so unmount cleanup can release it
  // without capturing stale closure state in the useEffect return.
  const resultRef = useRef<RecordingResult | null>(null);
  // True while a start() is executing — drops concurrent calls synchronously.
  const startingRef = useRef(false);
  // Monotonically-increasing generation counter. start() captures its own gen
  // at entry; reset()/unmount bump it so any in-flight continuation can detect
  // it has been superseded and abort before touching shared state.
  const genRef = useRef(0);
  // Set false in unmount cleanup; guards all post-await ref/setState writes.
  const mountedRef = useRef(true);

  const start = useCallback(async (opts: StartOptions) => {
    // ── Synchronous preamble (no awaits, no yield points) ──────────────────
    // 1. Concurrency guard: drop if another start() is already executing.
    if (startingRef.current) return;
    startingRef.current = true;

    // 2. Claim this generation. Any in-flight continuation from a prior call
    //    that somehow bypassed the guard will see a mismatched gen and abort.
    const myGen = ++genRef.current;

    // 3. Snapshot + null shared refs before the first await. A stale
    //    continuation cannot interleave on these refs after this point.
    const priorResult = resultRef.current;
    const priorHandle = handleRef.current;
    resultRef.current = null;
    handleRef.current = null;
    // ── End synchronous preamble ────────────────────────────────────────────

    try {
      // ── await 1: release prior result's object URL ──────────────────────
      // release() may await IDB store.clear() — works on local snapshot.
      await priorResult?.release();

      // Post-await guard: abort if unmounted or superseded during release().
      if (!mountedRef.current || genRef.current !== myGen) {
        priorHandle?.dispose();
        return;
      }
      // ── End await 1 ─────────────────────────────────────────────────────

      // Dispose prior session tracks (synchronous after release).
      priorHandle?.dispose();

      setDurationMs(0);
      setBytes(0);
      setResult(null);
      setError(null);

      // Create the new recorder and store it immediately so unmount/reset can
      // dispose it even if handle.start() is still awaiting.
      const handle = createRecorder({
        ...opts,
        onStateChange: setState,
        onDurationTick: setDurationMs,
        onBytesTick: setBytes,
        onPreviewReady: setPreviewStream,
        onResult: (r) => {
          resultRef.current = r;
          setResult(r);
        },
        onError: setError,
      });
      handleRef.current = handle;

      // ── await 2: request permissions + start capture ────────────────────
      // Failures surface through onError → `error`; swallow the rejection.
      try {
        await handle.start();
      } catch {
        /* surfaced via onError */
      }

      // Post-await guard: if unmounted or superseded during handle.start(),
      // dispose the handle immediately — never leave a live capture with no
      // mounted hook owner. Clear handleRef only if it still points at us
      // (a concurrent successor may have already replaced it).
      if (!mountedRef.current || genRef.current !== myGen) {
        handle.dispose();
        if (handleRef.current === handle) handleRef.current = null;
        return;
      }
      // ── End await 2 ─────────────────────────────────────────────────────
    } finally {
      startingRef.current = false;
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
    // Bump generation to cancel any in-flight start().
    genRef.current++;
    startingRef.current = false;
    // Release the object URL to free memory, then dispose the recorder to stop
    // any live tracks (camera/mic light off) before returning to idle.
    await result?.release();
    handleRef.current?.dispose();
    handleRef.current = null;
    resultRef.current = null;
    setPreviewStream(null);
    setResult(null);
    setError(null);
    setDurationMs(0);
    setBytes(0);
    setState('idle');
  }, [result]);

  // Stop tracks + release blob URL if the user navigates away mid-session.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      // Signal all in-flight start() continuations to abort.
      mountedRef.current = false;
      // genRef is a generation counter, not a DOM node — reading the live value
      // at cleanup time is the intended invalidation; copying it would defeat the guard.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      genRef.current++;
      void resultRef.current?.release();
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
