'use client';

/**
 * MemoryPressureBanner — rendered above StudioShell when the recorder engine
 * signals that the buffered chunk count has crossed the memory-pressure
 * threshold (spec § 14). The tone is calm and editorial: amber-tinted, not
 * alarming. role="status" keeps the ARIA live region polite (non-interruptive).
 */
export function MemoryPressureBanner() {
  return (
    <div
      role="status"
      aria-label="Recording length advisory"
      className="flex items-center gap-3 border-b border-amber/30 bg-amber/10 px-6 py-3 text-sm"
    >
      <span aria-hidden className="font-mono text-xs uppercase tracking-widest text-amber">
        heads up
      </span>
      <p className="leading-snug text-ivory-dim">
        Recording is getting long. We recommend stopping soon.
      </p>
    </div>
  );
}
