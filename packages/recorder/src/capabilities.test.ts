// packages/recorder/src/capabilities.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { probeCapabilities, supportedMimeType } from './capabilities';
import { MockMediaRecorder } from './test/mocks/media-recorder';

describe('supportedMimeType', () => {
  beforeEach(() => MockMediaRecorder.reset());

  it('returns null when MediaRecorder is unavailable', () => {
    const original = globalThis.MediaRecorder;
    // @ts-expect-error force undefined for this test
    delete globalThis.MediaRecorder;
    try {
      expect(supportedMimeType()).toBeNull();
    } finally {
      globalThis.MediaRecorder = original;
    }
  });

  it('prefers MP4 H.264 when supported', () => {
    MockMediaRecorder.supportedMimeTypes = new Set([
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/webm;codecs=vp9,opus',
    ]);
    expect(supportedMimeType()).toBe('video/mp4;codecs=avc1.42E01E,mp4a.40.2');
  });

  it('falls back to WebM VP9 when no MP4 codec string is supported', () => {
    MockMediaRecorder.supportedMimeTypes = new Set([
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
    ]);
    expect(supportedMimeType()).toBe('video/webm;codecs=vp9,opus');
  });

  it('returns null when no codec is supported', () => {
    MockMediaRecorder.supportedMimeTypes = new Set();
    expect(supportedMimeType()).toBeNull();
  });
});

describe('probeCapabilities', () => {
  const originalUserAgent = Object.getOwnPropertyDescriptor(globalThis.navigator, 'userAgent');

  function stubUserAgent(ua: string) {
    Object.defineProperty(globalThis.navigator, 'userAgent', { value: ua, configurable: true });
  }

  afterEach(() => {
    if (originalUserAgent) {
      Object.defineProperty(globalThis.navigator, 'userAgent', originalUserAgent);
    }
  });

  it('reports the current environment with boolean fields', () => {
    const report = probeCapabilities();
    expect(typeof report.hasMediaRecorder).toBe('boolean');
    expect(typeof report.hasGetDisplayMedia).toBe('boolean');
    expect(typeof report.hasGetUserMedia).toBe('boolean');
    expect(typeof report.isSafari).toBe('boolean');
    expect(typeof report.isMobile).toBe('boolean');
  });

  it('detects Safari from the user agent', () => {
    stubUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    );
    expect(probeCapabilities().isSafari).toBe(true);
  });

  it('does not flag Chrome as Safari', () => {
    stubUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    );
    expect(probeCapabilities().isSafari).toBe(false);
  });

  it('detects mobile from the user agent', () => {
    stubUserAgent(
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36',
    );
    expect(probeCapabilities().isMobile).toBe(true);
  });
});
