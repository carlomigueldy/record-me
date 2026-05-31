'use client';
import { motion, MotionConfig } from 'motion/react';
import { ModeStageA } from '@/components/illustrations/ModeStageA';
import { ModeStageB } from '@/components/illustrations/ModeStageB';
import { ModeStageC } from '@/components/illustrations/ModeStageC';
import { liftIn } from '@/lib/motion/variants';
import { TransitionLink } from '@/components/TransitionLink';
import type { FeatureSlug } from '@/lib/content/features';

interface ModeCardProps {
  badge: string;
  title: React.ReactNode;
  blurb: string;
  illustration: React.ReactNode;
  /** Pinned URL slug → /features/<slug> (matches FEATURE_SLUG_TO_MODE). */
  featureSlug: FeatureSlug;
  index: number;
}

function ModeCard({ badge, title, blurb, illustration, featureSlug, index }: ModeCardProps) {
  const cardContent = (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '14px',
        padding: '20px 20px 22px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--color-ivory-mut)',
          display: 'inline-block',
          padding: '4px 8px',
          border: '1px solid var(--color-line)',
          borderRadius: '999px',
          marginBottom: '18px',
        }}
      >
        {badge}
      </span>
      <h3
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 400,
          fontSize: '28px',
          lineHeight: 1.1,
          letterSpacing: '-0.005em',
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: 'var(--color-ivory-dim)',
          fontSize: '13.5px',
          lineHeight: 1.55,
          marginTop: '10px',
          maxWidth: '32ch',
        }}
      >
        {blurb}
      </p>
      <div style={{ marginTop: '22px' }}>{illustration}</div>
      {/* "Learn more →" — TransitionLink for view-transition crossfade on
          supporting browsers; degrades to plain <a> elsewhere. Reduced-motion
          users get an instant swap (handled by MotionConfig reducedMotion="user"
          wrapping this component and by TransitionLink's plain-<a> fallback). */}
      <TransitionLink
        href={`/features/${featureSlug}`}
        style={{
          display: 'inline-block',
          marginTop: '18px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--color-amber)',
          textDecoration: 'none',
        }}
      >
        Learn more →
      </TransitionLink>
    </div>
  );

  return (
    <motion.div
      variants={liftIn}
      custom={index}
      initial="show"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {cardContent}
    </motion.div>
  );
}

/**
 * ModeTriptych — three mode cards with lift-on-enter animation (moment 2).
 * MotionConfig reducedMotion="user" ensures the motion library respects
 * prefers-reduced-motion natively — no JS state needed, first-paint safe.
 * Cards SSR at final-state (initial="show") so content is never hidden.
 */
export function ModeTriptych() {
  // featureSlug is PINNED — matches FEATURE_SLUG_TO_MODE in lib/content/features.ts.
  // Do NOT use the engine mode string (screen+cam+cursor) here — use the URL slug.
  const modes: Array<Omit<ModeCardProps, 'index'>> = [
    {
      badge: 'Mode A',
      featureSlug: 'screen-camera-cursor',
      title: (
        <>
          Screen, camera <em style={{ fontStyle: 'italic', color: 'var(--color-amber)' }}>&amp;</em>{' '}
          cursor.
        </>
      ),
      blurb:
        'The full recital. Screen capture with picture-in-picture camera and gentle amber pulses on every click.',
      illustration: <ModeStageA />,
    },
    {
      badge: 'Mode B',
      featureSlug: 'screen-cursor',
      title: (
        <>
          Screen <em style={{ fontStyle: 'italic', color: 'var(--color-amber)' }}>&amp;</em> cursor.
        </>
      ),
      blurb:
        'Just the work. Screen capture with cursor highlights — ideal for product walk-throughs and quiet how-tos.',
      illustration: <ModeStageB />,
    },
    {
      badge: 'Mode C',
      featureSlug: 'camera-only',
      title: (
        <>
          Camera <em style={{ fontStyle: 'italic', color: 'var(--color-amber)' }}>only.</em>
        </>
      ),
      blurb:
        'The talking head. Just you — round-framed, centered, with a subtle vignette. Perfect for a personal note.',
      illustration: <ModeStageC />,
    },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="modes-triptych"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '22px',
          padding: '16px 0 8px',
        }}
      >
        {modes.map((mode, i) => (
          <ModeCard key={mode.badge} {...mode} index={i} />
        ))}
      </div>
    </MotionConfig>
  );
}
