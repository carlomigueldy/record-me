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

beforeEach(() => {
  resetMediaDevices();
  MockMediaRecorder.reset();
});

afterEach(() => {
  resetMediaDevices();
  MockMediaRecorder.reset();
});
