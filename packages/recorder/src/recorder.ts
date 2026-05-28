// packages/recorder/src/recorder.ts
import { RecorderError } from './errors';
import type { RecorderHandle, RecorderOptions, RecorderState, RecordingResult } from './types';

const DEFAULTS = {
  resolution: '1080p' as const,
  fps: 30,
  videoBitsPerSecond: 4_000_000,
  maxDurationMs: 600_000,
  cursorHighlights: true,
  storage: 'auto' as const,
};

export function createRecorder(opts: RecorderOptions): RecorderHandle {
  let state: RecorderState = 'idle';
  const setState = (next: RecorderState) => {
    if (next === state) return;
    state = next;
    opts.onStateChange?.(state);
  };

  // Suppress unused-defaults warnings until full lifecycle lands in Task H2.
  void DEFAULTS;

  const invalid = (verb: string) =>
    new RecorderError('invalid-state', `cannot ${verb} in state '${state}'`);

  return {
    get state() {
      return state;
    },
    async start() {
      throw invalid('start');
    },
    pause() {
      throw invalid('pause');
    },
    resume() {
      throw invalid('resume');
    },
    async stop(): Promise<RecordingResult> {
      throw invalid('stop');
    },
    dispose() {
      setState('idle');
    },
  };
}
