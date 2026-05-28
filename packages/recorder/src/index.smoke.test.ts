// packages/recorder/src/index.smoke.test.ts
import { describe, it, expect } from 'vitest';
import * as api from './index';

describe('@record-me/recorder · public surface', () => {
  it('re-exports createRecorder + capabilities + errors + filename', () => {
    expect(typeof api.createRecorder).toBe('function');
    expect(typeof api.supportedMimeType).toBe('function');
    expect(typeof api.probeCapabilities).toBe('function');
    expect(typeof api.suggestedFilename).toBe('function');
    expect(typeof api.extensionForMimeType).toBe('function');
    expect(api.RecorderError).toBeDefined();
    expect(api.RECORDER_PACKAGE_VERSION).toBe('0.1.0');
  });
});
