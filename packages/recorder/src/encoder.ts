// packages/recorder/src/encoder.ts
import { RecorderError } from './errors';

export interface EncoderOptions {
  stream: MediaStream;
  mimeType: string;
  videoBitsPerSecond: number;
  timesliceMs: number;
  onChunk?: (chunk: Blob) => void;
  onError?: (err: RecorderError) => void;
}

export interface Encoder {
  readonly mimeType: string;
  readonly bytes: number;
  start(): void;
  pause(): void;
  resume(): void;
  stop(): Promise<void>;
}

export function createEncoder(opts: EncoderOptions): Encoder {
  const recorder = new MediaRecorder(opts.stream, {
    mimeType: opts.mimeType,
    videoBitsPerSecond: opts.videoBitsPerSecond,
  });
  let bytes = 0;

  recorder.addEventListener('dataavailable', (event) => {
    const e = event as unknown as { data: Blob };
    if (!e.data || e.data.size === 0) return;
    bytes += e.data.size;
    opts.onChunk?.(e.data);
  });

  recorder.addEventListener('error', (event) => {
    const dom = (event as unknown as { error?: DOMException }).error;
    opts.onError?.(
      new RecorderError('recorder-failed', dom?.message ?? 'MediaRecorder error', { cause: dom }),
    );
  });

  return {
    mimeType: opts.mimeType,
    get bytes() {
      return bytes;
    },
    start() {
      recorder.start(opts.timesliceMs);
    },
    pause() {
      recorder.pause();
    },
    resume() {
      recorder.resume();
    },
    stop() {
      return new Promise<void>((resolve) => {
        const handleStop = () => {
          recorder.removeEventListener('stop', handleStop);
          resolve();
        };
        recorder.addEventListener('stop', handleStop);
        if (recorder.state === 'inactive') {
          resolve();
        } else {
          recorder.stop();
        }
      });
    },
  };
}
