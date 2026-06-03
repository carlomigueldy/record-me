'use client';

import { useCallback, useRef, useState } from 'react';
import type { PipState } from '@record-me/recorder';
import {
  PIP_SIZES,
  nearestCorner,
  resolvePip,
  type PipCorner,
  type PipSize,
} from '../../../lib/pip-geometry';
import { useVideoContentRect } from '../../../hooks/use-video-content-rect';

export interface CameraBubbleControlProps {
  corner: PipCorner;
  size: PipSize;
  /** Composite aspect (width/height) — 16/9 for screen+cam+cursor. */
  aspect: number;
  /** Canvas dimensions for geometry, so diameter scales with resolution. */
  canvasWidth: number;
  canvasHeight: number;
  /** The preview surface this overlays (the <video> or the setup stage). */
  surfaceRef: React.RefObject<HTMLElement | null>;
  /** Whether this renders the static "CAM" placeholder (setup) or the live ring. */
  variant: 'setup' | 'live';
  /** Continuous push during drag — live composer feedback (no-op in setup). */
  onPreview?: (pip: PipState) => void;
  /** Commit on drag-end (corner) or size change. */
  onCommitCorner: (corner: PipCorner) => void;
  onCommitSize: (size: PipSize) => void;
}

const SIZE_LABEL: Record<PipSize, string> = { sm: 'Small', md: 'Medium', lg: 'Large' };

// Arrow-key corner moves: [horizontal flip on Left/Right, vertical flip on Up/Down].
function moveCorner(corner: PipCorner, key: string): PipCorner {
  const isLeft = corner === 'tl' || corner === 'bl';
  const isTop = corner === 'tl' || corner === 'tr';
  let nextLeft = isLeft;
  let nextTop = isTop;
  if (key === 'ArrowLeft') nextLeft = true;
  else if (key === 'ArrowRight') nextLeft = false;
  else if (key === 'ArrowUp') nextTop = true;
  else if (key === 'ArrowDown') nextTop = false;
  if (nextTop) return nextLeft ? 'tl' : 'tr';
  return nextLeft ? 'bl' : 'br';
}

export function CameraBubbleControl({
  corner,
  size,
  aspect,
  canvasWidth,
  canvasHeight,
  surfaceRef,
  variant,
  onPreview,
  onCommitCorner,
  onCommitSize,
}: CameraBubbleControlProps) {
  const rect = useVideoContentRect(surfaceRef, aspect);
  const [dragNorm, setDragNorm] = useState<{ x: number; y: number } | null>(null);

  // Resolved (committed) normalized position + canvas-px diameter.
  const resolved = resolvePip(corner, size, canvasWidth, canvasHeight);
  const xNorm = dragNorm ? dragNorm.x : resolved.xNorm;
  const yNorm = dragNorm ? dragNorm.y : resolved.yNorm;

  // Map canvas-normalized coords to element-px coords inside the letterboxed content rect.
  const diameterPx = (resolved.diameter / canvasHeight) * rect.height;
  const cx = rect.left + xNorm * rect.width;
  const cy = rect.top + yNorm * rect.height;
  const halfXNorm = resolved.diameter / 2 / canvasWidth;
  const halfYNorm = resolved.diameter / 2 / canvasHeight;

  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || rect.width === 0) return;
      const box = surfaceRef.current?.getBoundingClientRect();
      if (!box) return;
      const px = e.clientX - box.left - rect.left;
      const py = e.clientY - box.top - rect.top;
      const nx = Math.min(Math.max(px / rect.width, halfXNorm), 1 - halfXNorm);
      const ny = Math.min(Math.max(py / rect.height, halfYNorm), 1 - halfYNorm);
      setDragNorm({ x: nx, y: ny });
      onPreview?.({ xNorm: nx, yNorm: ny, diameter: resolved.diameter });
    },
    [rect, surfaceRef, halfXNorm, halfYNorm, onPreview, resolved.diameter],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const moved = dragNorm !== null;
      const final = dragNorm ?? { x: xNorm, y: yNorm };
      const next = nearestCorner(final.x, final.y, size, canvasWidth, canvasHeight);
      setDragNorm(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be released */
      }
      // Only commit when the user actually dragged, or the snap resolves to a different corner,
      // to avoid spurious analytics events and re-persist on plain clicks.
      if (moved || next !== corner) {
        onCommitCorner(next);
      }
    },
    [dragNorm, xNorm, yNorm, size, canvasWidth, canvasHeight, corner, onCommitCorner],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!e.key.startsWith('Arrow')) return;
      e.preventDefault();
      onCommitCorner(moveCorner(corner, e.key));
    },
    [corner, onCommitCorner],
  );

  // Flip the size control below the handle when it is near the top edge.
  const controlsBelow = cy - diameterPx / 2 < diameterPx; // little headroom

  // Position the bubble via transform so the spring transition on the .group wrapper fires
  // when the corner snaps. left/top on a positioned element does not animate with
  // transition-transform; translate3d on the same element does.
  const radius = diameterPx / 2;
  const translateX = cx - radius;
  const translateY = cy - radius;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className={[
          'group absolute',
          // Spring snap: position moves via transform so transition-transform fires.
          // motion-reduce: instant (no spring). During a live drag dragNorm is set so
          // we suppress the transition to avoid lag between pointer and bubble.
          dragNorm ? '' : 'transition-transform duration-[180ms] motion-reduce:transition-none',
        ]
          .join(' ')
          .trim()}
        style={{
          left: 0,
          top: 0,
          width: diameterPx,
          height: diameterPx,
          transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
          transitionTimingFunction: dragNorm ? undefined : 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <button
          type="button"
          aria-label="Camera bubble position"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className={[
            'pointer-events-auto absolute inset-0 flex items-center justify-center rounded-full',
            'cursor-grab touch-none select-none active:cursor-grabbing',
            variant === 'setup'
              ? 'bg-surface-2 text-ivory-mut ring-1 ring-line'
              : 'ring-2 ring-amber/70',
          ].join(' ')}
        >
          {variant === 'setup' ? (
            <span className="font-mono text-[10px] uppercase tracking-widest">CAM</span>
          ) : null}
        </button>

        <div
          role="radiogroup"
          aria-label="Camera bubble size"
          className={[
            'pointer-events-auto absolute left-1/2 flex -translate-x-1/2 gap-1 rounded-sm border border-line bg-surface px-1 py-0.5',
            // group-hover: mouse hover on the .group wrapper; group-focus-within: any
            // descendant is focused (handle or a radio) — both reveal the size control.
            'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none',
            controlsBelow ? 'top-full mt-2' : 'bottom-full mb-2',
          ].join(' ')}
        >
          {PIP_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={s === size}
              aria-label={SIZE_LABEL[s]}
              onClick={() => onCommitSize(s)}
              className={[
                'rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] uppercase',
                s === size ? 'bg-amber text-bg' : 'text-ivory-dim hover:text-ivory',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
