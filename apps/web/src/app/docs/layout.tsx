import type { ReactNode } from 'react';
import Link from 'next/link';
import { WordMark } from '@record-me/ui';

/**
 * docs/layout.tsx — chrome wrapper for all /docs/* pages.
 *
 * Provides the masthead (WordMark, edition tag, nav) and footer.
 * Content layout (sidebar + main) is handled per-page so each page can
 * pass the active slug to DocsSidebar — the layout receives no URL params.
 *
 * RSC — no client JS.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--ivory)',
      }}
    >
      {/* Masthead */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 40px' }}>
        <header
          className="docs-nav"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            padding: '18px 0 28px',
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          <style>{`
            @media (max-width: 860px) {
              .docs-nav {
                grid-template-columns: 1fr !important;
                gap: 10px;
                text-align: center;
              }
              .docs-nav nav { justify-content: center !important; }
            }
          `}</style>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ivory-mut)',
            }}
          >
            Docs
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <WordMark size="md" />
            </Link>
          </div>

          <nav
            aria-label="Site navigation"
            style={{ display: 'flex', gap: '26px', justifyContent: 'flex-end', fontSize: '13px' }}
          >
            <Link
              href="/record"
              style={{ color: 'var(--ivory-dim)', textDecoration: 'none', letterSpacing: '0.01em' }}
            >
              Studio
            </Link>
            <Link
              href="/features/screen-camera-cursor"
              style={{ color: 'var(--ivory-dim)', textDecoration: 'none', letterSpacing: '0.01em' }}
            >
              Features
            </Link>
          </nav>
        </header>
      </div>

      {/* Page content — no wrapper here; pages handle their own column layout */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 40px' }}>{children}</div>

      {/* Footer */}
      <footer
        style={{
          maxWidth: '1280px',
          margin: '80px auto 0',
          padding: '24px 40px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--ivory-mut)',
        }}
      >
        <Link href="/" style={{ color: 'var(--ivory-mut)', textDecoration: 'none' }}>
          ← record me
        </Link>
        <span>Browser-native · No upload · MIT</span>
      </footer>
    </div>
  );
}
