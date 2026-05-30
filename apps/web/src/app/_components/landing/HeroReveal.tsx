'use client';
import type { ReactNode } from 'react';

interface HeroRevealProps {
  children: ReactNode;
}

/**
 * HeroReveal — CSS-based stagger entrance for the hero left column (moment 1).
 *
 * SSR-safe by design: children are rendered at opacity:1 / translateY(0) in
 * static HTML — the LCP headline is NEVER JS-gated. The entrance animation
 * (fade + lift) is a pure CSS progressive enhancement applied via
 * `animation-delay` on each child wrapper.
 *
 * Gated with `@media (prefers-reduced-motion: no-preference)` so reduced-motion
 * users get the final state instantly, at first paint, with zero JS dependency.
 *
 * No motion library used here — motion adds no value over CSS for an above-the-
 * fold entrance that must be SSR-safe and works without JS.
 */
export function HeroReveal({ children }: HeroRevealProps) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <div className="hero-reveal">
      <style>{`
        @keyframes hero-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .hero-reveal-item {
            animation: hero-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
        }
      `}</style>
      {items.map((child, i) => (
        <div
          key={i}
          className="hero-reveal-item"
          style={{
            animationDelay: `${0.05 + i * 0.06}s`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
