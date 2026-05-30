'use client';
import { usePrefersReducedMotion } from '@/lib/motion/useReducedMotion';

const CLAIMS = [
  'Recorded in browser',
  'No accounts',
  'No uploads',
  'Free · MIT',
  'Built on Next.js',
  'Tailwind v4',
  'Vercel',
  'Privacy-first',
  'Client-side only',
  'Open source',
];

/**
 * FieldNotesTicker — Gentle horizontal marquee of standing claims (moment 4).
 * Pauses on hover. Reduced-motion: static row, no animation.
 * id="field" for anchor navigation.
 */
export function FieldNotesTicker() {
  const reduced = usePrefersReducedMotion();

  return (
    <section
      id="field"
      data-reduced={reduced}
      style={{
        marginTop: '60px',
        padding: '20px 0',
        borderTop: '1px solid var(--color-line-soft)',
        borderBottom: '1px solid var(--color-line-soft)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {!reduced && (
        <style>{`
          @keyframes ticker-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ticker-track {
            display: flex;
            gap: 48px;
            width: max-content;
            animation: ticker-scroll 28s linear infinite;
            will-change: transform;
          }
          .ticker-track:hover {
            animation-play-state: paused;
          }
        `}</style>
      )}

      {reduced ? (
        /* Static row for reduced-motion */
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '18px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-ivory-mut)',
          }}
        >
          {CLAIMS.map((claim) => (
            <span key={claim}>{claim}</span>
          ))}
        </div>
      ) : (
        /* Animated marquee — duplicate the list to create seamless loop */
        <div
          className="ticker-track"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-ivory-mut)',
          }}
        >
          {/* First copy */}
          {CLAIMS.map((claim) => (
            <span key={`a-${claim}`}>{claim}</span>
          ))}
          {/* Duplicate for seamless loop */}
          {CLAIMS.map((claim) => (
            <span key={`b-${claim}`} aria-hidden="true">
              {claim}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
