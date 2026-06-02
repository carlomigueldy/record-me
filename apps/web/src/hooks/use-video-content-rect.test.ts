import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useVideoContentRect } from './use-video-content-rect';

// jsdom lacks ResizeObserver; provide a minimal stub that fires once on observe.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe() {
        this.cb([], this as unknown as ResizeObserver);
      }
      disconnect() {}
      unobserve() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

it('computes the letterboxed content rect from the element box', () => {
  const { result } = renderHook(() => {
    const ref = useRef<HTMLDivElement | null>(null);
    // Attach a fake element with known client dimensions.
    if (!ref.current) {
      ref.current = { clientWidth: 1600, clientHeight: 1000 } as HTMLDivElement;
    }
    return useVideoContentRect(ref, 16 / 9);
  });
  expect(result.current.width).toBe(1600);
  expect(result.current.height).toBeCloseTo(1600 / (16 / 9), 3);
});
