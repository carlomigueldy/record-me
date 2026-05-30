'use client';

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
 * Pauses on hover. Reduced-motion: animation disabled via CSS @media at FIRST PAINT
 * — no JS dependency, no flash-of-motion for reduce users.
 * id="field" for anchor navigation.
 */
export function FieldNotesTicker() {
  return (
    <section
      id="field"
      style={{
        marginTop: '60px',
        padding: '20px 0',
        borderTop: '1px solid var(--color-line-soft)',
        borderBottom: '1px solid var(--color-line-soft)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
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
        /* Authoritative first-paint guard — no JS required */
        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
            flex-wrap: wrap;
            width: auto;
            justify-content: space-between;
          }
          /* Hide the duplicate items in static layout */
          .ticker-track [aria-hidden="true"] {
            display: none;
          }
        }
      `}</style>

      {/* Single animated track — reduced-motion freezes it via CSS @media */}
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
        {/* First copy — always visible */}
        {CLAIMS.map((claim) => (
          <span key={`a-${claim}`}>{claim}</span>
        ))}
        {/* Duplicate for seamless loop — hidden in reduced-motion via CSS */}
        {CLAIMS.map((claim) => (
          <span key={`b-${claim}`} aria-hidden="true">
            {claim}
          </span>
        ))}
      </div>
    </section>
  );
}
