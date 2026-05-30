'use client';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/lib/motion/useReducedMotion';
import { staggerParent, fadeUp } from '@/lib/motion/variants';

interface HeroRevealProps {
  children: ReactNode;
}

/**
 * HeroReveal — client wrapper that animates children with a stagger on mount
 * (signature moment 1). When motion is reduced, renders children instantly
 * without any animation (full opacity — content always present regardless of JS).
 */
export function HeroReveal({ children }: HeroRevealProps) {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <motion.div initial="hidden" animate="show" variants={staggerParent}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={fadeUp}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}
