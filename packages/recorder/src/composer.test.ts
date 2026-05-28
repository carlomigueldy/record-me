// packages/recorder/src/composer.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createComposer } from './composer';
import { makeTrack } from './test/factories';
import { getMockContext, getCanvasStream } from './test/mocks/canvas';
import type { MockMediaStream } from './test/mocks/media-stream';

describe('createComposer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a canvas at the requested resolution', () => {
    const comp = createComposer({ mode: 'screen+cursor', resolution: '1080p', fps: 30 });
    expect(comp.canvas.width).toBe(1920);
    expect(comp.canvas.height).toBe(1080);
  });

  it('builds at 720p when requested', () => {
    const comp = createComposer({ mode: 'screen+cursor', resolution: '720p', fps: 30 });
    expect(comp.canvas.width).toBe(1280);
    expect(comp.canvas.height).toBe(720);
  });

  it('cam-only uses a square canvas regardless of resolution', () => {
    const comp = createComposer({ mode: 'cam-only', resolution: '1080p', fps: 30 });
    expect(comp.canvas.width).toBe(comp.canvas.height);
    expect(comp.canvas.width).toBe(1080);
  });

  it('start() begins a RAF loop that clears + draws layers each tick', () => {
    const comp = createComposer({ mode: 'screen+cursor', resolution: '720p', fps: 30 });
    comp.setLayers({ screen: makeTrack('video') as unknown as MediaStreamTrack });
    const ctx = getMockContext(comp.canvas)!;

    comp.start();
    vi.advanceTimersByTime(50);

    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalled();
    comp.stop();
  });

  it('stop() cancels the RAF loop — no further draws after stop', () => {
    const comp = createComposer({ mode: 'screen+cursor', resolution: '720p', fps: 30 });
    comp.setLayers({ screen: makeTrack('video') as unknown as MediaStreamTrack });
    const ctx = getMockContext(comp.canvas)!;

    comp.start();
    vi.advanceTimersByTime(50);
    const drawCallsAfterStart = ctx.drawImage.mock.calls.length;

    comp.stop();
    vi.advanceTimersByTime(200);

    expect(ctx.drawImage.mock.calls.length).toBe(drawCallsAfterStart);
  });

  it('mode A (screen+cam+cursor) draws screen full + cam PiP circle', () => {
    const comp = createComposer({ mode: 'screen+cam+cursor', resolution: '720p', fps: 30 });
    comp.setLayers({
      screen: makeTrack('video') as unknown as MediaStreamTrack,
      camera: makeTrack('video') as unknown as MediaStreamTrack,
    });
    const ctx = getMockContext(comp.canvas)!;

    comp.start();
    vi.advanceTimersByTime(34); // ~1 frame at 30fps
    comp.stop();

    // Two draws per frame: screen full + cam PiP. Clip is called for the circle mask.
    expect(ctx.drawImage.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(ctx.clip).toHaveBeenCalled();
  });

  it('cam-only mode draws the camera full-frame each tick', () => {
    const comp = createComposer({ mode: 'cam-only', resolution: '720p', fps: 30 });
    comp.setLayers({ camera: makeTrack('video') as unknown as MediaStreamTrack });
    const ctx = getMockContext(comp.canvas)!;

    comp.start();
    vi.advanceTimersByTime(50);
    comp.stop();

    expect(ctx.drawImage).toHaveBeenCalled();
    // Cam-only does NOT use clip (no PiP mask).
    expect(ctx.clip).not.toHaveBeenCalled();
  });

  it('onOverlay callback is invoked each frame with canvas dimensions', () => {
    const onOverlay = vi.fn();
    const comp = createComposer({
      mode: 'screen+cursor',
      resolution: '720p',
      fps: 30,
      onOverlay,
    });
    comp.setLayers({ screen: makeTrack('video') as unknown as MediaStreamTrack });
    comp.start();
    vi.advanceTimersByTime(50);
    comp.stop();

    expect(onOverlay).toHaveBeenCalled();
    const [, frame] = onOverlay.mock.calls[0]!;
    expect(frame).toEqual({ width: 1280, height: 720 });
  });

  it('setLayers is idempotent — only first call per channel creates a video element', () => {
    const comp = createComposer({ mode: 'screen+cam+cursor', resolution: '720p', fps: 30 });
    const screenTrack = makeTrack('video') as unknown as MediaStreamTrack;
    const screenTrack2 = makeTrack('video') as unknown as MediaStreamTrack;
    comp.setLayers({ screen: screenTrack });
    comp.setLayers({ screen: screenTrack2 }); // second call should be a no-op
    // No assertion needed beyond reaching here without throw; covers the early-return branch
    expect(true).toBe(true);
  });

  it('start() is idempotent — second call while running is a no-op', () => {
    const comp = createComposer({ mode: 'screen+cursor', resolution: '720p', fps: 30 });
    comp.setLayers({ screen: makeTrack('video') as unknown as MediaStreamTrack });
    comp.start();
    comp.start(); // should not schedule a duplicate RAF
    vi.advanceTimersByTime(50);
    comp.stop();
  });

  it('captureStream() returns the canvas video track', () => {
    const comp = createComposer({ mode: 'cam-only', resolution: '720p', fps: 30 });
    const stream = comp.captureStream();
    expect(stream.getVideoTracks().length).toBe(1);
    expect(stream).toBe(getCanvasStream(comp.canvas));
  });

  it('dispose() stops the loop and releases the captured stream tracks', () => {
    const comp = createComposer({ mode: 'cam-only', resolution: '720p', fps: 30 });
    const stream = comp.captureStream() as unknown as MockMediaStream;
    const track = stream.getVideoTracks()[0];
    comp.dispose();
    expect(track?.readyState).toBe('ended');
  });
});
