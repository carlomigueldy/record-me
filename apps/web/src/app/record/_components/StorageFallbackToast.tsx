'use client';

/**
 * StorageFallbackToast — rendered above StudioShell when an IndexedDB write
 * failure causes the engine to fall back to in-memory chunk storage (spec § 14).
 *
 * Design: amber-tinted, editorially calm. role="alert" emits an assertive ARIA
 * live-region announcement (more urgent than the MemoryPressureBanner's "status")
 * because the user must know their session is now memory-backed and should keep
 * the tab open. No hardcoded hex — all Twilight CSS variable tokens.
 */
export function StorageFallbackToast() {
  return (
    <div
      role="alert"
      aria-label="Storage fallback notice"
      className="flex items-center gap-3 border-b border-amber/30 bg-amber/10 px-6 py-3 text-sm"
    >
      <span aria-hidden className="font-mono text-xs uppercase tracking-widest text-amber">
        storage
      </span>
      <p className="leading-snug text-ivory-dim">
        Disk buffering hit a snag &mdash; we&rsquo;re saving to memory instead. Keep this tab open
        and consider stopping sooner.
      </p>
    </div>
  );
}
