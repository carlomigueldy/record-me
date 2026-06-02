'use client';

import { useEffect, useState, type RefObject } from 'react';
import { computeContentRect, type ContentRect } from '../lib/pip-geometry';

/**
 * The rendered content rectangle of an object-contain element of `aspect` (w/h)
 * inside its box. Recomputes on resize. Returns a zero rect until measured.
 */
export function useVideoContentRect(
  ref: RefObject<HTMLElement | null>,
  aspect: number,
): ContentRect {
  const [rect, setRect] = useState<ContentRect>({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setRect(computeContentRect(el.clientWidth, el.clientHeight, aspect));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, aspect]);

  return rect;
}
