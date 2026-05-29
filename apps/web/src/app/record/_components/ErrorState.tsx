'use client';

import type { RecorderErrorLike } from '@record-me/recorder';
import { Button, MetaChip } from '@record-me/ui';

export interface ErrorStateProps {
  error: RecorderErrorLike;
  onRetry: () => void;
}

function messageFor(error: RecorderErrorLike): string {
  if (error.kind === 'permission-denied') {
    const subject = error.subject ?? 'device';
    return `We need ${subject} access to record this mode.`;
  }
  if (error.kind === 'track-failed') {
    return 'Your recording was interrupted — a screen, camera, or microphone source stopped.';
  }
  return 'Something interrupted the recording.';
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-start gap-4 p-10">
      <MetaChip tone="danger">recording error</MetaChip>
      <p className="max-w-prose font-serif text-2xl leading-snug text-ivory">{messageFor(error)}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
