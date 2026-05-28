// packages/recorder/src/cursor-highlights.ts
// In-tab cursor click highlights (spec § 7.3). Web sandboxing means we can only
// observe clicks inside the record-me tab — the OS cursor in captured frames
// is rendered by the browser, but we cannot inject ripple overlays elsewhere.

export interface CursorHighlightsOptions {
  enabled?: boolean;
  durationMs?: number;
}

export interface Ripple {
  x: number;
  y: number;
  startedAt: number;
  progress: number;
}

export interface CursorHighlights {
  attach(): void;
  detach(): void;
  activeRipples(nowMs: number): Ripple[];
  draw(
    ctx: CanvasRenderingContext2D,
    frame: { width: number; height: number },
    nowMs: number,
  ): void;
}

const DEFAULT_DURATION_MS = 2_000;
const AMBER = '#E5A24A';
const MAX_RADIUS = 56;

export function createCursorHighlights(opts: CursorHighlightsOptions = {}): CursorHighlights {
  const enabled = opts.enabled ?? true;
  const durationMs = opts.durationMs ?? DEFAULT_DURATION_MS;
  const ripples: { x: number; y: number; startedAt: number }[] = [];

  const onClick = (e: MouseEvent) => {
    if (!enabled) return;
    ripples.push({ x: e.clientX, y: e.clientY, startedAt: performance.now() });
  };

  return {
    attach() {
      window.addEventListener('click', onClick, true);
    },
    detach() {
      window.removeEventListener('click', onClick, true);
    },
    activeRipples(nowMs) {
      const cutoff = nowMs - durationMs;
      const alive = ripples.filter((r) => r.startedAt > cutoff);
      return alive.map((r) => ({
        x: r.x,
        y: r.y,
        startedAt: r.startedAt,
        progress: Math.min(1, (nowMs - r.startedAt) / durationMs),
      }));
    },
    draw(ctx, _frame, nowMs) {
      const alive = this.activeRipples(nowMs);
      if (!alive.length) return;
      ctx.save();
      ctx.strokeStyle = AMBER;
      for (const r of alive) {
        const radius = MAX_RADIUS * r.progress;
        ctx.lineWidth = 3 * (1 - r.progress);
        ctx.globalAlpha = 1 - r.progress;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}
