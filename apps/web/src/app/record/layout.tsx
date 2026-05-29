import Link from 'next/link';
import { WordMark } from '@record-me/ui';

export default function RecordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ivory">
      <header className="flex items-center justify-between border-b border-line-soft px-6 py-4">
        <Link href="/" aria-label="record me — home">
          <WordMark />
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ivory-dim">
          stays in your browser
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">{children}</main>
    </div>
  );
}
