// packages/recorder/src/cursor-highlights.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createCursorHighlights } from './cursor-highlights';

describe('createCursorHighlights', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'performance'] });
    vi.setSystemTime(0);
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

  it('ripples carry the click coordinates', () => {
    const hl = createCursorHighlights();
    hl.attach();
    window.dispatchEvent(new MouseEvent('click', { clientX: 320, clientY: 240 }));
    expect(hl.activeRipples(0)[0]).toMatchObject({ x: 320, y: 240 });
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
