// packages/recorder/src/recorder.ts
import { acquireTracks, type AcquiredTracks } from './acquire';
import { supportedMimeType } from './capabilities';
import { createComposer, type Composer } from './composer';
import { createCursorHighlights, type CursorHighlights } from './cursor-highlights';
import { createEncoder, type Encoder } from './encoder';
import { RecorderError } from './errors';
import { extensionForMimeType, suggestedFilename } from './filename';
import { createChunkStore, type ChunkStore } from './storage';
import { sweepRegisteredSessions } from './storage/session-registry';
import type {
  RecorderHandle,
  RecorderOptions,
  RecorderState,
  RecordingResult,
  PermissionSubject,
} from './types';

const DEFAULTS = {
  resolution: '1080p' as const,
  fps: 30,
  videoBitsPerSecond: 4_000_000,
  maxDurationMs: 600_000,
  cursorHighlights: true,
  storage: 'auto' as const,
};

const DURATION_TICK_MS = 250;
const TIMESLICE_MS = 1_000;

// Buffered-chunk count that trips the memory-pressure signal (spec § 14).
// At the 1s timeslice this is ~10 min — past the auto-IDB spill point but a
// real heads-up for memory-strategy sessions.
const MEMORY_PRESSURE_CHUNK_THRESHOLD = 600;

let sequenceCounter = 0;

const IDB_CHUNK_PREFIX = 'record-me-chunks-';
// Stale IDB session sweep window — leftovers older than 1h get nuked on start().
// Shrunk from 24h to match the registry window (issue #60).
const STALE_SESSION_THRESHOLD_MS = 60 * 60 * 1000; // 1h (was 24h) — see issue #60

interface InternalRecorderState {
  acquired: AcquiredTracks | undefined;
  composer: Composer | undefined;
  highlights: CursorHighlights | undefined;
  encoder: Encoder | undefined;
  store: ChunkStore | undefined;
  audioTrack: MediaStreamTrack | undefined;
  startedAt: number | undefined;
  finishedAt: number | undefined;
  pausedAtMs: number | undefined;
  pausedTotalMs: number;
  durationInterval: ReturnType<typeof setInterval> | undefined;
  autoStopTimeout: ReturnType<typeof setTimeout> | undefined;
  mimeType: string | undefined;
  pendingAppends: Set<Promise<void>>;
  /**
   * In-flight async cleanup from a prior cleanupResources() call. `start()`
   * awaits this so IDB chunk wipes from a previous session finish before a
   * new session begins (privacy contract — spec § 7.2).
   */
  pendingCleanup: Promise<void> | undefined;
  chunkCount: number;
  memoryPressureFired: boolean;
  /** True while OUR stop()/cleanup is intentionally ending tracks — suppresses the track-failure path. */
  intentionalStop: boolean;
  /** Detach functions for the track 'ended' listeners attached at start(). */
  trackEndedDetachers: Array<() => void>;
  /**
   * The kind of the last error that put the recorder into 'error' state.
   * salvage() requires this to be 'track-failed' — the only kind where the
   * store is intact and the partial-result contract is meaningful.
   */
  lastErrorKind: string | undefined;
  /**
   * Promise that resolves when the encoder's final async flush completes after
   * handleTrackFailure calls encoder.stop(). buildResult awaits this before
   * snapshotting pendingAppends so the last chunk is not silently lost.
   */
  finalFlush: Promise<void> | undefined;
  /**
   * Monotonically increasing per-session counter. Incremented by
   * cleanupResources() so that each encoder's onChunk closure can compare its
   * captured token against the current value. A mismatch means the encoder
   * belongs to a prior session — its chunks are stale and must be discarded.
   * Closes the stale-encoder-flush class (MAJOR — Phase 6 review).
   */
  sessionToken: number;
}

/**
 * Best-effort defensive sweep: delete any `record-me-chunks-*` IndexedDB
 * databases older than `STALE_SESSION_THRESHOLD_MS`. Catches leftovers from
 * crashed sessions. Gated behind `indexedDB.databases()` existence — Safari
 * <17 lacks this API; on those browsers we accept that stale leftovers may
 * persist until manual user wipe.
 */
/* c8 ignore start — sweep guards are environment-specific (Safari < 17 lacks
   indexedDB.databases; cross-origin contexts throw; non-record-me DB names skip).
   Happy path is covered indirectly by every start() call in the test suite. */
async function sweepStaleChunkDatabases(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const dbInfoFn = (
    indexedDB as IDBFactory & {
      databases?: () => Promise<IDBDatabaseInfo[]>;
    }
  ).databases;
  if (typeof dbInfoFn !== 'function') return;
  let infos: IDBDatabaseInfo[];
  try {
    infos = await dbInfoFn.call(indexedDB);
  } catch {
    return;
  }
  for (const info of infos) {
    if (!info.name || !info.name.startsWith(IDB_CHUNK_PREFIX)) continue;
    const suffix = info.name.slice(IDB_CHUNK_PREFIX.length);
    const dashIdx = suffix.indexOf('-');
    const tsToken = dashIdx === -1 ? suffix : suffix.slice(0, dashIdx);
    const ts = parseInt(tsToken, 36);
    if (!Number.isFinite(ts) || Date.now() - ts < STALE_SESSION_THRESHOLD_MS) continue;
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(info.name!);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }
}
/* c8 ignore stop */

export function createRecorder(opts: RecorderOptions): RecorderHandle {
  const resolved = {
    mode: opts.mode,
    resolution: opts.resolution ?? DEFAULTS.resolution,
    fps: opts.fps ?? DEFAULTS.fps,
    videoBitsPerSecond: opts.videoBitsPerSecond ?? DEFAULTS.videoBitsPerSecond,
    maxDurationMs: opts.maxDurationMs ?? DEFAULTS.maxDurationMs,
    cursorHighlights: opts.cursorHighlights ?? DEFAULTS.cursorHighlights,
    storage: opts.storage ?? DEFAULTS.storage,
    memoryPressureChunkThreshold:
      opts.memoryPressureChunkThreshold ?? MEMORY_PRESSURE_CHUNK_THRESHOLD,
  };

  let state: RecorderState = 'idle';
  const internal: InternalRecorderState = {
    acquired: undefined,
    composer: undefined,
    highlights: undefined,
    encoder: undefined,
    store: undefined,
    audioTrack: undefined,
    startedAt: undefined,
    finishedAt: undefined,
    pausedAtMs: undefined,
    pausedTotalMs: 0,
    durationInterval: undefined,
    autoStopTimeout: undefined,
    mimeType: undefined,
    pendingAppends: new Set(),
    pendingCleanup: undefined,
    chunkCount: 0,
    memoryPressureFired: false,
    intentionalStop: false,
    trackEndedDetachers: [],
    lastErrorKind: undefined,
    finalFlush: undefined,
    sessionToken: 0,
  };

  const setState = (next: RecorderState) => {
    if (next === state) return;
    state = next;
    opts.onStateChange?.(state);
  };

  const toError = (err: RecorderError): RecorderError => {
    internal.lastErrorKind = err.kind;
    setState('error');
    opts.onError?.(err);
    return err;
  };

  const handleTrackFailure = (subject: PermissionSubject | undefined) => {
    // Only meaningful while actively recording; ignore expected ends.
    if (internal.intentionalStop) return;
    if (state !== 'recording' && state !== 'paused') return;
    // Re-entrancy guard: set intentionalStop and detach all track listeners
    // FIRST — before any t.stop() call that synchronously dispatches 'ended'.
    // On near-simultaneous involuntary track ends (e.g. OS revokes screen+mic
    // together), the 2nd track's 'ended' fires while we're still inside this
    // function for the 1st track. Without this guard being first, the 2nd
    // entry sees intentionalStop===false and state==='recording' (toError has
    // not yet run), producing a duplicate onError + a second toError with the
    // wrong subject — corrupting §10/§14 analytics exactly as the Phase-4
    // resume double-count did.
    internal.intentionalStop = true;
    internal.trackEndedDetachers.forEach((d) => d());
    internal.trackEndedDetachers = [];
    internal.finishedAt = Date.now();
    if (internal.pausedAtMs) {
      internal.pausedTotalMs += internal.finishedAt - internal.pausedAtMs;
      internal.pausedAtMs = undefined;
    }
    // Flush a final chunk, but KEEP the store so salvage() can assemble it.
    // Capture the flush promise so buildResult() can await the last chunk before
    // snapshotting pendingAppends (MAJOR 4 — final chunk lost without this).
    internal.finalFlush = internal.encoder?.stop() ?? Promise.resolve();
    internal.composer?.stop();
    internal.highlights?.detach();
    if (internal.durationInterval) {
      clearInterval(internal.durationInterval);
      internal.durationInterval = undefined;
    }
    if (internal.autoStopTimeout) {
      clearTimeout(internal.autoStopTimeout);
      internal.autoStopTimeout = undefined;
    }
    // CRITICAL (§15 privacy contract): stop ALL surviving acquired tracks so no
    // camera/mic indicator stays live while the user sits on the error screen.
    // The buffered chunks live in internal.store (NOT the live tracks), so
    // stopping tracks does not harm salvage(). Because intentionalStop is already
    // true and all listeners are detached, the 'ended' events fired by t.stop()
    // are safely ignored.
    internal.acquired?.all.forEach((t) => {
      try {
        t.stop();
      } catch {
        /* c8 ignore next */
        // best-effort
      }
    });
    toError(
      new RecorderError('track-failed', `${subject ?? 'media'} track ended`, {
        ...(subject !== undefined ? { subject } : {}),
      }),
    );
  };

  const cleanupResources = () => {
    internal.intentionalStop = true;
    internal.trackEndedDetachers.forEach((d) => d());
    internal.trackEndedDetachers = [];
    if (internal.durationInterval) {
      clearInterval(internal.durationInterval);
      internal.durationInterval = undefined;
    }
    if (internal.autoStopTimeout) {
      clearTimeout(internal.autoStopTimeout);
      internal.autoStopTimeout = undefined;
    }
    internal.highlights?.detach();
    internal.composer?.dispose();
    internal.acquired?.all.forEach((t) => {
      try {
        t.stop();
      } catch {
        /* c8 ignore next */
        // best-effort
      }
    });
    // Wipe IDB chunk storage as part of the privacy contract (spec § 7.2 +
    // docs/SECURITY.md). Tracked via pendingCleanup so a follow-up start()
    // can await the wipe before opening a new session DB.
    //
    // IMPORTANT (C2): drain in-flight appends FIRST so deleteDatabase doesn't
    // race against a mid-commit append transaction.
    //
    // IMPORTANT (M5): CHAIN — don't replace — the prior pendingCleanup. A
    // double-dispose (React StrictMode dev double-invoke, defensive caller)
    // would otherwise drop the first wipe from the await chain, and start()
    // would proceed with a detached (background-only) clear still in flight.
    const prior = internal.pendingCleanup;
    const storeToWipe = internal.store;
    const appendsInFlight = [...internal.pendingAppends];
    if (prior || storeToWipe || appendsInFlight.length > 0) {
      internal.pendingCleanup = (async () => {
        if (prior) await prior;
        if (appendsInFlight.length > 0) {
          await Promise.allSettled(appendsInFlight);
        }
        if (storeToWipe) {
          await storeToWipe.clear();
        }
      })().catch(() => {
        /* c8 ignore next */
        // best-effort; failures don't block lifecycle
      });
    }
    // MAJOR (stale-encoder-flush): detach the 'dataavailable' listener from
    // the old encoder BEFORE nulling internal.encoder. This ensures that even
    // if the MediaRecorder emits a late final flush after cleanupResources(),
    // no chunk callback fires. Combined with the session-token guard in
    // onChunk, this provides two independent layers of protection so a stale
    // encoder can never write to the new session's store.
    internal.encoder?.detachDataAvailable();
    // Advance the session token. Any encoder whose onChunk closure captured
    // the previous token value will see a mismatch and discard its chunks.
    internal.sessionToken += 1;
    internal.acquired = undefined;
    internal.composer = undefined;
    internal.highlights = undefined;
    internal.encoder = undefined;
    internal.audioTrack = undefined;
    internal.store = undefined;
    internal.chunkCount = 0;
    internal.memoryPressureFired = false;
  };

  const elapsedMs = (): number => {
    if (!internal.startedAt) return 0;
    const end = internal.finishedAt ?? Date.now();
    return Math.max(0, end - internal.startedAt - internal.pausedTotalMs);
  };

  const buildResult = async (partial: boolean): Promise<RecordingResult> => {
    // Session-ownership guard: capture the token before the first await so we
    // can detect if dispose()/reset() ran during the async window and
    // superseded this session. cleanupResources() bumps sessionToken, so a
    // mismatch means this continuation is stale and must not touch state,
    // stop tracks, or deliver a phantom onResult (MAJOR — Phase 6 review).
    const entryToken = internal.sessionToken;

    // For salvage(): await the encoder's final async flush FIRST so the last
    // buffered chunk's append has been added to pendingAppends before we
    // snapshot it. Without this, the final ~1s chunk is silently lost (MAJOR 4).
    if (internal.finalFlush) {
      await internal.finalFlush;
      internal.finalFlush = undefined;
    }
    // Drain any in-flight async chunk appends (esp. IDB) before assembly.
    await Promise.all([...internal.pendingAppends]);

    // mimeType + startedAt are always set by start(); the ?? fallbacks are
    // defensive for the impossible case where stop()/salvage() runs without start().
    /* c8 ignore next 2 */
    const mimeType = internal.mimeType ?? 'video/webm';
    const blob = (await internal.store?.assemble(mimeType)) ?? new Blob([], { type: mimeType });
    const url = URL.createObjectURL(blob);

    // Post-await ownership check: if the session token advanced while we were
    // awaiting (dispose() or reset() called mid-flight), the recorder has been
    // torn down. Revoke the just-created object URL and return early — do NOT
    // stop tracks (already stopped by cleanupResources), do NOT setState, and
    // do NOT fire onResult (that would be the phantom result per spec §10).
    // This guard covers both salvage()->buildResult(true) and stop()->buildResult(false).
    if (internal.sessionToken !== entryToken) {
      URL.revokeObjectURL(url);
      // Return a dummy that satisfies the return type but is never observed by
      // any caller — salvage() and stop() callers that raced with dispose()
      // already hold stale references and the recorder is now idle.
      /* c8 ignore next */
      return {
        blob,
        url: '',
        mimeType,
        durationMs: 0,
        bytes: 0,
        suggestedFilename: '',
        release: async () => {},
      };
    }

    const durationMs = elapsedMs();
    const sequence = ++sequenceCounter;
    const filename = suggestedFilename(
      /* c8 ignore next */
      new Date(internal.startedAt ?? Date.now()),
      sequence,
      mimeType,
    );
    // extensionForMimeType is consumed inside suggestedFilename; ref retained for debug clarity
    void extensionForMimeType;

    const store = internal.store;
    internal.acquired?.all.forEach((t) => {
      try {
        t.stop();
      } catch {
        /* c8 ignore next */
        // best-effort
      }
    });

    setState('ready');

    let released = false;
    const result: RecordingResult = {
      blob,
      url,
      mimeType,
      durationMs,
      bytes: blob.size,
      suggestedFilename: filename,
      ...(partial ? { partial: true } : {}),
      release: async (): Promise<void> => {
        if (released) return;
        released = true;
        URL.revokeObjectURL(url);
        // Wipe IDB chunks (spec § 7.2 privacy contract). Best-effort —
        // failures don't block the idle transition since the data is
        // unreachable anyway (URL revoked, store ref about to drop).
        try {
          await store?.clear();
        } catch {
          /* c8 ignore next */
          // swallow; release() must not reject in normal flow
        }
        // Ownership guard: only act on the recorder state if we still own
        // it. The captured `store` is THIS release()'s session store. If
        // it no longer matches `internal.store`, another session has taken
        // over — this release is stale and must not touch internal state.
        // The store-ref match IS the session-ownership signal. State guard
        // alone (M4) was insufficient when the new session is also 'ready'
        // (cross-session stale release, M6 from principal review).
        if (internal.store === store) {
          internal.store = undefined;
          if (state === 'ready') setState('idle');
        }
      },
    };
    // Phase 4: deliver the result through one channel so user-stop AND
    // auto-stop (which discards stop()'s return) both reach the consumer.
    opts.onResult?.(result);
    return result;
  };

  const handle: RecorderHandle = {
    get state() {
      return state;
    },

    async start(): Promise<void> {
      if (state !== 'idle') {
        throw new RecorderError('invalid-state', `cannot start in state '${state}'`);
      }
      internal.intentionalStop = false;
      // MAJOR 1: reset per-session counters here so they do not leak across
      // stop()->release()->start() cycles (cleanupResources() is only called by
      // dispose() and certain error paths, not the normal stop+release flow).
      internal.chunkCount = 0;
      internal.memoryPressureFired = false;
      internal.lastErrorKind = undefined;
      internal.finalFlush = undefined;

      // Await any in-flight cleanup wipe from a prior session, then sweep any
      // crashed-session leftovers (> 1h old). Both privacy invariants from
      // spec § 7.2 + docs/SECURITY.md.
      if (internal.pendingCleanup) {
        await internal.pendingCleanup;
        internal.pendingCleanup = undefined;
      }
      // Note: the two sweeps key staleness off different clocks — sweepStaleChunkDatabases()
      // extracts the construction-time timestamp encoded in the DB name (Chromium-only
      // backstop via indexedDB.databases()), while sweepRegisteredSessions() keys off the
      // last-touch ts stored in the registry entry. The two backstops can therefore
      // disagree on which leftovers are stale; the registry sweep is the cross-browser path.
      await sweepStaleChunkDatabases();
      await sweepRegisteredSessions(Date.now());

      const mime = supportedMimeType();
      if (!mime) {
        throw toError(
          new RecorderError('unsupported-browser', 'no supported MediaRecorder MIME type'),
        );
      }
      internal.mimeType = mime;

      setState('requesting-permissions');

      try {
        internal.acquired = await acquireTracks({ mode: resolved.mode });
      } catch (err) {
        cleanupResources();
        throw toError(
          err instanceof RecorderError ? err : new RecorderError('track-failed', String(err)),
        );
      }

      // Attach track-ended listeners so mid-recording "Stop sharing" events
      // route through handleTrackFailure rather than silently dropping.
      internal.trackEndedDetachers = internal.acquired.all.map((track) => {
        const subject: PermissionSubject =
          track.kind === 'audio'
            ? 'mic'
            : track === internal.acquired!.camera
              ? 'camera'
              : 'screen';
        const onEnded = () => handleTrackFailure(subject);
        track.addEventListener('ended', onEnded);
        return () => track.removeEventListener('ended', onEnded);
      });

      // Post-permission wiring. If any of these throw (MediaRecorder ctor
      // rejecting the mime, captureStream failing, etc.) we MUST stop the
      // tracks we already acquired or they leak — visible camera/mic light
      // stays on. cleanupResources() handles that.
      try {
        internal.composer = createComposer({
          mode: resolved.mode,
          resolution: resolved.resolution,
          fps: resolved.fps,
          onOverlay: (ctx, frame) => internal.highlights?.draw(ctx, frame, performance.now()),
        });
        internal.composer.setLayers({
          screen: internal.acquired.screen,
          camera: internal.acquired.camera,
        });
        internal.composer.start();

        internal.highlights = createCursorHighlights({ enabled: resolved.cursorHighlights });
        internal.highlights.attach();

        const videoStream = internal.composer.captureStream();
        // Phase 4: expose a video-only composite stream for the live preview.
        opts.onPreviewReady?.(new MediaStream(videoStream.getVideoTracks()));
        const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
        if (internal.acquired.mic) tracks.push(internal.acquired.mic);
        internal.audioTrack = internal.acquired.mic;
        const combined = new MediaStream(tracks);

        internal.store = createChunkStore({
          strategy: resolved.storage,
          maxDurationMs: resolved.maxDurationMs,
          onFallback: () => opts.onStorageFallback?.(),
        });

        // MAJOR (stale-encoder-flush): use a per-session token to bind each
        // encoder's onChunk closure to its creation-time session. The token is
        // captured as a closure variable and compared against internal.sessionToken
        // on every chunk arrival. After cleanupResources() a new session increments
        // internal.sessionToken, so any late 'dataavailable' from the old encoder
        // sees a token mismatch and returns without touching the new session's store,
        // pendingAppends, or chunkCount. This closes the entire stale-closure class.
        const sessionToken = internal.sessionToken;
        internal.encoder = createEncoder({
          stream: combined,
          mimeType: mime,
          videoBitsPerSecond: resolved.videoBitsPerSecond,
          timesliceMs: TIMESLICE_MS,
          onChunk: (chunk) => {
            // Guard: if the session has advanced past this encoder's token,
            // this chunk is stale — discard it to prevent cross-session bleed.
            if (internal.sessionToken !== sessionToken) return;
            const store = internal.store;
            if (!store) return;
            const p = store.append(chunk);
            internal.pendingAppends.add(p);
            void p.finally(() => internal.pendingAppends.delete(p));
            opts.onBytesTick?.(store.bytes);
            internal.chunkCount += 1;
            if (
              !internal.memoryPressureFired &&
              internal.chunkCount >= resolved.memoryPressureChunkThreshold
            ) {
              internal.memoryPressureFired = true;
              opts.onMemoryPressure?.();
            }
          },
          onError: (err) => toError(err),
        });
        internal.encoder.start();

        internal.startedAt = Date.now();
        internal.pausedTotalMs = 0;
        internal.durationInterval = setInterval(() => {
          if (state === 'recording') opts.onDurationTick?.(elapsedMs());
        }, DURATION_TICK_MS);

        internal.autoStopTimeout = setTimeout(() => {
          if (state === 'recording' || state === 'paused') {
            void handle.stop().catch(() => {
              /* c8 ignore next */
              // error already routed through onError
            });
          }
        }, resolved.maxDurationMs - 100);
      } catch (err) {
        cleanupResources();
        /* c8 ignore next 7 — RecorderError vs Error vs primitive paths cannot
           all be exercised cleanly through the MediaRecorder ctor failure. */
        throw toError(
          err instanceof RecorderError
            ? err
            : new RecorderError(
                'recorder-failed',
                err instanceof Error ? err.message : String(err),
                {
                  cause: err,
                },
              ),
        );
      }

      setState('recording');
    },

    pause(): void {
      if (state !== 'recording') {
        throw new RecorderError('invalid-state', `cannot pause in state '${state}'`);
      }
      internal.encoder?.pause();
      internal.composer?.stop();
      internal.pausedAtMs = Date.now();
      setState('paused');
    },

    resume(): void {
      if (state !== 'paused') {
        throw new RecorderError('invalid-state', `cannot resume in state '${state}'`);
      }
      if (internal.pausedAtMs) {
        internal.pausedTotalMs += Date.now() - internal.pausedAtMs;
        internal.pausedAtMs = undefined;
      }
      internal.encoder?.resume();
      internal.composer?.start();
      setState('recording');
    },

    async stop(): Promise<RecordingResult> {
      if (state !== 'recording' && state !== 'paused') {
        throw new RecorderError('invalid-state', `cannot stop in state '${state}'`);
      }
      internal.intentionalStop = true;
      internal.trackEndedDetachers.forEach((d) => d());
      internal.trackEndedDetachers = [];
      setState('finalizing');
      internal.finishedAt = Date.now();
      if (internal.pausedAtMs) {
        internal.pausedTotalMs += internal.finishedAt - internal.pausedAtMs;
        internal.pausedAtMs = undefined;
      }

      await internal.encoder?.stop();
      internal.composer?.stop();
      internal.highlights?.detach();

      return buildResult(false);
    },

    async salvage(): Promise<RecordingResult> {
      if (state !== 'error') {
        throw new RecorderError('invalid-state', `cannot salvage in state '${state}'`);
      }
      // MAJOR 2: salvage() is only meaningful after a track-failed error — the
      // only kind where the store is still intact with a coherent partial
      // recording. Other error kinds (e.g. recorder-failed) may also leave
      // internal.store set, but the store may be in an indeterminate state and
      // the spec contract is explicit: salvage() is valid only from track-failed.
      if (internal.lastErrorKind !== 'track-failed') {
        throw new RecorderError(
          'invalid-state',
          'salvage() is only valid after a track-failed error',
        );
      }
      if (!internal.store) {
        throw new RecorderError('invalid-state', 'nothing to salvage');
      }
      // Re-entrancy guard: mirror stop()'s pattern — transition out of 'error'
      // SYNCHRONOUSLY before the first await so a concurrent second salvage()
      // call fails the state !== 'error' guard above and rejects with
      // invalid-state. Without this, both calls pass the guard, buildResult()
      // runs twice (onResult fires twice — corrupts §10 analytics), and two
      // competing release() closures race on store.clear() with two object URLs
      // created but only one revokeObjectURL path guaranteed.
      setState('finalizing');
      return buildResult(true);
    },

    dispose(): void {
      cleanupResources();
      if (state !== 'idle') setState('idle');
    },
  };

  return handle;
}
