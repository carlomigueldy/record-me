// packages/recorder/src/test/mocks/canvas.ts
// Stubs HTMLCanvasElement.prototype.getContext('2d') with a vi.fn-instrumented
// CanvasRenderingContext2D, and HTMLCanvasElement.prototype.captureStream with
// a MediaStream wrapping one video track. Tests assert on draw call sequence.

import { vi, type Mock } from 'vitest';
import { MockMediaStream, MockMediaStreamTrack } from './media-stream';

export interface MockCanvasContext {
  drawImage: Mock;
  clearRect: Mock;
  fillRect: Mock;
  beginPath: Mock;
  arc: Mock;
  fill: Mock;
  stroke: Mock;
  closePath: Mock;
  save: Mock;
  restore: Mock;
  clip: Mock;
  translate: Mock;
  scale: Mock;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  globalAlpha: number;
  globalCompositeOperation: GlobalCompositeOperation;
  canvas: HTMLCanvasElement;
}

const contexts = new WeakMap<HTMLCanvasElement, MockCanvasContext>();
const streams = new WeakMap<HTMLCanvasElement, MockMediaStream>();

function makeContext(canvas: HTMLCanvasElement): MockCanvasContext {
  return {
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
    canvas,
  };
}

export function installCanvasMocks(): void {
  // getContext('2d') — return the same mock per canvas instance
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    type: string,
  ): MockCanvasContext | null {
    if (type !== '2d') return null;
    let ctx = contexts.get(this);
    if (!ctx) {
      ctx = makeContext(this);
      contexts.set(this, ctx);
    }
    return ctx;
  } as HTMLCanvasElement['getContext'];

  // captureStream — return a stable MediaStream per canvas instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HTMLCanvasElement.prototype as any).captureStream = function (
    this: HTMLCanvasElement,
    _fps?: number,
  ): MockMediaStream {
    let stream = streams.get(this);
    if (!stream) {
      stream = new MockMediaStream([
        new MockMediaStreamTrack({ kind: 'video', label: 'canvas-capture' }),
      ]);
      streams.set(this, stream);
    }
    return stream;
  };
}

export function getMockContext(canvas: HTMLCanvasElement): MockCanvasContext | undefined {
  return contexts.get(canvas);
}

export function getCanvasStream(canvas: HTMLCanvasElement): MockMediaStream | undefined {
  return streams.get(canvas);
}
