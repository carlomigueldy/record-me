// packages/recorder/src/cursor-highlights.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createCursorHighlights } from './cursor-highlights';

describe('createCursorHighlights', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'performance'] });
    vi.setSystemTime(0);
    // jsdom defaults to 1024×768. Pin explicitly so ratio math is predictable.
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
  });
  afterEach(() => vi.useRealTimers());

  it('attach() begins listening for clicks; detach() stops', () => {
    const hl = createCursorHighlights();
    hl.attach();
    window.dispatchEvent(new MouseEvent('click', { clientX: 100, clientY: 200 }));
    expect(hl.activeRipples(0)).toHaveLength(1);

    hl.detach();
    window.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 60 }));
    expect(hl.activeRipples(0)).toHaveLength(1); // still the one from before
  });

  it('ripples carry the click coordinates as normalized ratios', () => {
    const hl = createCursorHighlights();
    hl.attach();
    // 1024×768 viewport, click at (512, 384) → center → ratios 0.5, 0.5.
    window.dispatchEvent(new MouseEvent('click', { clientX: 512, clientY: 384 }));
    const ripple = hl.activeRipples(0)[0]!;
    expect(ripple.xRatio).toBeCloseTo(0.5, 5);
    expect(ripple.yRatio).toBeCloseTo(0.5, 5);
    hl.detach();
  });

  it('draw() scales ratios to frame dimensions (viewport-independent)', () => {
    const hl = createCursorHighlights();
    hl.attach();
    // Click at viewport center (512, 384) in 1024×768.
    window.dispatchEvent(new MouseEvent('click', { clientX: 512, clientY: 384 }));

    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;

    // Draw on a 1920×1080 frame — center maps to (960, 540), NOT to (512, 384).
    hl.draw(ctx, { width: 1920, height: 1080 }, 100);
    const arcArgs = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(arcArgs[0]).toBeCloseTo(960, 0); // x scaled to frame
    expect(arcArgs[1]).toBeCloseTo(540, 0); // y scaled to frame
    hl.detach();
  });

  it('ripples age out after 2000ms', () => {
    const hl = createCursorHighlights();
    hl.attach();
    window.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10 }));
    expect(hl.activeRipples(0)).toHaveLength(1);
    expect(hl.activeRipples(1999)).toHaveLength(1);
    expect(hl.activeRipples(2000)).toHaveLength(0);
    hl.detach();
  });

  it('progress goes 0 → 1 across the lifetime', () => {
    const hl = createCursorHighlights();
    hl.attach();
    window.dispatchEvent(new MouseEvent('click', { clientX: 0, clientY: 0 }));
    expect(hl.activeRipples(0)[0]?.progress).toBe(0);
    expect(hl.activeRipples(1000)[0]?.progress).toBeCloseTo(0.5, 2);
    expect(hl.activeRipples(1999)[0]?.progress).toBeGreaterThan(0.99);
    hl.detach();
  });

  it('draw() uses ctx.arc + ctx.stroke to render each ripple', () => {
    const hl = createCursorHighlights();
    hl.attach();
    window.dispatchEvent(new MouseEvent('click', { clientX: 5, clientY: 5 }));

    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;

    hl.draw(ctx, { width: 1280, height: 720 }, 500);
    expect(ctx.arc).toHaveBeenCalledTimes(1);
    expect(ctx.stroke).toHaveBeenCalled();
    hl.detach();
  });

  it('disabled instance never records ripples', () => {
    const hl = createCursorHighlights({ enabled: false });
    hl.attach();
    window.dispatchEvent(new MouseEvent('click', { clientX: 1, clientY: 1 }));
    expect(hl.activeRipples(0)).toHaveLength(0);
    hl.detach();
  });
});
