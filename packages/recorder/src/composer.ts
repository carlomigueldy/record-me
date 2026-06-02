// packages/recorder/src/composer.ts
import type { RecordMode, RecordingResolution, PipState } from './types';

/** Largest centered square in the source, mapped to a square dest (object-fit: cover). */
export function coverSquare(vw: number, vh: number): { sx: number; sy: number; side: number } {
  const side = Math.min(vw, vh);
  return { sx: (vw - side) / 2, sy: (vh - side) / 2, side };
}

export interface ComposerLayers {
  screen?: MediaStreamTrack | undefined;
  camera?: MediaStreamTrack | undefined;
}

export interface ComposerOptions {
  mode: RecordMode;
  resolution: RecordingResolution;
  fps: number;
  /** Seeds the camera bubble so the first frame is correct (screen+cam+cursor only). */
  initialPip?: PipState | undefined;
  /** Optional callback fired every frame — used by cursor-highlights to draw overlays. */
  onOverlay?: (ctx: CanvasRenderingContext2D, frame: { width: number; height: number }) => void;
}

export interface Composer {
  readonly canvas: HTMLCanvasElement;
  setLayers(layers: ComposerLayers): void;
  /** Update the camera-bubble position/size (screen+cam+cursor only). */
  setPip(state: PipState): void;
  start(): void;
  stop(): void;
  captureStream(): MediaStream;
  dispose(): void;
}

// PIP_DIAMETER kept as fallback reference only — dynamic pip uses defaultPip() below

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
  let pip: PipState | undefined = opts.initialPip;

  const defaultPip = (): PipState => {
    const diameter = Math.round(0.22 * height);
    const xInset = (diameter / 2 + 32) / width;
    const yInset = (diameter / 2 + 32) / height;
    return { xNorm: 1 - xInset, yNorm: 1 - yInset, diameter };
  };

  const drawCamFull = () => {
    if (!cameraVideo) return;
    const vw = cameraVideo.videoWidth;
    const vh = cameraVideo.videoHeight;
    if (vw === 0 || vh === 0) return; // frame not yet decoded
    const { sx, sy, side } = coverSquare(vw, vh);
    ctx.drawImage(cameraVideo, sx, sy, side, side, 0, 0, width, height);
  };

  const drawScreenFull = () => {
    if (!screenVideo) return;
    ctx.drawImage(screenVideo, 0, 0, width, height);
  };

  const drawCamPip = () => {
    if (!cameraVideo) return;
    const vw = cameraVideo.videoWidth;
    const vh = cameraVideo.videoHeight;
    if (vw === 0 || vh === 0) return; // frame not yet decoded
    const p = pip ?? defaultPip();
    const radius = p.diameter / 2;
    const cx = p.xNorm * width;
    const cy = p.yNorm * height;
    const { sx, sy, side } = coverSquare(vw, vh);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      cameraVideo,
      sx,
      sy,
      side,
      side,
      cx - radius,
      cy - radius,
      p.diameter,
      p.diameter,
    );
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
    setPip(state) {
      pip = state;
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
