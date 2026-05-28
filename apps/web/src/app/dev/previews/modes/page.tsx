import { ModeCard } from '@record-me/ui';

export default function ModesPreview() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg p-16">
      <header className="flex flex-col gap-4">
        <span className="font-mono text-xs uppercase tracking-widest text-ivory-mut">
          three modes
        </span>
        <h2 className="font-serif text-5xl leading-tight text-ivory">
          Choose your <em className="italic text-amber">composition</em>.
        </h2>
      </header>

      <div className="my-auto grid grid-cols-3 gap-6">
        <ModeCard
          eyebrow="A · the full recital"
          title="Screen + Camera + Cursor"
          description="Picture-in-picture camera, click highlights, the whole show. The mode you reach for when the camera matters as much as the screen."
        />
        <ModeCard
          eyebrow="B · just the work"
          title="Screen + Cursor"
          description="Clean walk-throughs and demos. No camera, no distraction — only the work and where you're pointing."
          accent
        />
        <ModeCard
          eyebrow="C · talking head"
          title="Camera only"
          description="Async updates, round-framed and centered. The quickest path from thought to clip."
        />
      </div>

      <footer className="flex items-center justify-between pt-8 text-[10px] uppercase tracking-widest text-ivory-mut">
        <span className="font-mono">five primitives · shipped phase 2</span>
        <span className="font-mono">apps/web/src/app/dev/previews/modes</span>
      </footer>
    </main>
  );
}
