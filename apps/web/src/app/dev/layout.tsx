import { notFound } from 'next/navigation';

export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return (
    <div className="min-h-dvh bg-bg text-ivory">
      <div className="mx-auto max-w-6xl px-6 py-12">{children}</div>
    </div>
  );
}
