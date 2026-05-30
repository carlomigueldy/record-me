import { ModeTriptych } from './ModeTriptych';

/**
 * ModesSection — RSC section with section-head + triptych (signature moment 2).
 * id="modes" for anchor navigation.
 */
export function ModesSection() {
  return (
    <section id="modes">
      <style>{`
        @media (max-width: 860px) {
          .modes-section-head { grid-template-columns: 1fr !important; gap: 8px !important; }
          .modes-triptych { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Section header */}
      <div
        className="modes-section-head"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'end',
          gap: '24px',
          padding: '64px 0 28px',
          borderTop: '1px solid var(--color-line-soft)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-ivory-mut)',
            letterSpacing: '0.18em',
          }}
        >
          § 01
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: '38px',
            lineHeight: 1,
            letterSpacing: '-0.01em',
            color: 'var(--color-ivory)',
            margin: 0,
          }}
        >
          Three <em style={{ fontStyle: 'italic', color: 'var(--color-amber)' }}>modes.</em> One
          quiet instrument.
        </h2>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-ivory-mut)',
          }}
        >
          Pick a stage
        </div>
      </div>

      {/* Triptych (client — lift on enter) */}
      <ModeTriptych />
    </section>
  );
}
