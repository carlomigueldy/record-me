// packages/recorder/src/types.ts
// Public types for @record-me/recorder. Spec § 7.6 is the source of truth.

export type RecordMode = 'screen+cam+cursor' | 'screen+cursor' | 'cam-only';

export type RecorderState =
  | 'idle'
  | 'requesting-permissions'
  | 'recording'
  | 'paused'
  | 'finalizing'
  | 'ready'
  | 'error';

export type ChunkStorageStrategy = 'auto' | 'memory' | 'indexeddb';

export type RecordingResolution = '720p' | '1080p';

export interface RecorderOptions {
  mode: RecordMode;
  resolution?: RecordingResolution;
  fps?: number;
  videoBitsPerSecond?: number;
  maxDurationMs?: number;
  cursorHighlights?: boolean;
  storage?: ChunkStorageStrategy;
  onStateChange?: (state: RecorderState) => void;
  onDurationTick?: (ms: number) => void;
  onBytesTick?: (bytes: number) => void;
  onError?: (error: RecorderErrorLike) => void;
}

// Re-declared here as a structural type so consumers don't need to import the
// concrete RecorderError class to wire callbacks. The class in errors.ts is
// assignable to this shape.
export interface RecorderErrorLike {
  readonly name: string;
  readonly message: string;
  readonly kind: RecorderErrorKind;
  readonly cause?: unknown;
}

export type RecorderErrorKind =
  | 'permission-denied'
  | 'unsupported-browser'
  | 'track-failed'
  | 'recorder-failed'
  | 'storage-failed'
  | 'invalid-state';

export interface RecordingResult {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
  bytes: number;
  suggestedFilename: string;
  release: () => void;
}

export interface RecorderHandle {
  readonly state: RecorderState;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<RecordingResult>;
  dispose: () => void;
}
