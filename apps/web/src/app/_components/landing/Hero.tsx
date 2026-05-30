import Link from 'next/link';
import { TransitionLink } from '@/components/TransitionLink';
import { HeroReveal } from './HeroReveal';

/**
 * Hero — Server component (RSC). All copy rendered server-side for LCP.
 * The left column's children are passed to HeroReveal (client leaf) which
 * staggers them on mount (moment 1). The headline is NEVER JS-gated —
 * it exists in the server HTML at full opacity and only receives the entrance
 * animation on the client.
 */
export function Hero() {
  return (
    <section
      className="hero-section"
      style={{
        position: 'relative',
        padding: '96px 0 80px',
        display: 'grid',
        gridTemplateColumns: '1.15fr 0.85fr',
        gap: '56px',
        alignItems: 'end',
      }}
    >
      <style>{`
        @media (max-width: 860px) {
          .hero-section {
            grid-template-columns: 1fr !important;
            padding: 64px 0 56px !important;
          }
          .hero-section aside {
            display: none;
          }
        }
      `}</style>

      {/* Left column — children staggered by HeroReveal (client) */}
      <HeroReveal>
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--color-ivory-mut)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '30px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '32px',
              height: '1px',
              background: 'var(--color-ivory-low)',
            }}
          />
          A recording instrument · v0.1
        </div>

        {/* LCP headline — h1, server-rendered, never JS-gated */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: 'clamp(56px, 8.2vw, 112px)',
            lineHeight: 0.94,
            letterSpacing: '-0.018em',
            color: 'var(--color-ivory)',
            margin: 0,
          }}
        >
          Press{' '}
          <em
            style={{
              fontStyle: 'italic',
              color: 'var(--color-amber)',
            }}
          >
            record.
          </em>
          <br />
          Get a beautifully
          <br />
          <span style={{ color: 'var(--color-ivory-dim)' }}>cut clip.</span>
        </h1>

        {/* Deck */}
        <p
          style={{
            marginTop: '32px',
            maxWidth: '46ch',
            fontSize: '17px',
            lineHeight: 1.6,
            color: 'var(--color-ivory-dim)',
            fontWeight: 300,
          }}
        >
          A quietly editorial recording tool. Capture your screen, your camera, and your cursor —
          render a polished video in the browser. No accounts, no uploads, no compromise on craft.
        </p>

        {/* CTA row */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
            marginTop: '42px',
            flexWrap: 'wrap',
          }}
        >
          <TransitionLink
            href="/record"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 22px',
              borderRadius: '999px',
              background: 'var(--color-amber)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              fontSize: '14px',
              letterSpacing: '0.005em',
              textDecoration: 'none',
            }}
          >
            {/* REC dot */}
            <span
              aria-hidden="true"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                background: 'var(--color-bg)',
                flexShrink: 0,
              }}
            />
            Start recording
          </TransitionLink>

          <Link
            href="#modes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '13px 20px',
              borderRadius: '999px',
              background: 'transparent',
              color: 'var(--color-ivory)',
              border: '1px solid var(--color-line)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            See the three modes &#8595;
          </Link>
        </div>

        {/* Meta line — corrected codecs */}
        <div
          style={{
            marginTop: '36px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-ivory-mut)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
          }}
        >
          <span>Web · No install</span>
          <span style={{ color: 'var(--color-ivory-low)' }}>/</span>
          <span>Client-side</span>
          <span style={{ color: 'var(--color-ivory-low)' }}>/</span>
          <span>MP4 · H.264 (AAC)</span>
          <span style={{ color: 'var(--color-ivory-low)' }}>/</span>
          <span>Free · MIT</span>
        </div>
      </HeroReveal>

      {/* Right column — pull quote (not animated; static editorial flourish) */}
      <aside style={{ paddingBottom: '16px' }}>
        <blockquote
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: '24px',
            lineHeight: 1.35,
            color: 'var(--color-ivory-dim)',
            position: 'relative',
            paddingLeft: '22px',
            margin: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: '0.4em',
              bottom: '0.4em',
              width: '1px',
              background: 'var(--color-amber)',
            }}
          />
          &ldquo;Built like a magazine — composed with intent, every detail considered. The
          recording surface itself reads as a small piece of furniture.&rdquo;
          <cite
            style={{
              display: 'block',
              marginTop: '18px',
              fontFamily: 'var(--font-mono)',
              fontStyle: 'normal',
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-ivory-mut)',
            }}
          >
            — Field Notes, Issue 01
          </cite>
        </blockquote>
      </aside>
    </section>
  );
}
