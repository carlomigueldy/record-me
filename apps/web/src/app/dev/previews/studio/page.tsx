import { MetaChip, RecDot, StudioShell } from '@record-me/ui';

export default function StudioPreview() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-16">
      <StudioShell
        className="w-full max-w-5xl"
        header={
          <>
            <div className="flex items-center gap-3">
              <RecDot />
              <span className="font-mono text-sm text-ivory">00:42</span>
              <span className="font-mono text-xs text-ivory-mut">· 12.4 MB</span>
            </div>
            <MetaChip>screen + camera + cursor</MetaChip>
          </>
        }
        footer={
          <>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ivory-mut">
              studio · live preview
            </span>
            <div className="flex items-center gap-6 font-mono text-xs uppercase tracking-wider">
              <span className="text-ivory-dim">■ stop</span>
              <span className="text-ivory-dim">↻ restart</span>
              <span className="text-amber">⤓ download</span>
            </div>
          </>
        }
      >
        {/* Stylised "captured screen" — abstracted grid + vignette, no fake UI. Editorial restraint. */}
        <div className="relative aspect-video w-full overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(237,230,214,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(237,230,214,0.04) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-bg/40" />
          {/* Camera PiP — circular, bottom-right, label-only */}
          <div className="absolute bottom-6 right-6 flex h-24 w-24 items-center justify-center rounded-full border border-line bg-surface text-ivory-dim">
            <span className="font-mono text-[10px] uppercase tracking-widest">cam</span>
          </div>
        </div>
      </StudioShell>
    </main>
  );
}
