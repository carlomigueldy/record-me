// packages/recorder/src/cursor-highlights.ts
// In-tab cursor click highlights (spec § 7.3). Web sandboxing means we can only
// observe clicks inside the record-me tab — the OS cursor in captured frames
// is rendered by the browser, but we cannot inject ripple overlays elsewhere.

export interface CursorHighlightsOptions {
  enabled?: boolean;
  durationMs?: number;
}

export interface Ripple {
  /** Normalized horizontal position 0-1 (clientX / window.innerWidth at click time). */
  xRatio: number;
  /** Normalized vertical position 0-1 (clientY / window.innerHeight at click time). */
  yRatio: number;
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
  // Store normalized ratios at click time. The viewport may differ from the
  // capture-frame resolution (e.g. 1440×900 monitor, 1920×1080 frame), so
  // raw clientX/clientY would render the ripple at the wrong place on the
  // canvas. Normalization decouples the two coordinate systems.
  const ripples: { xRatio: number; yRatio: number; startedAt: number }[] = [];

  const onClick = (e: MouseEvent) => {
    if (!enabled) return;
    // `|| 1` guards against the (impossible-in-browser) zero-viewport case.
    /* c8 ignore next 2 */
    const innerWidth = window.innerWidth || 1;
    const innerHeight = window.innerHeight || 1;
    ripples.push({
      xRatio: e.clientX / innerWidth,
      yRatio: e.clientY / innerHeight,
      startedAt: performance.now(),
    });
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
        xRatio: r.xRatio,
        yRatio: r.yRatio,
        startedAt: r.startedAt,
        progress: Math.min(1, (nowMs - r.startedAt) / durationMs),
      }));
    },
    draw(ctx, frame, nowMs) {
      const alive = this.activeRipples(nowMs);
      if (!alive.length) return;
      ctx.save();
      ctx.strokeStyle = AMBER;
      for (const r of alive) {
        const radius = MAX_RADIUS * r.progress;
        ctx.lineWidth = 3 * (1 - r.progress);
        ctx.globalAlpha = 1 - r.progress;
        ctx.beginPath();
        ctx.arc(r.xRatio * frame.width, r.yRatio * frame.height, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}
