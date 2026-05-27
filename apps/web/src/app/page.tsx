import { WordMark, MetaChip } from '@record-me/ui';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-24">
      <WordMark size="lg" />
      <p className="max-w-prose text-base leading-relaxed text-ivory-dim">
        Phase 2 scaffold. The editorial landing ships in Phase 5 per spec § 8.7. Until then, this
        page proves the design system is wired: Twilight tokens, Instrument Serif headlines, Geist
        body, Geist Mono for the technical bits.
      </p>
      <div className="flex flex-wrap gap-2">
        <MetaChip>twilight palette</MetaChip>
        <MetaChip>instrument serif</MetaChip>
        <MetaChip>geist · geist mono</MetaChip>
        <MetaChip tone="amber">phase 2 live</MetaChip>
      </div>
    </main>
  );
}
