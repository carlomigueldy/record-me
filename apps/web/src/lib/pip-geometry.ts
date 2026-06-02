import type { PipState } from '@record-me/recorder';

export type PipCorner = 'tl' | 'tr' | 'bl' | 'br';
export type PipSize = 'sm' | 'md' | 'lg';

export const PIP_CORNERS: PipCorner[] = ['tl', 'tr', 'bl', 'br'];
export const PIP_SIZES: PipSize[] = ['sm', 'md', 'lg'];

const SIZE_FRACTION: Record<PipSize, number> = { sm: 0.17, md: 0.22, lg: 0.3 };
const MARGIN_PX = 32;

/** Bubble diameter in canvas px, clamped to 40% of the shorter canvas side. */
export function pipDiameter(size: PipSize, canvasWidth: number, canvasHeight: number): number {
  const raw = Math.round(SIZE_FRACTION[size] * canvasHeight);
  const ceiling = Math.floor(0.4 * Math.min(canvasWidth, canvasHeight));
  return Math.min(raw, ceiling);
}

/** Resolve a {corner,size} preference into composer draw coordinates. */
export function resolvePip(
  corner: PipCorner,
  size: PipSize,
  canvasWidth: number,
  canvasHeight: number,
): PipState {
  const diameter = pipDiameter(size, canvasWidth, canvasHeight);
  const xInset = (diameter / 2 + MARGIN_PX) / canvasWidth;
  const yInset = (diameter / 2 + MARGIN_PX) / canvasHeight;
  const isLeft = corner === 'tl' || corner === 'bl';
  const isTop = corner === 'tl' || corner === 'tr';
  return {
    xNorm: isLeft ? xInset : 1 - xInset,
    yNorm: isTop ? yInset : 1 - yInset,
    diameter,
  };
}

/** Nearest corner (by squared distance of centers) to a normalized drop point. */
export function nearestCorner(
  xNorm: number,
  yNorm: number,
  size: PipSize,
  canvasWidth: number,
  canvasHeight: number,
): PipCorner {
  let best: PipCorner = 'br';
  let bestDist = Infinity;
  for (const corner of PIP_CORNERS) {
    const p = resolvePip(corner, size, canvasWidth, canvasHeight);
    const dx = p.xNorm - xNorm;
    const dy = p.yNorm - yNorm;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = corner;
    }
  }
  return best;
}

export interface ContentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The rendered content rectangle of an object-contain element of `aspect` (w/h) inside its box. */
export function computeContentRect(boxW: number, boxH: number, aspect: number): ContentRect {
  if (boxW === 0 || boxH === 0) return { left: 0, top: 0, width: 0, height: 0 };
  const boxAspect = boxW / boxH;
  let width: number;
  let height: number;
  if (boxAspect > aspect) {
    height = boxH;
    width = boxH * aspect;
  } else {
    width = boxW;
    height = boxW / aspect;
  }
  return { left: (boxW - width) / 2, top: (boxH - height) / 2, width, height };
}
