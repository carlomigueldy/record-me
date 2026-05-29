'use client';

import { MetaChip } from '@record-me/ui';

export function UnsupportedState() {
  return (
    <div className="flex flex-col items-start gap-4 p-10">
      <MetaChip tone="danger">unsupported browser</MetaChip>
      <p className="max-w-prose font-serif text-2xl leading-snug text-ivory">
        Your browser doesn&apos;t support in-browser recording.
      </p>
      <p className="text-sm text-ivory-dim">Try Chrome, Edge, Firefox, or Arc on desktop.</p>
    </div>
  );
}
