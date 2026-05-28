// packages/recorder/src/recorder.ts
import { acquireTracks, type AcquiredTracks } from './acquire';
import { supportedMimeType } from './capabilities';
import { createComposer, type Composer } from './composer';
import { createCursorHighlights, type CursorHighlights } from './cursor-highlights';
import { createEncoder, type Encoder } from './encoder';
import { RecorderError } from './errors';
import { extensionForMimeType, suggestedFilename } from './filename';
import { createChunkStore, type ChunkStore } from './storage';
import type { RecorderHandle, RecorderOptions, RecorderState, RecordingResult } from './types';

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

let sequenceCounter = 0;

const IDB_CHUNK_PREFIX = 'record-me-chunks-';
// Stale IDB session sweep window — leftovers older than 24h get nuked on start().
const STALE_SESSION_THRESHOLD_MS = 24 * 60 * 60 * 1000;

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
  };

  const setState = (next: RecorderState) => {
    if (next === state) return;
    state = next;
    opts.onStateChange?.(state);
  };

  const toError = (err: RecorderError): RecorderError => {
    setState('error');
    opts.onError?.(err);
    return err;
  };

  const cleanupResources = () => {
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
    const storeToWipe = internal.store;
    if (storeToWipe) {
      internal.pendingCleanup = storeToWipe.clear().catch(() => {
        /* c8 ignore next */
        // best-effort; failures don't block lifecycle
      });
    }
    internal.acquired = undefined;
    internal.composer = undefined;
    internal.highlights = undefined;
    internal.encoder = undefined;
    internal.audioTrack = undefined;
    internal.store = undefined;
  };

  const elapsedMs = (): number => {
    if (!internal.startedAt) return 0;
    const end = internal.finishedAt ?? Date.now();
    return Math.max(0, end - internal.startedAt - internal.pausedTotalMs);
  };

  const handle: RecorderHandle = {
    get state() {
      return state;
    },

    async start(): Promise<void> {
      if (state !== 'idle') {
        throw new RecorderError('invalid-state', `cannot start in state '${state}'`);
      }

      // Await any in-flight cleanup wipe from a prior session, then sweep any
      // crashed-session leftovers (> 24h old). Both privacy invariants from
      // spec § 7.2 + docs/SECURITY.md.
      if (internal.pendingCleanup) {
        await internal.pendingCleanup;
        internal.pendingCleanup = undefined;
      }
      await sweepStaleChunkDatabases();

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
        const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
        if (internal.acquired.mic) tracks.push(internal.acquired.mic);
        internal.audioTrack = internal.acquired.mic;
        const combined = new MediaStream(tracks);

        internal.store = createChunkStore({
          strategy: resolved.storage,
          maxDurationMs: resolved.maxDurationMs,
        });

        internal.encoder = createEncoder({
          stream: combined,
          mimeType: mime,
          videoBitsPerSecond: resolved.videoBitsPerSecond,
          timesliceMs: TIMESLICE_MS,
          onChunk: (chunk) => {
            const store = internal.store;
            if (!store) return;
            const p = store.append(chunk);
            internal.pendingAppends.add(p);
            void p.finally(() => internal.pendingAppends.delete(p));
            opts.onBytesTick?.(store.bytes);
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
      setState('finalizing');
      internal.finishedAt = Date.now();
      if (internal.pausedAtMs) {
        internal.pausedTotalMs += internal.finishedAt - internal.pausedAtMs;
        internal.pausedAtMs = undefined;
      }

      await internal.encoder?.stop();
      internal.composer?.stop();
      internal.highlights?.detach();

      // Drain any in-flight async chunk appends (esp. IDB) before assembly.
      await Promise.all([...internal.pendingAppends]);

      // mimeType + startedAt are always set by start(); the ?? fallbacks are
      // defensive for the impossible case where stop() runs without start().
      /* c8 ignore next 2 */
      const mimeType = internal.mimeType ?? 'video/webm';
      const blob = (await internal.store?.assemble(mimeType)) ?? new Blob([], { type: mimeType });
      const url = URL.createObjectURL(blob);
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
      return {
        blob,
        url,
        mimeType,
        durationMs,
        bytes: blob.size,
        suggestedFilename: filename,
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
          internal.store = undefined;
          // Transition back to idle so a new session can begin (spec § 7.2).
          if (state !== 'idle') setState('idle');
        },
      };
    },

    dispose(): void {
      cleanupResources();
      if (state !== 'idle') setState('idle');
    },
  };

  return handle;
}
