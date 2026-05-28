// packages/recorder/src/test/mocks/media-recorder.ts
// Controllable MediaRecorder for tests. Supports start/stop/pause/resume,
// fires dataavailable + stop events with test-driven payloads, and exposes
// `_emitChunk` / `_finishWithChunks` helpers so individual tests can shape
// chunk arrival timing precisely.

export type MockMediaRecorderState = 'inactive' | 'recording' | 'paused';

export interface MockBlobEventInit extends EventInit {
  data: Blob;
}

export class MockBlobEvent extends Event {
  public readonly data: Blob;
  constructor(type: string, init: MockBlobEventInit) {
    super(type, init);
    this.data = init.data;
  }
}

export interface MockMediaRecorderOptions {
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

export class MockMediaRecorder extends EventTarget {
  public static supportedMimeTypes: Set<string> = new Set([
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=h264,aac',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
  ]);

  public static isTypeSupported(mime: string): boolean {
    return MockMediaRecorder.supportedMimeTypes.has(mime);
  }

  public readonly stream: MediaStream;
  public readonly mimeType: string;
  public readonly videoBitsPerSecond: number | undefined;
  public readonly audioBitsPerSecond: number | undefined;
  public state: MockMediaRecorderState = 'inactive';

  // Test instrumentation
  public startCalls: number[] = [];
  public stopCalls = 0;
  public pauseCalls = 0;
  public resumeCalls = 0;

  // Single-instance hook for tests to drive a specific recorder
  public static instances: MockMediaRecorder[] = [];

  constructor(stream: MediaStream, opts: MockMediaRecorderOptions = {}) {
    super();
    this.stream = stream;
    this.mimeType = opts.mimeType ?? 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
    this.videoBitsPerSecond = opts.videoBitsPerSecond;
    this.audioBitsPerSecond = opts.audioBitsPerSecond;
    MockMediaRecorder.instances.push(this);
  }

  start(timeslice?: number): void {
    if (this.state !== 'inactive') {
      throw new DOMException('Recorder already started', 'InvalidStateError');
    }
    this.state = 'recording';
    this.startCalls.push(timeslice ?? 0);
    this.dispatchEvent(new Event('start'));
  }

  pause(): void {
    if (this.state !== 'recording') {
      throw new DOMException('Recorder not recording', 'InvalidStateError');
    }
    this.state = 'paused';
    this.pauseCalls += 1;
    this.dispatchEvent(new Event('pause'));
  }

  resume(): void {
    if (this.state !== 'paused') {
      throw new DOMException('Recorder not paused', 'InvalidStateError');
    }
    this.state = 'recording';
    this.resumeCalls += 1;
    this.dispatchEvent(new Event('resume'));
  }

  stop(): void {
    if (this.state === 'inactive') {
      throw new DOMException('Recorder inactive', 'InvalidStateError');
    }
    this.state = 'inactive';
    this.stopCalls += 1;
    this.dispatchEvent(new Event('stop'));
  }

  requestData(): void {
    // Real MediaRecorder forces a dataavailable. Tests drive this via _emitChunk.
  }

  // ── Test helpers ────────────────────────────────────────────────────────────

  _emitChunk(bytes: number, payload?: BlobPart[]): Blob {
    const blob = new Blob(payload ?? [new Uint8Array(bytes)], { type: this.mimeType });
    this.dispatchEvent(new MockBlobEvent('dataavailable', { data: blob }));
    return blob;
  }

  _emitError(name: string, message = 'simulated error'): void {
    const err = new DOMException(message, name);
    const event = new Event('error') as Event & { error?: DOMException };
    event.error = err;
    this.dispatchEvent(event);
  }

  static reset(): void {
    MockMediaRecorder.instances = [];
    MockMediaRecorder.supportedMimeTypes = new Set([
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=h264,aac',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
    ]);
  }
}

export function installMediaRecorderGlobal(): void {
  // @ts-expect-error jsdom does not provide MediaRecorder
  globalThis.MediaRecorder = MockMediaRecorder;
  // @ts-expect-error BlobEvent is referenced by some MediaRecorder typings
  globalThis.BlobEvent = MockBlobEvent;
}
