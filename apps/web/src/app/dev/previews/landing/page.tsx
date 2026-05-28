import { Button, MetaChip, WordMark } from '@record-me/ui';

export default function LandingPreview() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg p-16">
      <header className="flex items-center justify-between">
        <WordMark size="sm" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-ivory-mut">
          v1 · preview
        </span>
      </header>

      <div className="my-auto flex max-w-4xl flex-col gap-10">
        <div className="h-px w-16 bg-line" aria-hidden="true" />
        <h1 className="font-serif text-7xl leading-[1.05] text-ivory">
          An editorial recording
          <br />
          instrument that lives in
          <br />
          your <em className="italic text-amber">browser.</em>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-ivory-dim">
          Screen, camera, cursor — composed in the browser, downloaded to disk. No accounts, no
          upload, no compromise on craft.
        </p>
        <div className="flex items-center gap-6 pt-2">
          <Button size="lg">[ start recording ]</Button>
          <span className="font-mono text-xs uppercase tracking-widest text-ivory-dim">
            ↓ see the three modes
          </span>
        </div>
      </div>

      <footer className="flex flex-wrap gap-2 pt-12">
        <MetaChip>privacy-first</MetaChip>
        <MetaChip>no upload</MetaChip>
        <MetaChip>three modes</MetaChip>
        <MetaChip>browser-native</MetaChip>
      </footer>
    </main>
  );
}
