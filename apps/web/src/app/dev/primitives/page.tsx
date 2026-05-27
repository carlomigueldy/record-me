import { Button, MetaChip, ModeCard, RecDot, StudioShell, WordMark } from '@record-me/ui';

export default function PrimitivesShowcase() {
  return (
    <main className="flex flex-col gap-16">
      <header className="flex items-baseline justify-between">
        <h1 className="font-serif text-4xl">Brand primitives</h1>
        <MetaChip>phase 2 · /dev/primitives</MetaChip>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">WordMark</h2>
        <div className="flex items-baseline gap-8">
          <WordMark size="sm" />
          <WordMark />
          <WordMark size="lg" />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">RecDot</h2>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <RecDot size="sm" />{' '}
            <span className="font-mono text-xs text-ivory-mut">sm · active</span>
          </div>
          <div className="flex items-center gap-2">
            <RecDot /> <span className="font-mono text-xs text-ivory-mut">md · active</span>
          </div>
          <div className="flex items-center gap-2">
            <RecDot size="lg" />{' '}
            <span className="font-mono text-xs text-ivory-mut">lg · active</span>
          </div>
          <div className="flex items-center gap-2">
            <RecDot active={false} label="Paused" />{' '}
            <span className="font-mono text-xs text-ivory-mut">paused</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">MetaChip</h2>
        <div className="flex flex-wrap items-center gap-3">
          <MetaChip>1080p · 30fps</MetaChip>
          <MetaChip>mp4 · h.264</MetaChip>
          <MetaChip tone="amber">REC · 00:00:42</MetaChip>
          <MetaChip tone="success">saved</MetaChip>
          <MetaChip tone="danger">mic blocked</MetaChip>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Button</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Start recording</Button>
          <Button variant="secondary">Pick a mode</Button>
          <Button variant="ghost">Discard</Button>
          <Button size="sm">small</Button>
          <Button size="lg">large</Button>
          <Button disabled>disabled</Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">ModeCard triptych</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ModeCard
            eyebrow="Mode A"
            title="Screen, camera & cursor"
            description="The full recital. Picture-in-picture camera, click highlights."
            footer={
              <a className="text-amber hover:text-amber-hi" href="#">
                Learn more →
              </a>
            }
            accent
          >
            <div className="grid h-full place-items-center text-xs text-ivory-mut">stage A</div>
          </ModeCard>
          <ModeCard
            eyebrow="Mode B"
            title="Screen & cursor"
            description="Just the work. Clean walk-throughs and demos."
            footer={
              <a className="text-amber hover:text-amber-hi" href="#">
                Learn more →
              </a>
            }
          >
            <div className="grid h-full place-items-center text-xs text-ivory-mut">stage B</div>
          </ModeCard>
          <ModeCard
            eyebrow="Mode C"
            title="Camera only"
            description="Talking-head async updates, round-framed and centered."
            footer={
              <a className="text-amber hover:text-amber-hi" href="#">
                Learn more →
              </a>
            }
          >
            <div className="grid h-full place-items-center text-xs text-ivory-mut">stage C</div>
          </ModeCard>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">StudioShell</h2>
        <StudioShell
          aria-label="Recording studio preview"
          header={
            <>
              <div className="flex items-center gap-3">
                <RecDot />
                <MetaChip tone="amber">REC · 00:00:12</MetaChip>
              </div>
              <div className="flex items-center gap-3">
                <MetaChip>1080p · 30fps</MetaChip>
                <MetaChip>~ 4.2 MB</MetaChip>
              </div>
            </>
          }
          footer={
            <>
              <span>cap 10:00</span>
              <span>mp4 · h.264 · aac</span>
            </>
          }
        >
          <div className="grid aspect-video w-full place-items-center text-ivory-mut">
            live preview slot
          </div>
        </StudioShell>
      </section>
    </main>
  );
}
