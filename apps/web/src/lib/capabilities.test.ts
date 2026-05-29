import { describe, it, expect } from 'vitest';
import { deriveStudioCapabilities, browserName } from './capabilities';
import type { CapabilityReport } from '@record-me/recorder';

const base: CapabilityReport = {
  hasMediaRecorder: true,
  hasGetDisplayMedia: true,
  hasGetUserMedia: true,
  supportedMimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  isSafari: false,
  isMobile: false,
};

describe('deriveStudioCapabilities', () => {
  it('desktop with full support offers all three modes', () => {
    const caps = deriveStudioCapabilities(base);
    expect(caps.supported).toBe(true);
    expect(caps.availableModes).toEqual(['screen+cam+cursor', 'screen+cursor', 'cam-only']);
  });
  it('mobile drops the screen modes', () => {
    const caps = deriveStudioCapabilities({ ...base, isMobile: true });
    expect(caps.availableModes).toEqual(['cam-only']);
  });
  it('no getDisplayMedia drops the screen modes', () => {
    const caps = deriveStudioCapabilities({ ...base, hasGetDisplayMedia: false });
    expect(caps.availableModes).toEqual(['cam-only']);
  });
  it('no MediaRecorder means unsupported', () => {
    const caps = deriveStudioCapabilities({ ...base, hasMediaRecorder: false });
    expect(caps.supported).toBe(false);
  });
  it('no supported MIME means unsupported', () => {
    const caps = deriveStudioCapabilities({ ...base, supportedMimeType: null });
    expect(caps.supported).toBe(false);
  });
});

describe('browserName', () => {
  it('detects common browsers', () => {
    expect(browserName('Mozilla/5.0 ... Chrome/120 Safari/537')).toBe('Chrome');
    expect(browserName('Mozilla/5.0 ... Firefox/121')).toBe('Firefox');
    expect(browserName('Mozilla/5.0 ... Version/17 Safari/605')).toBe('Safari');
    expect(browserName('Mozilla/5.0 ... Edg/120')).toBe('Edge');
    expect(browserName('something weird')).toBe('Unknown');
  });
});
