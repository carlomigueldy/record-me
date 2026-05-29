import type { RecorderState, RecordingResult, RecorderErrorLike } from '@record-me/recorder';

export type StudioPhase =
  | 'unsupported'
  | 'setup'
  | 'requesting'
  | 'live'
  | 'paused'
  | 'finalizing'
  | 'review'
  | 'error';

export function derivePhase(
  state: RecorderState,
  result: RecordingResult | null,
  error: RecorderErrorLike | null,
  supported: boolean,
): StudioPhase {
  if (!supported) return 'unsupported';
  if (error) return 'error';
  switch (state) {
    case 'idle':
      return 'setup';
    case 'requesting-permissions':
      return 'requesting';
    case 'recording':
      return 'live';
    case 'paused':
      return 'paused';
    case 'finalizing':
      return 'finalizing';
    case 'ready':
      return result ? 'review' : 'finalizing';
    case 'error':
      return 'error';
  }
}
