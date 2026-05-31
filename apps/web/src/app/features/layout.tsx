import type { ReactNode } from 'react';
import Link from 'next/link';
import { WordMark } from '@record-me/ui';

/**
 * features/layout.tsx — chrome wrapper for all /features/* pages.
 *
 * Mirrors the landing masthead idiom (WordMark center, edition tag left, nav
 * right) but with Features/Docs cross-links in the nav instead of anchor links.
 * RSC — no client JS. 1280px max-width shell.
 */
export default function FeaturesLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--ivory)',
      }}
    >
      {/* Masthead */}
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 40px',
        }}
      >
        <header
          className="features-nav"
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
              .features-nav {
                grid-template-columns: 1fr !important;
                gap: 10px;
                text-align: center;
              }
              .features-nav nav {
                justify-content: center !important;
              }
            }
          `}</style>

          {/* Left: edition tag */}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ivory-mut)',
            }}
          >
            Features
          </div>

          {/* Center: WordMark → links home */}
          <div style={{ textAlign: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <WordMark size="md" />
            </Link>
          </div>

          {/* Right: nav links */}
          <nav
            aria-label="Site navigation"
            style={{
              display: 'flex',
              gap: '26px',
              justifyContent: 'flex-end',
              fontSize: '13px',
            }}
          >
            <Link
              href="/record"
              style={{
                color: 'var(--ivory-dim)',
                textDecoration: 'none',
                letterSpacing: '0.01em',
              }}
            >
              Studio
            </Link>
            <Link
              href="/docs"
              style={{
                color: 'var(--ivory-dim)',
                textDecoration: 'none',
                letterSpacing: '0.01em',
              }}
            >
              Docs
            </Link>
          </nav>
        </header>
      </div>

      {/* Page content */}
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 40px',
        }}
      >
        {children}
      </main>

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
