// packages/recorder/src/test/setup.ts
// Runs once per test file (Vitest setupFiles semantics). Each test should
// reset per-test state (e.g. resetMediaDevices(), MockMediaRecorder.reset())
// in its own beforeEach where it matters.

import 'fake-indexeddb/auto';
import { afterEach, beforeEach } from 'vitest';
import { installMediaStreamGlobals } from './mocks/media-stream';
import { installMediaRecorderGlobal, MockMediaRecorder } from './mocks/media-recorder';
import { installMediaDevices, resetMediaDevices } from './mocks/media-devices';
import { installCanvasMocks } from './mocks/canvas';
import { installAudioContextGlobal } from './mocks/audio-context';

installMediaStreamGlobals();
installMediaRecorderGlobal();
installMediaDevices();
installCanvasMocks();
installAudioContextGlobal();

// jsdom omits URL.createObjectURL / revokeObjectURL — stub minimal versions so
// recorder.stop() can produce a `blob:` URL for the RecordingResult.
let blobUrlSeq = 0;
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = (_blob: Blob | MediaSource): string => `blob:mock/${++blobUrlSeq}`;
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = (_url: string): void => {
    /* no-op — tests assert on call presence, not effect */
  };
}

beforeEach(() => {
  resetMediaDevices();
  MockMediaRecorder.reset();
});

afterEach(() => {
  resetMediaDevices();
  MockMediaRecorder.reset();
});
