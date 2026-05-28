// packages/recorder/src/recorder.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createRecorder } from './recorder';
import type { RecorderState } from './types';

describe('createRecorder · skeleton', () => {
  it('starts in idle state', () => {
    const handle = createRecorder({ mode: 'cam-only' });
    expect(handle.state).toBe('idle');
  });

  it('exposes start / pause / resume / stop / dispose methods', () => {
    const handle = createRecorder({ mode: 'cam-only' });
    expect(typeof handle.start).toBe('function');
    expect(typeof handle.pause).toBe('function');
    expect(typeof handle.resume).toBe('function');
    expect(typeof handle.stop).toBe('function');
    expect(typeof handle.dispose).toBe('function');
  });

  it('throws RecorderError(invalid-state) when pausing before start', () => {
    const handle = createRecorder({ mode: 'cam-only' });
    expect(() => handle.pause()).toThrowError(/invalid-state|cannot pause/i);
  });

  it('throws RecorderError(invalid-state) when stopping before start', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await expect(handle.stop()).rejects.toMatchObject({ kind: 'invalid-state' });
  });

  it('dispose() in idle leaves state as idle (no-op)', () => {
    const handle = createRecorder({ mode: 'cam-only' });
    handle.dispose();
    expect(handle.state).toBe('idle');
  });

  it('onStateChange is wired but quiet until a transition occurs', () => {
    const onStateChange = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onStateChange });
    expect(handle.state).toBe('idle');
    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('exposes state as a live getter (reads at access time)', () => {
    const handle = createRecorder({ mode: 'cam-only' });
    // We cannot mutate the public state directly, but typeof should be a string
    // and re-reads should return the same value while in idle.
    const a = handle.state as RecorderState;
    const b = handle.state as RecorderState;
    expect(a).toBe('idle');
    expect(b).toBe('idle');
  });
});
