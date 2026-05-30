'use client';
import { motion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { staggerParent, fadeUp } from '@/lib/motion/variants';

interface HeroRevealProps {
  children: ReactNode;
}

/**
 * HeroReveal — client wrapper that animates children with a stagger on mount
 * (signature moment 1). Uses MotionConfig reducedMotion="user" so the motion
 * library respects prefers-reduced-motion natively — no JS state needed, which
 * means reduced-motion users get final-state content at FIRST PAINT (no flash).
 *
 * The hero headline is server-rendered as children from Hero (RSC) so the LCP
 * element is never JS-gated: content is visible at SSR, only the entrance
 * animation is added on the client.
 */
export function HeroReveal({ children }: HeroRevealProps) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div initial="hidden" animate="show" variants={staggerParent}>
        {Array.isArray(children)
          ? children.map((child, i) => (
              <motion.div key={i} variants={fadeUp}>
                {child}
              </motion.div>
            ))
          : children}
      </motion.div>
    </MotionConfig>
  );
}
