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
}

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
    internal.acquired = undefined;
    internal.composer = undefined;
    internal.highlights = undefined;
    internal.encoder = undefined;
    internal.audioTrack = undefined;
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
          void internal.store?.append(chunk);
          opts.onBytesTick?.(internal.store?.bytes ?? 0);
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

      const mimeType = internal.mimeType ?? 'video/webm';
      const blob = (await internal.store?.assemble(mimeType)) ?? new Blob([], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const durationMs = elapsedMs();
      const sequence = ++sequenceCounter;
      const filename = suggestedFilename(
        new Date(internal.startedAt ?? Date.now()),
        sequence,
        mimeType,
      );
      // extensionForMimeType is consumed inside suggestedFilename; ref retained for debug clarity
      void extensionForMimeType;

      const store = internal.store;
      const acquired = internal.acquired;
      internal.acquired?.all.forEach((t) => {
        try {
          t.stop();
        } catch {
          /* c8 ignore next */
          // best-effort
        }
      });

      setState('ready');

      return {
        blob,
        url,
        mimeType,
        durationMs,
        bytes: blob.size,
        suggestedFilename: filename,
        release: () => {
          URL.revokeObjectURL(url);
          void store?.clear();
          // keep acquired reference for tests inspecting cleanup state
          void acquired;
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
