import { TransitionLink } from '@/components/TransitionLink';

/**
 * LandingFooter — Editorial serif colophon (RSC).
 * Composed in Manila; Instrument Serif + Geist; links to /privacy + /changelog.
 */
export function LandingFooter() {
  return (
    <footer
      style={{
        marginTop: '56px',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '16px',
        alignItems: 'end',
        paddingBottom: '48px',
        borderTop: '1px solid var(--color-line-soft)',
        paddingTop: '32px',
      }}
    >
      {/* Left: colophon */}
      <div>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            color: 'var(--color-ivory-dim)',
            fontSize: '18px',
            lineHeight: 1.4,
            maxWidth: '38ch',
          }}
        >
          An experiment in editorial recording. Composed in Manila, set in <em>Instrument Serif</em>{' '}
          &amp; Geist, printed by Vercel.
        </p>

        {/* Mono credit line */}
        <p
          style={{
            marginTop: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10.5px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-ivory-mut)',
          }}
        >
          Free · MIT · Open Source
        </p>
      </div>

      {/* Right: nav links */}
      <nav
        aria-label="Legal"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'flex-end',
        }}
      >
        <TransitionLink
          href="/privacy"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-ivory-mut)',
            textDecoration: 'none',
          }}
        >
          Privacy
        </TransitionLink>
        <TransitionLink
          href="/changelog"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-ivory-mut)',
            textDecoration: 'none',
          }}
        >
          Changelog
        </TransitionLink>
      </nav>
    </footer>
  );
}
