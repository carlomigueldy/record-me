import { WordMark } from '@record-me/ui';

/**
 * LandingNav — Editorial masthead navigation (RSC).
 * Mono edition tag left, WordMark center, anchor links right.
 * No client JS.
 */
export function LandingNav() {
  return (
    <header
      className="landing-nav"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '18px 0 28px',
        borderBottom: '1px solid var(--color-line-soft)',
      }}
    >
      <style>{`
        @media (max-width: 860px) {
          .landing-nav {
            grid-template-columns: 1fr !important;
            gap: 10px;
            text-align: center;
          }
          .landing-nav nav {
            justify-content: center !important;
          }
        }
      `}</style>

      {/* Left: edition mono tag */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--color-ivory-mut)',
        }}
      >
        Edition 01 · Twilight
      </div>

      {/* Center: WordMark */}
      <div style={{ textAlign: 'center' }}>
        <WordMark size="md" />
      </div>

      {/* Right: anchor links */}
      <nav
        aria-label="Page sections"
        style={{
          display: 'flex',
          gap: '26px',
          justifyContent: 'flex-end',
          fontSize: '13px',
        }}
      >
        <a
          href="#modes"
          style={{
            color: 'var(--color-ivory-dim)',
            textDecoration: 'none',
            letterSpacing: '0.01em',
          }}
        >
          Modes
        </a>
        <a
          href="#studio"
          style={{
            color: 'var(--color-ivory-dim)',
            textDecoration: 'none',
            letterSpacing: '0.01em',
          }}
        >
          The Studio
        </a>
        <a
          href="#field"
          style={{
            color: 'var(--color-ivory-dim)',
            textDecoration: 'none',
            letterSpacing: '0.01em',
          }}
        >
          Field Notes
        </a>
      </nav>
    </header>
  );
}
