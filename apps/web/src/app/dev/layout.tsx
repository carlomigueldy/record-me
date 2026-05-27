import { notFound } from 'next/navigation';

// Without `force-dynamic`, Next 15 prerenders /dev/* at build time and serves
// the cached HTML / RSC payload on every request — the 404 status code goes out
// alongside ~20 kB of leaked showcase content. Forcing dynamic rendering means
// each request invokes this layout fresh, the production guard fires, and the
// response body is the 404 chrome only (no primitives markup, no RSC payload).
// Build output for /dev/* should be `ƒ` (Dynamic), never `○` (Static).
export const dynamic = 'force-dynamic';

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
