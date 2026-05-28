// packages/recorder/src/filename.test.ts
import { describe, it, expect } from 'vitest';
import { suggestedFilename, extensionForMimeType } from './filename';

describe('extensionForMimeType', () => {
  it('returns mp4 for any video/mp4 codec string', () => {
    expect(extensionForMimeType('video/mp4;codecs=avc1.42E01E,mp4a.40.2')).toBe('mp4');
    expect(extensionForMimeType('video/mp4;codecs=h264,aac')).toBe('mp4');
    expect(extensionForMimeType('video/mp4')).toBe('mp4');
  });

  it('returns webm for any video/webm codec string', () => {
    expect(extensionForMimeType('video/webm;codecs=vp9,opus')).toBe('webm');
    expect(extensionForMimeType('video/webm')).toBe('webm');
  });

  it('falls back to webm for unknown types', () => {
    expect(extensionForMimeType('video/x-matroska')).toBe('webm');
    expect(extensionForMimeType('')).toBe('webm');
  });
});

describe('suggestedFilename', () => {
  it('formats as record-me-YYYY-MM-DD-NNN.<ext>', () => {
    const at = new Date('2026-05-28T12:34:56Z');
    expect(suggestedFilename(at, 1, 'video/mp4;codecs=avc1.42E01E,mp4a.40.2')).toBe(
      'record-me-2026-05-28-001.mp4',
    );
  });

  it('pads sequence to three digits', () => {
    const at = new Date('2026-01-02T00:00:00Z');
    expect(suggestedFilename(at, 42, 'video/webm;codecs=vp9,opus')).toBe(
      'record-me-2026-01-02-042.webm',
    );
    expect(suggestedFilename(at, 999, 'video/mp4')).toBe('record-me-2026-01-02-999.mp4');
  });

  it('uses UTC components so timezones do not shift the date', () => {
    const at = new Date('2026-12-31T23:59:00Z');
    expect(suggestedFilename(at, 7, 'video/mp4')).toBe('record-me-2026-12-31-007.mp4');
  });
});
