// packages/recorder/src/index.ts
// @record-me/recorder · public surface

export { supportedMimeType, probeCapabilities, MIME_PREFERENCE } from './capabilities';
export type { CapabilityReport } from './capabilities';
export type {
  RecordMode,
  RecorderState,
  RecorderOptions,
  RecordingResolution,
  ChunkStorageStrategy,
  RecordingResult,
  RecorderHandle,
  RecorderErrorLike,
  RecorderErrorKind,
} from './types';
export { RecorderError } from './errors';
export type { PermissionSubject } from './errors';
export { suggestedFilename, extensionForMimeType } from './filename';

export const RECORDER_PACKAGE_VERSION = '0.1.0';
