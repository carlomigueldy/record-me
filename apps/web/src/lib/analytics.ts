import { track } from '@vercel/analytics';
import type { RecordMode, RecordingResolution } from '@record-me/recorder';

export type PermissionDeviceKind = 'screen' | 'camera' | 'mic';
export type CursorDisabledReason = 'opt-out' | 'not-record-me-tab';

/**
 * Typed, zero-PII wrapper over Vercel Analytics (parent spec §10.2, §15).
 * The studio is the only emit site for these events.
 */
export const analytics = {
  modeSelected(mode: RecordMode): void {
    track('mode_selected', { mode });
  },
  recordingStarted(p: {
    mode: RecordMode;
    resolution: RecordingResolution;
    cap_minutes: number;
  }): void {
    track('recording_started', {
      mode: p.mode,
      resolution: p.resolution,
      cap_minutes: p.cap_minutes,
    });
  },
  recordingStopped(p: {
    mode: RecordMode;
    duration_seconds: number;
    bytes: number;
    mime_type: string;
    partial?: boolean;
  }): void {
    const props: Record<string, string | number | boolean> = {
      mode: p.mode,
      duration_seconds: p.duration_seconds,
      bytes: p.bytes,
      mime_type: p.mime_type,
    };
    if (p.partial !== undefined) props.partial = p.partial;
    track('recording_stopped', props);
  },
  recordingDownloaded(p: {
    mode: RecordMode;
    duration_seconds: number;
    bytes: number;
    mime_type: string;
  }): void {
    track('recording_downloaded', {
      mode: p.mode,
      duration_seconds: p.duration_seconds,
      bytes: p.bytes,
      mime_type: p.mime_type,
    });
  },
  permissionDenied(kind: PermissionDeviceKind): void {
    track('permission_denied', { kind });
  },
  browserUnsupported(p: { feature: string; ua_browser: string }): void {
    track('browser_unsupported', { feature: p.feature, ua_browser: p.ua_browser });
  },
  cursorHighlightDisabled(reason: CursorDisabledReason): void {
    track('cursor_highlight_disabled', { reason });
  },
};
