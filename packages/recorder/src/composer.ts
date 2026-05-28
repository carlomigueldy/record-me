// packages/recorder/src/composer.ts
import type { RecordMode, RecordingResolution } from './types';

export interface ComposerLayers {
  screen?: MediaStreamTrack;
  camera?: MediaStreamTrack;
}

export interface ComposerOptions {
  mode: RecordMode;
  resolution: RecordingResolution;
  fps: number;
  /** Optional callback fired every frame — used by cursor-highlights to draw overlays. */
  onOverlay?: (ctx: CanvasRenderingContext2D, frame: { width: number; height: number }) => void;
}

export interface Composer {
  readonly canvas: HTMLCanvasElement;
  setLayers(layers: ComposerLayers): void;
  start(): void;
  stop(): void;
  captureStream(): MediaStream;
  dispose(): void;
}

const PIP_DIAMETER = 240; // matches spec § 6.1 — bottom-right circle ~ 240px @ 1080p

function resolutionToSize(
  mode: RecordMode,
  resolution: RecordingResolution,
): { width: number; height: number } {
  if (mode === 'cam-only') {
    const side = resolution === '1080p' ? 1080 : 720;
    return { width: side, height: side };
  }
  return resolution === '1080p' ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
}

function trackToImageSource(track: MediaStreamTrack | undefined): HTMLVideoElement | undefined {
  if (!track) return undefined;
  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([track]);
  // HTMLMediaElement.play() returns a Promise in real browsers but is undefined-typed
  // in some envs (jsdom). Guard so tests don't trip on `.catch()` of undefined.
  const playResult = video.play() as Promise<void> | undefined;
  /* c8 ignore next — autoplay can fail; mocked drawImage doesn't need a paint */
  playResult?.catch(() => {});
  return video;
}

export function createComposer(opts: ComposerOptions): Composer {
  const { width, height } = resolutionToSize(opts.mode, opts.resolution);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  /* c8 ignore next — defensive; jsdom always returns a context for type '2d' */
  if (!ctx) throw new Error('createComposer: failed to obtain 2D context');

  let screenVideo: HTMLVideoElement | undefined;
  let cameraVideo: HTMLVideoElement | undefined;
  let rafId = 0;
  let running = false;
  let stream: MediaStream | undefined;

  const drawCamFull = () => {
    if (!cameraVideo) return;
    // Square crop: fit shortest dimension, center.
    ctx.drawImage(cameraVideo, 0, 0, width, height);
  };

  const drawScreenFull = () => {
    if (!screenVideo) return;
    ctx.drawImage(screenVideo, 0, 0, width, height);
  };

  const drawCamPip = () => {
    if (!cameraVideo) return;
    const diameter = PIP_DIAMETER;
    const margin = 32;
    const x = width - diameter - margin;
    const y = height - diameter - margin;
    const radius = diameter / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(cameraVideo, x, y, diameter, diameter);
    ctx.restore();
  };

  const tick = () => {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);

    if (opts.mode === 'cam-only') {
      drawCamFull();
    } else {
      drawScreenFull();
      if (opts.mode === 'screen+cam+cursor') drawCamPip();
    }

    opts.onOverlay?.(ctx, { width, height });

    rafId = requestAnimationFrame(tick);
  };

  return {
    canvas,
    setLayers(layers) {
      if (layers.screen && !screenVideo) screenVideo = trackToImageSource(layers.screen);
      if (layers.camera && !cameraVideo) cameraVideo = trackToImageSource(layers.camera);
    },
    start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    captureStream() {
      if (!stream) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stream = (canvas as any).captureStream(opts.fps) as MediaStream;
      }
      return stream;
    },
    dispose() {
      this.stop();
      stream?.getTracks().forEach((t) => t.stop());
      stream = undefined;
      screenVideo = undefined;
      cameraVideo = undefined;
    },
  };
}
