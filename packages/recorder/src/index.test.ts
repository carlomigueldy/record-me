import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { probeCapabilities, supportedMimeType, RECORDER_PACKAGE_VERSION } from './index';

describe('@record-me/recorder · phase 1 scaffold', () => {
  it('exposes a version string', () => {
    expect(RECORDER_PACKAGE_VERSION).toBe('0.0.0');
  });

  describe('supportedMimeType', () => {
    let originalMediaRecorder: typeof MediaRecorder | undefined;

    beforeEach(() => {
      originalMediaRecorder = globalThis.MediaRecorder;
    });

    afterEach(() => {
      if (originalMediaRecorder) {
        globalThis.MediaRecorder = originalMediaRecorder;
      } else {
        // @ts-expect-error reset
        delete globalThis.MediaRecorder;
      }
    });

    it('returns null when MediaRecorder is unavailable', () => {
      // @ts-expect-error force undefined for this test
      delete globalThis.MediaRecorder;
      expect(supportedMimeType()).toBeNull();
    });

    it('prefers MP4 H.264 when supported', () => {
      const isTypeSupported = vi.fn((mime: string) => mime.startsWith('video/mp4'));
      // @ts-expect-error minimal stub for the test
      globalThis.MediaRecorder = { isTypeSupported };
      expect(supportedMimeType()).toBe('video/mp4;codecs=avc1.42E01E,mp4a.40.2');
    });

    it('falls back to WebM VP9 when MP4 is not supported', () => {
      const isTypeSupported = vi.fn(
        (mime: string) =>
          mime === 'video/webm;codecs=vp9,opus' || mime === 'video/webm;codecs=vp8,opus',
      );
      // @ts-expect-error minimal stub for the test
      globalThis.MediaRecorder = { isTypeSupported };
      expect(supportedMimeType()).toBe('video/webm;codecs=vp9,opus');
    });
  });

  describe('probeCapabilities', () => {
    const originalUserAgent = Object.getOwnPropertyDescriptor(globalThis.navigator, 'userAgent');

    function stubUserAgent(ua: string) {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: ua,
        configurable: true,
      });
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
      const report = probeCapabilities();
      expect(report.isSafari).toBe(false);
    });

    it('detects mobile from the user agent', () => {
      stubUserAgent(
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36',
      );
      expect(probeCapabilities().isMobile).toBe(true);
    });
  });
});
