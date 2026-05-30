'use client';
import { motion } from 'motion/react';
import { ModeStageA } from '@/components/illustrations/ModeStageA';
import { ModeStageB } from '@/components/illustrations/ModeStageB';
import { ModeStageC } from '@/components/illustrations/ModeStageC';
import { usePrefersReducedMotion } from '@/lib/motion/useReducedMotion';
import { liftIn } from '@/lib/motion/variants';

interface ModeCardProps {
  badge: string;
  title: React.ReactNode;
  blurb: string;
  illustration: React.ReactNode;
  index: number;
  reduced: boolean;
}

function ModeCard({ badge, title, blurb, illustration, index, reduced }: ModeCardProps) {
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
    </div>
  );

  if (reduced) {
    return cardContent;
  }

  return (
    <motion.div
      variants={liftIn}
      custom={index}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {cardContent}
    </motion.div>
  );
}

/**
 * ModeTriptych — three mode cards with lift-on-enter animation (moment 2).
 * Reduced-motion: static layout.
 */
export function ModeTriptych() {
  const reduced = usePrefersReducedMotion();

  const modes = [
    {
      badge: 'Mode A',
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '22px',
        padding: '16px 0 8px',
      }}
    >
      {modes.map((mode, i) => (
        <ModeCard key={mode.badge} {...mode} index={i} reduced={reduced} />
      ))}
    </div>
  );
}
