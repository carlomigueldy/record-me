import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy',
  description:
    'Recording bytes never leave your browser. No accounts, no upload, cookieless analytics.',
  path: '/privacy',
});

const PROMISES = [
  [
    'Recording bytes never leave your browser.',
    'Encoded chunks live in memory or IndexedDB and are offered for direct download. No upload endpoint exists.',
  ],
  [
    'No accounts, no auth cookies.',
    'record me sets zero cookies for authentication or session tracking.',
  ],
  [
    'Analytics are cookieless and anonymous.',
    'Vercel Analytics and Speed Insights aggregate page views and Core Web Vitals only — never your content.',
  ],
  [
    'Custom events carry no PII.',
    'Only mode, duration, byte size, mime type, and error kind are recorded.',
  ],
  [
    'Nothing lingers once you are done.',
    'Encoded chunks live in memory or IndexedDB only while you are working with a recording — discarding it, re-recording, leaving the page, or starting a new session wipes the store. Nothing persists.',
  ],
  [
    'Locked down by headers.',
    'A Content-Security-Policy blocks third-party scripts beyond Vercel itself.',
  ],
] as const;

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-24">
      <header className="flex flex-col gap-4">
        <div className="h-px w-16 bg-line" aria-hidden="true" />
        <h1 className="m-0 font-serif text-5xl text-ivory">Privacy</h1>
        <p className="max-w-prose text-lg leading-relaxed text-ivory-dim">
          record me is built so your recordings are yours alone. The whole pipeline runs in your
          browser — there is no server to send anything to.
        </p>
      </header>

      <ol className="m-0 flex list-none flex-col gap-6 p-0">
        {PROMISES.map(([title, body]) => (
          <li key={title} className="flex flex-col gap-1">
            <h2 className="m-0 text-base font-medium text-ivory">{title}</h2>
            <p className="m-0 max-w-prose text-sm leading-relaxed text-ivory-dim">{body}</p>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 className="m-0 text-base font-medium text-ivory">Reporting a vulnerability</h2>
        <p className="m-0 max-w-prose text-sm leading-relaxed text-ivory-dim">
          Open a private security advisory on the GitHub repository. Please do not file a public
          issue.
        </p>
      </section>
    </main>
  );
}
