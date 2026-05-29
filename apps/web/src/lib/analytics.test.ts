import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }));
import { track } from '@vercel/analytics';
import { analytics } from './analytics';

beforeEach(() => vi.clearAllMocks());

describe('analytics', () => {
  it('modeSelected', () => {
    analytics.modeSelected('cam-only');
    expect(track).toHaveBeenCalledWith('mode_selected', { mode: 'cam-only' });
  });
  it('recordingStarted', () => {
    analytics.recordingStarted({ mode: 'screen+cursor', resolution: '1080p', cap_minutes: 10 });
    expect(track).toHaveBeenCalledWith('recording_started', {
      mode: 'screen+cursor',
      resolution: '1080p',
      cap_minutes: 10,
    });
  });
  it('recordingStopped omits partial when undefined', () => {
    analytics.recordingStopped({
      mode: 'cam-only',
      duration_seconds: 42,
      bytes: 100,
      mime_type: 'video/mp4',
    });
    expect(track).toHaveBeenCalledWith('recording_stopped', {
      mode: 'cam-only',
      duration_seconds: 42,
      bytes: 100,
      mime_type: 'video/mp4',
    });
  });
  it('recordingDownloaded', () => {
    analytics.recordingDownloaded({
      mode: 'cam-only',
      duration_seconds: 42,
      bytes: 100,
      mime_type: 'video/mp4',
    });
    expect(track).toHaveBeenCalledWith(
      'recording_downloaded',
      expect.objectContaining({ mode: 'cam-only' }),
    );
  });
  it('permissionDenied', () => {
    analytics.permissionDenied('camera');
    expect(track).toHaveBeenCalledWith('permission_denied', { kind: 'camera' });
  });
  it('browserUnsupported', () => {
    analytics.browserUnsupported({ feature: 'MediaRecorder', ua_browser: 'Safari' });
    expect(track).toHaveBeenCalledWith('browser_unsupported', {
      feature: 'MediaRecorder',
      ua_browser: 'Safari',
    });
  });
  it('cursorHighlightDisabled', () => {
    analytics.cursorHighlightDisabled('opt-out');
    expect(track).toHaveBeenCalledWith('cursor_highlight_disabled', { reason: 'opt-out' });
  });
});
