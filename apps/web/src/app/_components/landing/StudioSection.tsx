import { StudioSurface } from './StudioSurface';

/**
 * StudioSection — RSC section with editorial field notes + live surface (moment 3).
 * id="studio" for anchor navigation.
 */
export function StudioSection() {
  return (
    <section id="studio">
      <style>{`
        @media (max-width: 860px) {
          .studio-section-head { grid-template-columns: 1fr !important; gap: 8px !important; }
          .studio-surface-wrap { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Section header */}
      <div
        className="studio-section-head"
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
          § 02
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
          The <em style={{ fontStyle: 'italic', color: 'var(--color-amber)' }}>studio,</em> while
          recording.
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
          Live preview
        </div>
      </div>

      {/* Surface + editorial notes */}
      <div
        className="studio-surface-wrap"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.3fr 0.9fr',
          gap: '28px',
          alignItems: 'stretch',
        }}
      >
        {/* Studio surface (client — boots on scroll) */}
        <StudioSurface />

        {/* Editorial field notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Note 1: Render specs */}
          <div
            style={{
              background: 'var(--color-bg-2)',
              border: '1px solid var(--color-line-soft)',
              borderRadius: '14px',
              padding: '22px 22px 24px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-ivory-mut)',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  background: 'var(--color-amber)',
                  borderRadius: '1px',
                }}
              />
              Render specs
            </div>
            <h4
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 400,
                fontSize: '22px',
                lineHeight: 1.2,
                letterSpacing: '-0.005em',
                color: 'var(--color-ivory)',
                margin: 0,
              }}
            >
              Container format
            </h4>
            <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
              {[
                { label: 'Container', value: 'MP4 (H.264 + AAC)' },
                { label: 'Resolution', value: '1080p' },
                { label: 'Frame rate', value: '30 / 60 fps' },
                { label: 'Export', value: 'Download to disk' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr',
                    gap: '16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--color-ivory-dim)',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--color-ivory-mut)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontSize: '10.5px',
                    }}
                  >
                    {label}
                  </span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Note 2: Click highlights */}
          <div
            style={{
              background: 'var(--color-bg-2)',
              border: '1px solid var(--color-line-soft)',
              borderRadius: '14px',
              padding: '22px 22px 24px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-ivory-mut)',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  background: 'var(--color-amber)',
                  borderRadius: '1px',
                }}
              />
              Cursor
            </div>
            <h4
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 400,
                fontSize: '22px',
                lineHeight: 1.2,
                letterSpacing: '-0.005em',
                color: 'var(--color-ivory)',
                margin: 0,
              }}
            >
              <em style={{ fontStyle: 'italic', color: 'var(--color-amber)' }}>Amber</em> clicks,
              always.
            </h4>
            <p
              style={{
                marginTop: '10px',
                color: 'var(--color-ivory-dim)',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              Every click pulse is rendered in the composited output — visible, considered,
              characteristic.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
