'use client';
import { useEffect, useRef, useState } from 'react';
import { StudioSurfaceArt } from '@/components/illustrations/StudioSurfaceArt';
import { usePrefersReducedMotion } from '@/lib/motion/useReducedMotion';

/** Format seconds as mm:ss:ff (frames at 30fps). */
function formatTimer(elapsed: number): string {
  const totalFrames = Math.floor(elapsed * 30);
  const frames = totalFrames % 30;
  const totalSecs = Math.floor(elapsed);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60) % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

/**
 * StudioSurface — client component. When the surface scrolls into view,
 * starts the REC pulse + ticks the timer via requestAnimationFrame.
 * Reduced-motion: fixed timer, no pulse (delegated to CSS in StudioSurfaceArt).
 */
export function StudioSurface() {
  const reduced = usePrefersReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Scroll-into-view detection (IntersectionObserver)
  useEffect(() => {
    if (reduced) return; // static for reduced-motion
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  // Timer tick via rAF
  useEffect(() => {
    if (!active || reduced) return;

    function tick(ts: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = ts;
      }
      setElapsed((ts - startTimeRef.current!) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, reduced]);

  return (
    <div ref={containerRef}>
      <StudioSurfaceArt timer={formatTimer(elapsed)} />
    </div>
  );
}
