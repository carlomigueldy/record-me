import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { changelog } from './changelog';

export const metadata: Metadata = buildMetadata({
  title: 'Changelog',
  description: 'What shipped in record me, version by version.',
  path: '/changelog',
});

export default function ChangelogPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-12 px-6 py-24">
      <header className="flex flex-col gap-4">
        <div className="h-px w-16 bg-line" aria-hidden="true" />
        <h1 className="m-0 font-serif text-5xl text-ivory">Changelog</h1>
        <p className="max-w-prose text-lg leading-relaxed text-ivory-dim">
          The story of record me, one release at a time.
        </p>
      </header>

      <ol className="m-0 flex list-none flex-col gap-12 p-0">
        {changelog.map((entry) => (
          <li key={entry.version} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-amber">
                v{entry.version}
              </span>
              <time className="font-mono text-xs text-ivory-mut" dateTime={entry.date}>
                {entry.date}
              </time>
            </div>
            <h2 className="m-0 font-serif text-2xl text-ivory">{entry.title}</h2>
            <p className="m-0 max-w-prose text-sm leading-relaxed text-ivory-dim">
              {entry.summary}
            </p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {entry.highlights.map((h) => (
                <li key={h} className="flex gap-2 text-sm leading-relaxed text-ivory-dim">
                  <span aria-hidden="true" className="text-amber">
                    ·
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </main>
  );
}
