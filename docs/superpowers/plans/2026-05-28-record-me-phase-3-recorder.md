# Phase 3 · Recording Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. When spawned by `/spawn-record-me-team` the dispatch loop handles task routing and review gates automatically.

**Goal:** Ship the full `@record-me/recorder` engine per spec § 7 — `createRecorder()` state machine, per-mode track acquisition (A/B/C), 2D-canvas compositing with cam PiP / square crop, in-tab cursor highlight ripples, MediaRecorder integration with MP4-first codec negotiation, IndexedDB chunk spill for caps > 10 min, in-memory chunk store for short caps, `RecordingResult` assembly with suggested filename and `release()`, and ≥ 90 % unit-test coverage (lines / functions / branches / statements).

**Architecture:** Framework-agnostic, **no React imports**, lives entirely under `packages/recorder/src/`. Decomposed by responsibility: pure helpers (`types.ts`, `errors.ts`, `filename.ts`, `capabilities.ts`), track acquisition (`acquire.ts`), canvas compositing (`composer.ts` + `cursor-highlights.ts`), encoder wrapper (`encoder.ts`), pluggable chunk storage (`storage/{memory,indexeddb,index}.ts`), and the orchestrating state machine (`recorder.ts`). Tests run in jsdom with custom MediaRecorder / MediaStream / navigator.mediaDevices / Canvas mocks + `fake-indexeddb` for IDB.

**Tech Stack:** TypeScript 5.7, Vitest 2 + `@vitest/coverage-v8`, jsdom 25, `fake-indexeddb` 6 (IDB mock), no runtime deps beyond `@record-me/config`. State machine is plain TS (no xstate). MediaRecorder + `HTMLCanvasElement.captureStream` + `navigator.mediaDevices.getDisplayMedia` / `getUserMedia` are mocked globally in `src/test/setup.ts` so every test file gets a clean slate.

**Issue:** Closes phase-3 epic [#3](https://github.com/carlomigueldy/record-me/issues/3). Per-task issues are created by the staff agent during dispatch.

**Conventional commits:** Use `feat(recorder):`, `test(recorder):`, `chore(recorder):`, `refactor(recorder):`, `docs:` as appropriate. No LLM attribution footers — per root `CLAUDE.md` git conventions.

**Branching:** Single feature branch `phase-3-recorder` off `main`. Per-task commits, squash-merge at the end via `/pr`.

**Ownership:** Every code task touches `packages/recorder/**` and routes to `record-me-staff`. Documentation tasks route to `record-me-scribe`. No `apps/web/**` edits in this phase — the React `useRecorder()` hook lands in Phase 4.

---

## File Structure

### Created

| Path                                                 | Owner | Purpose                                                                                             |
| ---------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------- |
| `packages/recorder/src/types.ts`                     | staff | Public types: `RecordMode`, `RecorderState`, `RecorderOptions`, `RecordingResult`, `RecorderHandle` |
| `packages/recorder/src/errors.ts`                    | staff | `RecorderError` discriminated-union error class + helpers                                           |
| `packages/recorder/src/errors.test.ts`               | staff | Tests for error classes + DOMException → RecorderError mapping                                      |
| `packages/recorder/src/filename.ts`                  | staff | `suggestedFilename(date, sequence, mimeType)` pure helper                                           |
| `packages/recorder/src/filename.test.ts`             | staff | Tests for filename builder (date format, sequence padding, ext)                                     |
| `packages/recorder/src/capabilities.ts`              | staff | `supportedMimeType()` + `probeCapabilities()` (moved from index)                                    |
| `packages/recorder/src/capabilities.test.ts`         | staff | Tests for capability probing (moved from `index.test.ts`)                                           |
| `packages/recorder/src/acquire.ts`                   | staff | `acquireTracks(mode, options)` per spec § 6.1                                                       |
| `packages/recorder/src/acquire.test.ts`              | staff | Tests for per-mode track acquisition + DOMException mapping                                         |
| `packages/recorder/src/composer.ts`                  | staff | `createComposer(...)` — 2D canvas RAF loop, mode layouts, PiP, square crop                          |
| `packages/recorder/src/composer.test.ts`             | staff | Tests for composer lifecycle + each mode's draw calls                                               |
| `packages/recorder/src/cursor-highlights.ts`         | staff | In-tab click listener → amber ripple geometry                                                       |
| `packages/recorder/src/cursor-highlights.test.ts`    | staff | Tests for ripple lifecycle, opt-out, fade timing                                                    |
| `packages/recorder/src/encoder.ts`                   | staff | `createEncoder(...)` — MediaRecorder wrapper + chunk dispatch                                       |
| `packages/recorder/src/encoder.test.ts`              | staff | Tests for encoder state, dataavailable wiring, error propagation                                    |
| `packages/recorder/src/storage/index.ts`             | staff | `ChunkStore` interface + `createChunkStore(strategy, ...)` factory                                  |
| `packages/recorder/src/storage/memory.ts`            | staff | `MemoryChunkStore` — in-memory Blob[] backing                                                       |
| `packages/recorder/src/storage/memory.test.ts`       | staff | Tests for memory store: append, assemble, clear, byte count                                         |
| `packages/recorder/src/storage/indexeddb.ts`         | staff | `IndexedDbChunkStore` — one DB per session, ordered chunks                                          |
| `packages/recorder/src/storage/indexeddb.test.ts`    | staff | Tests for IDB store using `fake-indexeddb`                                                          |
| `packages/recorder/src/storage/factory.test.ts`      | staff | Tests for `createChunkStore` auto-strategy selection                                                |
| `packages/recorder/src/recorder.ts`                  | staff | `createRecorder(opts)` — state machine wiring all the pieces                                        |
| `packages/recorder/src/recorder.test.ts`             | staff | Integration tests for state transitions, callbacks, auto-stop, dispose                              |
| `packages/recorder/src/test/setup.ts`                | staff | Vitest setup: registers `fake-indexeddb` + canvas + media mocks                                     |
| `packages/recorder/src/test/mocks/media-recorder.ts` | staff | `MockMediaRecorder` class — controllable via test helpers                                           |
| `packages/recorder/src/test/mocks/media-stream.ts`   | staff | `MockMediaStream` + `MockMediaStreamTrack`                                                          |
| `packages/recorder/src/test/mocks/media-devices.ts`  | staff | `installMediaDevices()` — mounts `navigator.mediaDevices`                                           |
| `packages/recorder/src/test/mocks/canvas.ts`         | staff | `installCanvasMocks()` — stubs `getContext('2d')` + `captureStream`                                 |
| `packages/recorder/src/test/mocks/audio-context.ts`  | staff | `MockAudioContext` (used only by future audio-mix tasks)                                            |
| `packages/recorder/src/test/factories.ts`            | staff | Factory helpers: `makeTrack`, `makeStream`, `tick`, …                                               |

### Modified

| Path                                  | Change                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `packages/recorder/src/index.ts`      | Reduce to public re-exports only (capabilities + types + recorder + filename + errors)                 |
| `packages/recorder/src/index.test.ts` | **Delete** — its tests moved to `capabilities.test.ts` in Task C1                                      |
| `packages/recorder/vitest.config.ts`  | Wire `setupFiles`, exclude `src/index.ts` + `src/test/**` from coverage, bump branches threshold to 90 |
| `packages/recorder/package.json`      | Add devDep `fake-indexeddb`. No new runtime deps.                                                      |
| `docs/RECORDING.md`                   | Replace "Phase 1 scaffold" framing with the shipped engine inventory + state machine + storage rules   |
| `docs/PROGRESS.md`                    | Tick every Phase 3 milestone; mark Phase 3 complete with date + plan + PR refs                         |
| `docs/CODEBASE_MAP.md`                | Insert new `packages/recorder/src/**` entries under staff ownership                                    |
| `docs/ARCHITECTURE.md`                | Refresh the `@record-me/recorder` row in the package-responsibility table to reflect shipped surface   |

### Deleted

| Path                                  | Reason                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `packages/recorder/src/index.test.ts` | Capabilities tests move to `capabilities.test.ts` (Task C1). `index.ts` is pure re-exports; no behavior to test. |

---

## Section A · Test infrastructure

The recorder engine cannot be exercised without `MediaRecorder`, `MediaStream`, `navigator.mediaDevices`, `HTMLCanvasElement.captureStream`, and `indexedDB` — jsdom provides none of them. Section A installs the dependency we need (`fake-indexeddb`), writes a controllable mock for each browser API the recorder touches, and wires them through a Vitest setup file so every later test starts from a known-clean global state.

### Task A1: Install `fake-indexeddb` devDep

**Files:**

- Modify: `packages/recorder/package.json`

- [ ] **Step 1: Install**

```bash
pnpm --filter @record-me/recorder add -D fake-indexeddb
```

- [ ] **Step 2: Verify resolution**

`packages/recorder/package.json` `devDependencies` should now include `"fake-indexeddb": "^6.0.0"` (accept whatever pnpm resolves — the lockfile pins it).

- [ ] **Step 3: Commit**

```bash
git add packages/recorder/package.json pnpm-lock.yaml
git commit -m "chore(recorder): add fake-indexeddb devDep for chunk-spill tests"
```

---

### Task A2: `MockMediaStream` + `MockMediaStreamTrack`

**Files:**

- Create: `packages/recorder/src/test/mocks/media-stream.ts`

- [ ] **Step 1: Write the mock module**

```ts
// packages/recorder/src/test/mocks/media-stream.ts
// Minimal, controllable mocks for MediaStream and MediaStreamTrack.
// jsdom does not implement either; this is sufficient for our recorder tests.

export type MockTrackKind = 'video' | 'audio';

export interface MockMediaStreamTrackInit {
  kind: MockTrackKind;
  label?: string;
  enabled?: boolean;
}

export class MockMediaStreamTrack extends EventTarget {
  public readonly kind: MockTrackKind;
  public readonly label: string;
  public enabled: boolean;
  public readyState: 'live' | 'ended' = 'live';
  public readonly id: string;
  public stopCalls = 0;

  constructor(init: MockMediaStreamTrackInit) {
    super();
    this.kind = init.kind;
    this.label = init.label ?? `${init.kind}-track`;
    this.enabled = init.enabled ?? true;
    this.id = `track-${Math.random().toString(36).slice(2, 10)}`;
  }

  stop(): void {
    this.stopCalls += 1;
    if (this.readyState === 'ended') return;
    this.readyState = 'ended';
    this.dispatchEvent(new Event('ended'));
  }

  // Helper for tests to simulate a remote track ending (e.g. user clicks "Stop
  // sharing" in the browser screen-share UI).
  _simulateEnded(): void {
    this.stop();
  }
}

export class MockMediaStream {
  public readonly id: string;
  private tracks: MockMediaStreamTrack[];

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.id = `stream-${Math.random().toString(36).slice(2, 10)}`;
    this.tracks = [...tracks];
  }

  getTracks(): MockMediaStreamTrack[] {
    return [...this.tracks];
  }

  getVideoTracks(): MockMediaStreamTrack[] {
    return this.tracks.filter((t) => t.kind === 'video');
  }

  getAudioTracks(): MockMediaStreamTrack[] {
    return this.tracks.filter((t) => t.kind === 'audio');
  }

  addTrack(track: MockMediaStreamTrack): void {
    if (!this.tracks.includes(track)) this.tracks.push(track);
  }

  removeTrack(track: MockMediaStreamTrack): void {
    this.tracks = this.tracks.filter((t) => t !== track);
  }
}

export function installMediaStreamGlobals(): void {
  // @ts-expect-error jsdom does not provide MediaStream
  globalThis.MediaStream = MockMediaStream;
  // @ts-expect-error jsdom does not provide MediaStreamTrack
  globalThis.MediaStreamTrack = MockMediaStreamTrack;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @record-me/recorder typecheck`
Expected: green (no consumers yet).

- [ ] **Step 3: Commit**

```bash
git add packages/recorder/src/test/mocks/media-stream.ts
git commit -m "test(recorder): add MockMediaStream + MockMediaStreamTrack"
```

---

### Task A3: `MockMediaRecorder`

**Files:**

- Create: `packages/recorder/src/test/mocks/media-recorder.ts`

- [ ] **Step 1: Write the mock**

```ts
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
  public readonly videoBitsPerSecond?: number;
  public readonly audioBitsPerSecond?: number;
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @record-me/recorder typecheck`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add packages/recorder/src/test/mocks/media-recorder.ts
git commit -m "test(recorder): add MockMediaRecorder with controllable chunk + error emission"
```

---

### Task A4: `installMediaDevices()` — mock `navigator.mediaDevices`

**Files:**

- Create: `packages/recorder/src/test/mocks/media-devices.ts`

- [ ] **Step 1: Write the mock**

```ts
// packages/recorder/src/test/mocks/media-devices.ts
// Mocks navigator.mediaDevices.getDisplayMedia + getUserMedia. Each call routes
// through a per-test "responder" registry so individual tests can decide
// whether to resolve with a stream, reject with a DOMException, or hang.

import { MockMediaStream, MockMediaStreamTrack, type MockTrackKind } from './media-stream';

export type MediaResponder =
  | { kind: 'resolve'; tracks: MockTrackKind[] }
  | { kind: 'reject'; error: DOMException };

interface MediaDevicesState {
  displayResponder: MediaResponder;
  userResponder: MediaResponder;
  displayCalls: DisplayMediaStreamOptions[];
  userCalls: MediaStreamConstraints[];
}

const state: MediaDevicesState = {
  displayResponder: { kind: 'resolve', tracks: ['video'] },
  userResponder: { kind: 'resolve', tracks: ['video', 'audio'] },
  displayCalls: [],
  userCalls: [],
};

function buildStream(kinds: MockTrackKind[]): MockMediaStream {
  return new MockMediaStream(
    kinds.map((kind) => new MockMediaStreamTrack({ kind, label: `mock-${kind}` })),
  );
}

async function getDisplayMedia(
  constraints: DisplayMediaStreamOptions = {},
): Promise<MockMediaStream> {
  state.displayCalls.push(constraints);
  const r = state.displayResponder;
  if (r.kind === 'reject') throw r.error;
  return buildStream(r.tracks);
}

async function getUserMedia(constraints: MediaStreamConstraints = {}): Promise<MockMediaStream> {
  state.userCalls.push(constraints);
  const r = state.userResponder;
  if (r.kind === 'reject') throw r.error;
  return buildStream(r.tracks);
}

export function installMediaDevices(): void {
  const mediaDevices = {
    getDisplayMedia,
    getUserMedia,
    enumerateDevices: async () => [],
  };
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: mediaDevices,
  });
}

// ── Test helpers ──────────────────────────────────────────────────────────────

export function setDisplayMediaResponse(r: MediaResponder): void {
  state.displayResponder = r;
}

export function setUserMediaResponse(r: MediaResponder): void {
  state.userResponder = r;
}

export function getDisplayMediaCalls(): readonly DisplayMediaStreamOptions[] {
  return state.displayCalls;
}

export function getUserMediaCalls(): readonly MediaStreamConstraints[] {
  return state.userCalls;
}

export function resetMediaDevices(): void {
  state.displayResponder = { kind: 'resolve', tracks: ['video'] };
  state.userResponder = { kind: 'resolve', tracks: ['video', 'audio'] };
  state.displayCalls = [];
  state.userCalls = [];
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @record-me/recorder typecheck`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add packages/recorder/src/test/mocks/media-devices.ts
git commit -m "test(recorder): add installMediaDevices() with per-test responder registry"
```

---

### Task A5: Canvas + AudioContext mocks + setup file

**Files:**

- Create: `packages/recorder/src/test/mocks/canvas.ts`
- Create: `packages/recorder/src/test/mocks/audio-context.ts`
- Create: `packages/recorder/src/test/factories.ts`
- Create: `packages/recorder/src/test/setup.ts`
- Modify: `packages/recorder/vitest.config.ts`

- [ ] **Step 1: Canvas mock**

```ts
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
```

- [ ] **Step 2: AudioContext mock (lightweight — placeholder for v1.x audio mixing)**

```ts
// packages/recorder/src/test/mocks/audio-context.ts
// Minimal AudioContext mock. Phase 3 does not mix audio (mic-only flows pass
// the track straight to the encoder), but importing AudioContext should not
// crash in jsdom. Real audio mixing arrives in a later phase.

import { vi } from 'vitest';
import { MockMediaStream, MockMediaStreamTrack } from './media-stream';

export class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'running';
  destination = { stream: new MockMediaStream() };

  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
  createGain = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { value: 1 } }));
  createMediaStreamDestination = vi.fn(() => ({
    stream: new MockMediaStream([new MockMediaStreamTrack({ kind: 'audio', label: 'mixed' })]),
  }));
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  resume = vi.fn(async () => {
    this.state = 'running';
  });
}

export function installAudioContextGlobal(): void {
  // @ts-expect-error jsdom does not provide AudioContext
  globalThis.AudioContext = MockAudioContext;
}
```

- [ ] **Step 3: Factory helpers**

```ts
// packages/recorder/src/test/factories.ts
import { MockMediaStream, MockMediaStreamTrack, type MockTrackKind } from './mocks/media-stream';

export function makeTrack(kind: MockTrackKind, label?: string): MockMediaStreamTrack {
  return new MockMediaStreamTrack({ kind, label });
}

export function makeStream(kinds: MockTrackKind[]): MockMediaStream {
  return new MockMediaStream(kinds.map((k) => makeTrack(k)));
}

// Wait for the next microtask + a queued macro task — sufficient to flush
// awaited promises and one RAF tick in jsdom under vi.useFakeTimers.
export async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
```

- [ ] **Step 4: Setup file**

```ts
// packages/recorder/src/test/setup.ts
// Runs once per test file (Vitest setupFiles semantics). Each test should
// reset per-test state (e.g. resetMediaDevices(), MockMediaRecorder.reset())
// in its own beforeEach where it matters.

import 'fake-indexeddb/auto';
import { afterEach, beforeEach } from 'vitest';
import { installMediaStreamGlobals } from './mocks/media-stream';
import { installMediaRecorderGlobal, MockMediaRecorder } from './mocks/media-recorder';
import { installMediaDevices, resetMediaDevices } from './mocks/media-devices';
import { installCanvasMocks } from './mocks/canvas';
import { installAudioContextGlobal } from './mocks/audio-context';

installMediaStreamGlobals();
installMediaRecorderGlobal();
installMediaDevices();
installCanvasMocks();
installAudioContextGlobal();

beforeEach(() => {
  resetMediaDevices();
  MockMediaRecorder.reset();
});

afterEach(() => {
  resetMediaDevices();
  MockMediaRecorder.reset();
});
```

- [ ] **Step 5: Wire `setupFiles` and tighten coverage in `vitest.config.ts`**

```ts
// packages/recorder/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Spec § 12.3 — recorder ≥ 90% on lines/functions/branches/statements.
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/index.ts', 'src/test/**'],
    },
  },
});
```

- [ ] **Step 6: Sanity check — run the existing Phase 1 tests with the new setup**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/index.test.ts`
Expected: existing 9 capability tests still pass — the global `MediaRecorder` is now the mock, but the existing tests stub `globalThis.MediaRecorder` per-test anyway, so they continue to work.

If a test fails because `originalMediaRecorder` is the mock and the test expects the previous behavior, that is fine — Task C1 will move those tests into `capabilities.test.ts` and clean them up against the new mock.

- [ ] **Step 7: Commit**

```bash
git add packages/recorder/src/test packages/recorder/vitest.config.ts
git commit -m "test(recorder): install media + canvas + IDB mocks via vitest setupFiles"
```

---

## Section B · Types, errors, filename

### Task B1: Public types module

**Files:**

- Create: `packages/recorder/src/types.ts`

- [ ] **Step 1: Write the types module**

```ts
// packages/recorder/src/types.ts
// Public types for @record-me/recorder. Spec § 7.6 is the source of truth.

export type RecordMode = 'screen+cam+cursor' | 'screen+cursor' | 'cam-only';

export type RecorderState =
  | 'idle'
  | 'requesting-permissions'
  | 'recording'
  | 'paused'
  | 'finalizing'
  | 'ready'
  | 'error';

export type ChunkStorageStrategy = 'auto' | 'memory' | 'indexeddb';

export type RecordingResolution = '720p' | '1080p';

export interface RecorderOptions {
  mode: RecordMode;
  resolution?: RecordingResolution;
  fps?: number;
  videoBitsPerSecond?: number;
  maxDurationMs?: number;
  cursorHighlights?: boolean;
  storage?: ChunkStorageStrategy;
  onStateChange?: (state: RecorderState) => void;
  onDurationTick?: (ms: number) => void;
  onBytesTick?: (bytes: number) => void;
  onError?: (error: RecorderErrorLike) => void;
}

// Re-declared here as a structural type so consumers don't need to import the
// concrete RecorderError class to wire callbacks. The class in errors.ts is
// assignable to this shape.
export interface RecorderErrorLike {
  readonly name: string;
  readonly message: string;
  readonly kind: RecorderErrorKind;
  readonly cause?: unknown;
}

export type RecorderErrorKind =
  | 'permission-denied'
  | 'unsupported-browser'
  | 'track-failed'
  | 'recorder-failed'
  | 'storage-failed'
  | 'invalid-state';

export interface RecordingResult {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
  bytes: number;
  suggestedFilename: string;
  release: () => void;
}

export interface RecorderHandle {
  readonly state: RecorderState;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<RecordingResult>;
  dispose: () => void;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @record-me/recorder typecheck`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add packages/recorder/src/types.ts
git commit -m "feat(recorder): public types per spec § 7.6"
```

---

### Task B2: `RecorderError` class + DOMException mapping

**Files:**

- Create: `packages/recorder/src/errors.ts`
- Create: `packages/recorder/src/errors.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/recorder/src/errors.test.ts
import { describe, it, expect } from 'vitest';
import { RecorderError, mapDomException } from './errors';

describe('RecorderError', () => {
  it('carries kind, message, and optional cause', () => {
    const cause = new Error('boom');
    const err = new RecorderError('permission-denied', 'screen denied', { cause });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('RecorderError');
    expect(err.kind).toBe('permission-denied');
    expect(err.message).toBe('screen denied');
    expect(err.cause).toBe(cause);
  });

  it('serialises to a plain object via toJSON', () => {
    const err = new RecorderError('storage-failed', 'IDB quota');
    expect(err.toJSON()).toEqual({
      name: 'RecorderError',
      kind: 'storage-failed',
      message: 'IDB quota',
    });
  });
});

describe('mapDomException', () => {
  it('maps NotAllowedError to permission-denied', () => {
    const dom = new DOMException('denied', 'NotAllowedError');
    const err = mapDomException(dom, 'screen');
    expect(err.kind).toBe('permission-denied');
    expect(err.message).toContain('screen');
    expect(err.cause).toBe(dom);
  });

  it('maps NotFoundError to track-failed', () => {
    const dom = new DOMException('no cam', 'NotFoundError');
    const err = mapDomException(dom, 'camera');
    expect(err.kind).toBe('track-failed');
    expect(err.message).toContain('camera');
  });

  it('maps NotReadableError to track-failed', () => {
    const dom = new DOMException('busy', 'NotReadableError');
    expect(mapDomException(dom, 'mic').kind).toBe('track-failed');
  });

  it('maps unknown DOMException to track-failed', () => {
    const dom = new DOMException('weird', 'AbortError');
    expect(mapDomException(dom, 'screen').kind).toBe('track-failed');
  });

  it('wraps non-DOMException errors as track-failed', () => {
    const err = mapDomException(new Error('boom'), 'screen');
    expect(err.kind).toBe('track-failed');
    expect(err.cause).toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/errors.test.ts`
Expected: FAIL — "Failed to resolve import './errors'".

- [ ] **Step 3: Implement**

```ts
// packages/recorder/src/errors.ts
import type { RecorderErrorKind } from './types';

export type PermissionSubject = 'screen' | 'camera' | 'mic';

export class RecorderError extends Error {
  public readonly kind: RecorderErrorKind;
  public readonly cause?: unknown;

  constructor(kind: RecorderErrorKind, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'RecorderError';
    this.kind = kind;
    this.cause = options?.cause;
  }

  toJSON(): { name: string; kind: RecorderErrorKind; message: string } {
    return { name: this.name, kind: this.kind, message: this.message };
  }
}

export function mapDomException(input: unknown, subject: PermissionSubject): RecorderError {
  if (input instanceof DOMException) {
    if (input.name === 'NotAllowedError') {
      return new RecorderError('permission-denied', `${subject} permission denied`, {
        cause: input,
      });
    }
    return new RecorderError('track-failed', `${subject} track unavailable: ${input.message}`, {
      cause: input,
    });
  }
  const message = input instanceof Error ? input.message : String(input);
  return new RecorderError('track-failed', `${subject} acquisition failed: ${message}`, {
    cause: input,
  });
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/errors.test.ts`
Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/recorder/src/errors.ts packages/recorder/src/errors.test.ts
git commit -m "feat(recorder): add RecorderError + DOMException mapping"
```

---

### Task B3: `suggestedFilename` builder

**Files:**

- Create: `packages/recorder/src/filename.ts`
- Create: `packages/recorder/src/filename.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/recorder/src/filename.test.ts
import { describe, it, expect } from 'vitest';
import { suggestedFilename, extensionForMimeType } from './filename';

describe('extensionForMimeType', () => {
  it('returns mp4 for any video/mp4 codec string', () => {
    expect(extensionForMimeType('video/mp4;codecs=avc1.42E01E,mp4a.40.2')).toBe('mp4');
    expect(extensionForMimeType('video/mp4;codecs=h264,aac')).toBe('mp4');
    expect(extensionForMimeType('video/mp4')).toBe('mp4');
  });

  it('returns webm for any video/webm codec string', () => {
    expect(extensionForMimeType('video/webm;codecs=vp9,opus')).toBe('webm');
    expect(extensionForMimeType('video/webm')).toBe('webm');
  });

  it('falls back to webm for unknown types', () => {
    expect(extensionForMimeType('video/x-matroska')).toBe('webm');
    expect(extensionForMimeType('')).toBe('webm');
  });
});

describe('suggestedFilename', () => {
  it('formats as record-me-YYYY-MM-DD-NNN.<ext>', () => {
    const at = new Date('2026-05-28T12:34:56Z');
    expect(suggestedFilename(at, 1, 'video/mp4;codecs=avc1.42E01E,mp4a.40.2')).toBe(
      'record-me-2026-05-28-001.mp4',
    );
  });

  it('pads sequence to three digits', () => {
    const at = new Date('2026-01-02T00:00:00Z');
    expect(suggestedFilename(at, 42, 'video/webm;codecs=vp9,opus')).toBe(
      'record-me-2026-01-02-042.webm',
    );
    expect(suggestedFilename(at, 999, 'video/mp4')).toBe('record-me-2026-01-02-999.mp4');
  });

  it('uses UTC components so timezones do not shift the date', () => {
    const at = new Date('2026-12-31T23:59:00Z');
    expect(suggestedFilename(at, 7, 'video/mp4')).toBe('record-me-2026-12-31-007.mp4');
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/filename.test.ts`
Expected: FAIL on import.

- [ ] **Step 3: Implement**

```ts
// packages/recorder/src/filename.ts
export function extensionForMimeType(mime: string): 'mp4' | 'webm' {
  if (mime.toLowerCase().startsWith('video/mp4')) return 'mp4';
  return 'webm';
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

export function suggestedFilename(at: Date, sequence: number, mimeType: string): string {
  const yyyy = at.getUTCFullYear();
  const mm = pad(at.getUTCMonth() + 1, 2);
  const dd = pad(at.getUTCDate(), 2);
  const seq = pad(sequence, 3);
  const ext = extensionForMimeType(mimeType);
  return `record-me-${yyyy}-${mm}-${dd}-${seq}.${ext}`;
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/filename.test.ts`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/recorder/src/filename.ts packages/recorder/src/filename.test.ts
git commit -m "feat(recorder): add suggestedFilename + extensionForMimeType"
```

---

## Section C · Capabilities split

### Task C1: Move capabilities to their own module

**Files:**

- Create: `packages/recorder/src/capabilities.ts`
- Create: `packages/recorder/src/capabilities.test.ts`
- Delete: `packages/recorder/src/index.test.ts`
- Modify: `packages/recorder/src/index.ts`

- [ ] **Step 1: Write `capabilities.ts`**

```ts
// packages/recorder/src/capabilities.ts
// Spec § 7.4 — MP4-first codec negotiation.

export interface CapabilityReport {
  hasMediaRecorder: boolean;
  hasGetDisplayMedia: boolean;
  hasGetUserMedia: boolean;
  supportedMimeType: string | null;
  isSafari: boolean;
  isMobile: boolean;
}

export const MIME_PREFERENCE = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=h264,aac',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
] as const;

export function supportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const mime of MIME_PREFERENCE) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

export function probeCapabilities(): CapabilityReport {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const ua = nav?.userAgent ?? '';
  return {
    hasMediaRecorder: typeof MediaRecorder !== 'undefined',
    hasGetDisplayMedia: Boolean(nav?.mediaDevices?.getDisplayMedia),
    hasGetUserMedia: Boolean(nav?.mediaDevices?.getUserMedia),
    supportedMimeType: supportedMimeType(),
    isSafari: /^((?!chrome|android).)*safari/i.test(ua),
    isMobile: /Mobi|Android/i.test(ua),
  };
}
```

- [ ] **Step 2: Write `capabilities.test.ts`**

```ts
// packages/recorder/src/capabilities.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { probeCapabilities, supportedMimeType } from './capabilities';
import { MockMediaRecorder } from './test/mocks/media-recorder';

describe('supportedMimeType', () => {
  beforeEach(() => MockMediaRecorder.reset());

  it('returns null when MediaRecorder is unavailable', () => {
    const original = globalThis.MediaRecorder;
    // @ts-expect-error force undefined for this test
    delete globalThis.MediaRecorder;
    try {
      expect(supportedMimeType()).toBeNull();
    } finally {
      globalThis.MediaRecorder = original;
    }
  });

  it('prefers MP4 H.264 when supported', () => {
    MockMediaRecorder.supportedMimeTypes = new Set([
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/webm;codecs=vp9,opus',
    ]);
    expect(supportedMimeType()).toBe('video/mp4;codecs=avc1.42E01E,mp4a.40.2');
  });

  it('falls back to WebM VP9 when no MP4 codec string is supported', () => {
    MockMediaRecorder.supportedMimeTypes = new Set([
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
    ]);
    expect(supportedMimeType()).toBe('video/webm;codecs=vp9,opus');
  });

  it('returns null when no codec is supported', () => {
    MockMediaRecorder.supportedMimeTypes = new Set();
    expect(supportedMimeType()).toBeNull();
  });
});

describe('probeCapabilities', () => {
  const originalUserAgent = Object.getOwnPropertyDescriptor(globalThis.navigator, 'userAgent');

  function stubUserAgent(ua: string) {
    Object.defineProperty(globalThis.navigator, 'userAgent', { value: ua, configurable: true });
  }

  afterEach(() => {
    if (originalUserAgent) {
      Object.defineProperty(globalThis.navigator, 'userAgent', originalUserAgent);
    }
  });

  it('reports the current environment with boolean fields', () => {
    const report = probeCapabilities();
    expect(typeof report.hasMediaRecorder).toBe('boolean');
    expect(typeof report.hasGetDisplayMedia).toBe('boolean');
    expect(typeof report.hasGetUserMedia).toBe('boolean');
    expect(typeof report.isSafari).toBe('boolean');
    expect(typeof report.isMobile).toBe('boolean');
  });

  it('detects Safari from the user agent', () => {
    stubUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    );
    expect(probeCapabilities().isSafari).toBe(true);
  });

  it('does not flag Chrome as Safari', () => {
    stubUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    );
    expect(probeCapabilities().isSafari).toBe(false);
  });

  it('detects mobile from the user agent', () => {
    stubUserAgent(
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36',
    );
    expect(probeCapabilities().isMobile).toBe(true);
  });
});
```

- [ ] **Step 3: Delete the old `index.test.ts`**

Run: `rm /Users/carlomigueldy/personal/record-me/packages/recorder/src/index.test.ts`

- [ ] **Step 4: Rewrite `index.ts` as pure re-exports**

```ts
// packages/recorder/src/index.ts
// @record-me/recorder · public surface

export { supportedMimeType, probeCapabilities, MIME_PREFERENCE } from './capabilities';
export type { CapabilityReport } from './capabilities';
export type {
  RecordMode,
  RecorderState,
  RecorderOptions,
  RecordingResolution,
  ChunkStorageStrategy,
  RecordingResult,
  RecorderHandle,
  RecorderErrorLike,
  RecorderErrorKind,
} from './types';
export { RecorderError } from './errors';
export type { PermissionSubject } from './errors';
export { suggestedFilename, extensionForMimeType } from './filename';

export const RECORDER_PACKAGE_VERSION = '0.1.0';
```

- [ ] **Step 5: Run the moved tests**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/capabilities.test.ts`
Expected: 9 passing.

- [ ] **Step 6: Typecheck the package**

Run: `pnpm --filter @record-me/recorder typecheck`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add packages/recorder/src/capabilities.ts packages/recorder/src/capabilities.test.ts packages/recorder/src/index.ts
git rm packages/recorder/src/index.test.ts
git commit -m "refactor(recorder): split capabilities into capabilities.ts; index is pure re-exports"
```

---

## Section D · Track acquisition

### Task D1: `acquireTracks(mode, options)` per spec § 6.1

**Files:**

- Create: `packages/recorder/src/acquire.ts`
- Create: `packages/recorder/src/acquire.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/recorder/src/acquire.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { acquireTracks } from './acquire';
import {
  setDisplayMediaResponse,
  setUserMediaResponse,
  getDisplayMediaCalls,
  getUserMediaCalls,
  resetMediaDevices,
} from './test/mocks/media-devices';

describe('acquireTracks', () => {
  beforeEach(() => resetMediaDevices());

  it('mode A · screen+cam+cursor — calls both APIs with the right constraints', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    setUserMediaResponse({ kind: 'resolve', tracks: ['video', 'audio'] });

    const result = await acquireTracks({ mode: 'screen+cam+cursor' });

    expect(result.screen).toBeDefined();
    expect(result.camera).toBeDefined();
    expect(result.mic).toBeDefined();
    expect(getDisplayMediaCalls()).toHaveLength(1);
    expect(getDisplayMediaCalls()[0]).toMatchObject({
      video: expect.objectContaining({ cursor: 'always' }),
    });
    expect(getUserMediaCalls()).toHaveLength(1);
    expect(getUserMediaCalls()[0]).toMatchObject({ video: expect.anything(), audio: true });
  });

  it('mode B · screen+cursor — display media required, mic optional and on by default', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    setUserMediaResponse({ kind: 'resolve', tracks: ['audio'] });

    const result = await acquireTracks({ mode: 'screen+cursor' });

    expect(result.screen).toBeDefined();
    expect(result.camera).toBeUndefined();
    expect(result.mic).toBeDefined();
    expect(getUserMediaCalls()[0]).toEqual({ audio: true });
  });

  it('mode B · skips mic when includeMic=false', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });

    const result = await acquireTracks({ mode: 'screen+cursor', includeMic: false });

    expect(result.mic).toBeUndefined();
    expect(getUserMediaCalls()).toHaveLength(0);
  });

  it('mode C · cam-only — calls only getUserMedia with square aspect ratio', async () => {
    setUserMediaResponse({ kind: 'resolve', tracks: ['video', 'audio'] });

    const result = await acquireTracks({ mode: 'cam-only' });

    expect(result.screen).toBeUndefined();
    expect(result.camera).toBeDefined();
    expect(result.mic).toBeDefined();
    expect(getDisplayMediaCalls()).toHaveLength(0);
    expect(getUserMediaCalls()[0]).toMatchObject({
      video: expect.objectContaining({ aspectRatio: 1 }),
    });
  });

  it('throws RecorderError(permission-denied) when screen is denied (mode A)', async () => {
    setDisplayMediaResponse({
      kind: 'reject',
      error: new DOMException('denied', 'NotAllowedError'),
    });
    await expect(acquireTracks({ mode: 'screen+cam+cursor' })).rejects.toMatchObject({
      kind: 'permission-denied',
      message: expect.stringContaining('screen'),
    });
  });

  it('throws RecorderError(permission-denied) when camera is denied (mode A) and stops the screen track', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    setUserMediaResponse({
      kind: 'reject',
      error: new DOMException('denied', 'NotAllowedError'),
    });
    await expect(acquireTracks({ mode: 'screen+cam+cursor' })).rejects.toMatchObject({
      kind: 'permission-denied',
      message: expect.stringContaining('camera'),
    });
  });

  it('throws RecorderError(track-failed) when device is not readable', async () => {
    setUserMediaResponse({
      kind: 'reject',
      error: new DOMException('busy', 'NotReadableError'),
    });
    await expect(acquireTracks({ mode: 'cam-only' })).rejects.toMatchObject({
      kind: 'track-failed',
    });
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/acquire.test.ts`
Expected: FAIL on import.

- [ ] **Step 3: Implement**

```ts
// packages/recorder/src/acquire.ts
import { mapDomException } from './errors';
import type { RecordMode } from './types';

export interface AcquireOptions {
  mode: RecordMode;
  /** Only meaningful for mode 'screen+cursor'. Defaults to true. */
  includeMic?: boolean;
}

export interface AcquiredTracks {
  screen?: MediaStreamTrack;
  camera?: MediaStreamTrack;
  mic?: MediaStreamTrack;
  /** All acquired tracks — caller stops these on cleanup. */
  all: MediaStreamTrack[];
}

const DISPLAY_VIDEO: MediaTrackConstraints = {
  // Cursor capture is best-effort per browser; harmless if unsupported.
  cursor: 'always' as unknown as ConstrainDOMString,
};

const CAM_PIP_VIDEO: MediaTrackConstraints = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 30 },
};

const CAM_SQUARE_VIDEO: MediaTrackConstraints = {
  aspectRatio: 1,
  width: { ideal: 720 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
};

function stopAll(...tracks: (MediaStreamTrack | undefined)[]): void {
  for (const t of tracks) {
    try {
      t?.stop();
    } catch {
      // best-effort — we are already cleaning up
    }
  }
}

export async function acquireTracks(opts: AcquireOptions): Promise<AcquiredTracks> {
  const { mode, includeMic = true } = opts;

  if (mode === 'cam-only') {
    let camStream: MediaStream;
    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: CAM_SQUARE_VIDEO,
        audio: true,
      });
    } catch (err) {
      throw mapDomException(err, 'camera');
    }
    const camera = camStream.getVideoTracks()[0];
    const mic = camStream.getAudioTracks()[0];
    return { camera, mic, all: [camera, mic].filter(Boolean) as MediaStreamTrack[] };
  }

  let screenStream: MediaStream;
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: DISPLAY_VIDEO,
      audio: false,
    });
  } catch (err) {
    throw mapDomException(err, 'screen');
  }
  const screen = screenStream.getVideoTracks()[0];

  if (mode === 'screen+cursor') {
    if (!includeMic) {
      return { screen, all: [screen] };
    }
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      stopAll(screen);
      throw mapDomException(err, 'mic');
    }
    const mic = micStream.getAudioTracks()[0];
    return { screen, mic, all: [screen, mic].filter(Boolean) as MediaStreamTrack[] };
  }

  // mode === 'screen+cam+cursor'
  let camStream: MediaStream;
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: CAM_PIP_VIDEO,
      audio: true,
    });
  } catch (err) {
    stopAll(screen);
    throw mapDomException(err, 'camera');
  }
  const camera = camStream.getVideoTracks()[0];
  const mic = camStream.getAudioTracks()[0];
  return {
    screen,
    camera,
    mic,
    all: [screen, camera, mic].filter(Boolean) as MediaStreamTrack[],
  };
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/acquire.test.ts`
Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/recorder/src/acquire.ts packages/recorder/src/acquire.test.ts
git commit -m "feat(recorder): acquireTracks() per mode A/B/C with permission-denied mapping"
```

---

## Section E · Chunk storage

### Task E1: `ChunkStore` interface + `MemoryChunkStore`

**Files:**

- Create: `packages/recorder/src/storage/index.ts`
- Create: `packages/recorder/src/storage/memory.ts`
- Create: `packages/recorder/src/storage/memory.test.ts`

- [ ] **Step 1: Define the interface**

```ts
// packages/recorder/src/storage/index.ts
import type { ChunkStorageStrategy } from '../types';

export interface ChunkStore {
  readonly bytes: number;
  append(chunk: Blob): Promise<void>;
  assemble(mimeType: string): Promise<Blob>;
  clear(): Promise<void>;
}

export interface CreateChunkStoreOptions {
  strategy: ChunkStorageStrategy;
  maxDurationMs: number;
  sessionId?: string;
}

// Implemented in Task E3 once both memory + indexeddb stores exist.
export function createChunkStore(_opts: CreateChunkStoreOptions): ChunkStore {
  throw new Error('createChunkStore not yet implemented');
}
```

- [ ] **Step 2: Write the failing memory-store tests**

```ts
// packages/recorder/src/storage/memory.test.ts
import { describe, it, expect } from 'vitest';
import { MemoryChunkStore } from './memory';

describe('MemoryChunkStore', () => {
  it('starts at 0 bytes', () => {
    const store = new MemoryChunkStore();
    expect(store.bytes).toBe(0);
  });

  it('accumulates bytes as chunks are appended', async () => {
    const store = new MemoryChunkStore();
    await store.append(new Blob([new Uint8Array(100)], { type: 'video/mp4' }));
    await store.append(new Blob([new Uint8Array(50)], { type: 'video/mp4' }));
    expect(store.bytes).toBe(150);
  });

  it('assembles chunks in append order into one blob with the requested mime', async () => {
    const store = new MemoryChunkStore();
    await store.append(new Blob([new Uint8Array([1, 2])]));
    await store.append(new Blob([new Uint8Array([3, 4])]));
    const assembled = await store.assemble('video/mp4');
    expect(assembled.size).toBe(4);
    expect(assembled.type).toBe('video/mp4');
  });

  it('clear() resets bytes and drops chunks', async () => {
    const store = new MemoryChunkStore();
    await store.append(new Blob([new Uint8Array(10)]));
    await store.clear();
    expect(store.bytes).toBe(0);
    const empty = await store.assemble('video/mp4');
    expect(empty.size).toBe(0);
  });
});
```

- [ ] **Step 3: Run, confirm failure**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/storage/memory.test.ts`
Expected: FAIL on import.

- [ ] **Step 4: Implement `MemoryChunkStore`**

```ts
// packages/recorder/src/storage/memory.ts
import type { ChunkStore } from './index';

export class MemoryChunkStore implements ChunkStore {
  private chunks: Blob[] = [];
  private byteCount = 0;

  get bytes(): number {
    return this.byteCount;
  }

  async append(chunk: Blob): Promise<void> {
    this.chunks.push(chunk);
    this.byteCount += chunk.size;
  }

  async assemble(mimeType: string): Promise<Blob> {
    return new Blob(this.chunks, { type: mimeType });
  }

  async clear(): Promise<void> {
    this.chunks = [];
    this.byteCount = 0;
  }
}
```

- [ ] **Step 5: Run, confirm pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/storage/memory.test.ts`
Expected: 4 passing.

- [ ] **Step 6: Commit**

```bash
git add packages/recorder/src/storage/index.ts packages/recorder/src/storage/memory.ts packages/recorder/src/storage/memory.test.ts
git commit -m "feat(recorder): add ChunkStore interface + MemoryChunkStore"
```

---

### Task E2: `IndexedDbChunkStore`

**Files:**

- Create: `packages/recorder/src/storage/indexeddb.ts`
- Create: `packages/recorder/src/storage/indexeddb.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/recorder/src/storage/indexeddb.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDbChunkStore } from './indexeddb';

function bytes(n: number): Blob {
  return new Blob([new Uint8Array(n)]);
}

describe('IndexedDbChunkStore', () => {
  let store: IndexedDbChunkStore;

  beforeEach(() => {
    store = new IndexedDbChunkStore(`test-${Math.random().toString(36).slice(2, 8)}`);
  });

  it('starts at 0 bytes', () => {
    expect(store.bytes).toBe(0);
  });

  it('appends chunks and tracks bytes', async () => {
    await store.append(bytes(100));
    await store.append(bytes(50));
    expect(store.bytes).toBe(150);
  });

  it('assembles chunks in append order', async () => {
    await store.append(new Blob([new Uint8Array([1, 2])]));
    await store.append(new Blob([new Uint8Array([3, 4])]));
    await store.append(new Blob([new Uint8Array([5, 6])]));
    const assembled = await store.assemble('video/webm');
    expect(assembled.size).toBe(6);
    expect(assembled.type).toBe('video/webm');
  });

  it('clear() deletes the underlying database and resets bytes', async () => {
    await store.append(bytes(10));
    expect(store.bytes).toBe(10);
    await store.clear();
    expect(store.bytes).toBe(0);
    // Re-using the same instance after clear should accept new appends cleanly.
    await store.append(bytes(7));
    expect(store.bytes).toBe(7);
  });

  it('assemble on an empty store returns an empty blob', async () => {
    const assembled = await store.assemble('video/mp4');
    expect(assembled.size).toBe(0);
    expect(assembled.type).toBe('video/mp4');
  });

  it('multiple stores with different sessionIds do not collide', async () => {
    const a = new IndexedDbChunkStore('session-a');
    const b = new IndexedDbChunkStore('session-b');
    await a.append(bytes(100));
    await b.append(bytes(200));
    expect(a.bytes).toBe(100);
    expect(b.bytes).toBe(200);
    const aBlob = await a.assemble('video/mp4');
    const bBlob = await b.assemble('video/mp4');
    expect(aBlob.size).toBe(100);
    expect(bBlob.size).toBe(200);
    await a.clear();
    await b.clear();
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/storage/indexeddb.test.ts`
Expected: FAIL on import.

- [ ] **Step 3: Implement `IndexedDbChunkStore`**

```ts
// packages/recorder/src/storage/indexeddb.ts
import type { ChunkStore } from './index';
import { RecorderError } from '../errors';

const DB_PREFIX = 'record-me-chunks-';
const STORE_NAME = 'chunks';

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'seq' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        new RecorderError('storage-failed', `failed to open IDB ${name}`, { cause: req.error }),
      );
  });
}

function deleteDb(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(
        new RecorderError('storage-failed', `failed to delete IDB ${name}`, { cause: req.error }),
      );
    req.onblocked = () => resolve();
  });
}

export class IndexedDbChunkStore implements ChunkStore {
  private readonly dbName: string;
  private seq = 0;
  private byteCount = 0;

  constructor(sessionId: string) {
    this.dbName = `${DB_PREFIX}${sessionId}`;
  }

  get bytes(): number {
    return this.byteCount;
  }

  async append(chunk: Blob): Promise<void> {
    const db = await openDb(this.dbName);
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () =>
          reject(
            new RecorderError('storage-failed', 'append transaction failed', { cause: tx.error }),
          );
        tx.objectStore(STORE_NAME).add({ seq: this.seq++, blob: chunk });
      });
      this.byteCount += chunk.size;
    } finally {
      db.close();
    }
  }

  async assemble(mimeType: string): Promise<Blob> {
    const db = await openDb(this.dbName);
    try {
      const chunks: Blob[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const result: Blob[] = [];
        const cursorReq = tx.objectStore(STORE_NAME).openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            const value = cursor.value as { seq: number; blob: Blob };
            result.push(value.blob);
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve(result);
        tx.onerror = () =>
          reject(
            new RecorderError('storage-failed', 'assemble transaction failed', { cause: tx.error }),
          );
      });
      return new Blob(chunks, { type: mimeType });
    } finally {
      db.close();
    }
  }

  async clear(): Promise<void> {
    await deleteDb(this.dbName);
    this.seq = 0;
    this.byteCount = 0;
  }
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/storage/indexeddb.test.ts`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/recorder/src/storage/indexeddb.ts packages/recorder/src/storage/indexeddb.test.ts
git commit -m "feat(recorder): add IndexedDbChunkStore with per-session DB + ordered chunks"
```

---

### Task E3: `createChunkStore` factory + auto-strategy

**Files:**

- Modify: `packages/recorder/src/storage/index.ts`
- Create: `packages/recorder/src/storage/factory.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/recorder/src/storage/factory.test.ts
import { describe, it, expect } from 'vitest';
import { createChunkStore } from './index';
import { MemoryChunkStore } from './memory';
import { IndexedDbChunkStore } from './indexeddb';

describe('createChunkStore', () => {
  it('strategy="memory" always returns MemoryChunkStore', () => {
    const a = createChunkStore({ strategy: 'memory', maxDurationMs: 1_000 });
    const b = createChunkStore({ strategy: 'memory', maxDurationMs: 60 * 60_000 });
    expect(a).toBeInstanceOf(MemoryChunkStore);
    expect(b).toBeInstanceOf(MemoryChunkStore);
  });

  it('strategy="indexeddb" always returns IndexedDbChunkStore', () => {
    const store = createChunkStore({
      strategy: 'indexeddb',
      maxDurationMs: 1_000,
      sessionId: 'sess-a',
    });
    expect(store).toBeInstanceOf(IndexedDbChunkStore);
  });

  it('strategy="auto" picks memory for caps ≤ 10 minutes', () => {
    const store = createChunkStore({ strategy: 'auto', maxDurationMs: 10 * 60_000 });
    expect(store).toBeInstanceOf(MemoryChunkStore);
  });

  it('strategy="auto" picks IDB for caps > 10 minutes', () => {
    const store = createChunkStore({
      strategy: 'auto',
      maxDurationMs: 10 * 60_000 + 1,
      sessionId: 'sess-auto',
    });
    expect(store).toBeInstanceOf(IndexedDbChunkStore);
  });

  it('auto-generates a session id for IDB when not provided', () => {
    const store = createChunkStore({ strategy: 'indexeddb', maxDurationMs: 60_000 });
    expect(store).toBeInstanceOf(IndexedDbChunkStore);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/storage/factory.test.ts`
Expected: FAIL — `createChunkStore not yet implemented`.

- [ ] **Step 3: Implement the factory**

Replace the placeholder body of `createChunkStore` in `packages/recorder/src/storage/index.ts`:

```ts
// packages/recorder/src/storage/index.ts
import { MemoryChunkStore } from './memory';
import { IndexedDbChunkStore } from './indexeddb';
import type { ChunkStorageStrategy } from '../types';

export interface ChunkStore {
  readonly bytes: number;
  append(chunk: Blob): Promise<void>;
  assemble(mimeType: string): Promise<Blob>;
  clear(): Promise<void>;
}

export interface CreateChunkStoreOptions {
  strategy: ChunkStorageStrategy;
  maxDurationMs: number;
  sessionId?: string;
}

const AUTO_IDB_THRESHOLD_MS = 10 * 60_000; // > 10 min → IDB spill (spec § 7.5)

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createChunkStore(opts: CreateChunkStoreOptions): ChunkStore {
  if (opts.strategy === 'memory') return new MemoryChunkStore();
  if (opts.strategy === 'indexeddb') {
    return new IndexedDbChunkStore(opts.sessionId ?? newSessionId());
  }
  if (opts.maxDurationMs > AUTO_IDB_THRESHOLD_MS) {
    return new IndexedDbChunkStore(opts.sessionId ?? newSessionId());
  }
  return new MemoryChunkStore();
}

export { MemoryChunkStore } from './memory';
export { IndexedDbChunkStore } from './indexeddb';
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/storage/factory.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/recorder/src/storage/index.ts packages/recorder/src/storage/factory.test.ts
git commit -m "feat(recorder): createChunkStore factory — auto picks IDB above 10-min cap"
```

---

## Section F · Canvas composer + cursor highlights

### Task F1: Composer base — RAF loop + per-mode layouts

**Files:**

- Create: `packages/recorder/src/composer.ts`
- Create: `packages/recorder/src/composer.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/recorder/src/composer.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createComposer } from './composer';
import { makeTrack } from './test/factories';
import { getMockContext, getCanvasStream } from './test/mocks/canvas';
import { MockMediaStream } from './test/mocks/media-stream';

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
    expect(track.readyState).toBe('ended');
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/composer.test.ts`
Expected: FAIL on import.

- [ ] **Step 3: Implement the composer**

```ts
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
  // @ts-expect-error srcObject typing
  video.srcObject = new MediaStream([track]);
  void video.play().catch(() => {
    // Autoplay can fail in tests; the mocked drawImage doesn't actually need a paint.
  });
  return video;
}

export function createComposer(opts: ComposerOptions): Composer {
  const { width, height } = resolutionToSize(opts.mode, opts.resolution);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
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
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/composer.test.ts`
Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/recorder/src/composer.ts packages/recorder/src/composer.test.ts
git commit -m "feat(recorder): createComposer with RAF loop + per-mode draw (screen, PiP, square cam)"
```

---

### Task F2: Cursor highlight overlay

**Files:**

- Create: `packages/recorder/src/cursor-highlights.ts`
- Create: `packages/recorder/src/cursor-highlights.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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
    expect(hl.activeRipples(0)[0].progress).toBe(0);
    expect(hl.activeRipples(1000)[0].progress).toBeCloseTo(0.5, 2);
    expect(hl.activeRipples(1999)[0].progress).toBeGreaterThan(0.99);
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
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/cursor-highlights.test.ts`
Expected: FAIL on import.

- [ ] **Step 3: Implement**

```ts
// packages/recorder/src/cursor-highlights.ts
// In-tab cursor click highlights (spec § 7.3). Web sandboxing means we can only
// observe clicks inside the record-me tab — the OS cursor in captured frames
// is rendered by the browser, but we cannot inject ripple overlays elsewhere.

export interface CursorHighlightsOptions {
  enabled?: boolean;
  durationMs?: number;
}

export interface Ripple {
  x: number;
  y: number;
  startedAt: number;
  progress: number;
}

export interface CursorHighlights {
  attach(): void;
  detach(): void;
  activeRipples(nowMs: number): Ripple[];
  draw(
    ctx: CanvasRenderingContext2D,
    frame: { width: number; height: number },
    nowMs: number,
  ): void;
}

const DEFAULT_DURATION_MS = 2_000;
const AMBER = '#E5A24A';
const MAX_RADIUS = 56;

export function createCursorHighlights(opts: CursorHighlightsOptions = {}): CursorHighlights {
  const enabled = opts.enabled ?? true;
  const durationMs = opts.durationMs ?? DEFAULT_DURATION_MS;
  const ripples: { x: number; y: number; startedAt: number }[] = [];

  const onClick = (e: MouseEvent) => {
    if (!enabled) return;
    ripples.push({ x: e.clientX, y: e.clientY, startedAt: performance.now() });
  };

  return {
    attach() {
      window.addEventListener('click', onClick, true);
    },
    detach() {
      window.removeEventListener('click', onClick, true);
    },
    activeRipples(nowMs) {
      const cutoff = nowMs - durationMs;
      const alive = ripples.filter((r) => r.startedAt > cutoff);
      return alive.map((r) => ({
        x: r.x,
        y: r.y,
        startedAt: r.startedAt,
        progress: Math.min(1, (nowMs - r.startedAt) / durationMs),
      }));
    },
    draw(ctx, _frame, nowMs) {
      const alive = this.activeRipples(nowMs);
      if (!alive.length) return;
      ctx.save();
      ctx.strokeStyle = AMBER;
      for (const r of alive) {
        const radius = MAX_RADIUS * r.progress;
        ctx.lineWidth = 3 * (1 - r.progress);
        ctx.globalAlpha = 1 - r.progress;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/cursor-highlights.test.ts`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/recorder/src/cursor-highlights.ts packages/recorder/src/cursor-highlights.test.ts
git commit -m "feat(recorder): in-tab cursor highlight ripples (amber, 2s fade, opt-out)"
```

---

## Section G · Encoder (MediaRecorder wrapper)

### Task G1: `createEncoder(...)` — MediaRecorder lifecycle + chunk dispatch

**Files:**

- Create: `packages/recorder/src/encoder.ts`
- Create: `packages/recorder/src/encoder.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/recorder/src/encoder.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEncoder } from './encoder';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import { MockMediaStream } from './test/mocks/media-stream';

function makeStream(): MockMediaStream {
  return new MockMediaStream();
}

describe('createEncoder', () => {
  beforeEach(() => MockMediaRecorder.reset());

  it('constructs a MediaRecorder with the supplied options', () => {
    createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
    });
    expect(MockMediaRecorder.instances).toHaveLength(1);
    const rec = MockMediaRecorder.instances[0];
    expect(rec.mimeType).toBe('video/mp4;codecs=avc1.42E01E,mp4a.40.2');
    expect(rec.videoBitsPerSecond).toBe(4_000_000);
  });

  it('start() passes the timeslice to MediaRecorder.start()', () => {
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
    });
    enc.start();
    expect(MockMediaRecorder.instances[0].startCalls).toEqual([1_000]);
  });

  it('forwards dataavailable chunks to onChunk + bumps bytes', () => {
    const onChunk = vi.fn();
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
      onChunk,
    });
    enc.start();
    const rec = MockMediaRecorder.instances[0];
    rec._emitChunk(100);
    rec._emitChunk(50);
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk.mock.calls[0][0].size).toBe(100);
    expect(enc.bytes).toBe(150);
  });

  it('drops zero-byte chunks (MediaRecorder sometimes emits empty Blobs at stop)', () => {
    const onChunk = vi.fn();
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
      onChunk,
    });
    enc.start();
    MockMediaRecorder.instances[0]._emitChunk(0);
    expect(onChunk).not.toHaveBeenCalled();
    expect(enc.bytes).toBe(0);
  });

  it('pause / resume forward to MediaRecorder', () => {
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
    });
    enc.start();
    enc.pause();
    enc.resume();
    const rec = MockMediaRecorder.instances[0];
    expect(rec.pauseCalls).toBe(1);
    expect(rec.resumeCalls).toBe(1);
  });

  it('stop() resolves once the underlying recorder emits stop', async () => {
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
    });
    enc.start();
    const stopPromise = enc.stop();
    // The mock stop synchronously dispatches the 'stop' event.
    await expect(stopPromise).resolves.toBeUndefined();
    expect(MockMediaRecorder.instances[0].stopCalls).toBe(1);
  });

  it('forwards error events to onError as RecorderError(recorder-failed)', () => {
    const onError = vi.fn();
    const enc = createEncoder({
      stream: makeStream() as unknown as MediaStream,
      mimeType: 'video/mp4',
      videoBitsPerSecond: 4_000_000,
      timesliceMs: 1_000,
      onError,
    });
    enc.start();
    MockMediaRecorder.instances[0]._emitError('UnknownError', 'kaboom');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({ kind: 'recorder-failed' });
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/encoder.test.ts`
Expected: FAIL on import.

- [ ] **Step 3: Implement**

```ts
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
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/encoder.test.ts`
Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/recorder/src/encoder.ts packages/recorder/src/encoder.test.ts
git commit -m "feat(recorder): createEncoder wrapping MediaRecorder with chunk + error dispatch"
```

---

## Section H · `createRecorder` state machine

### Task H1: Recorder skeleton — state property + lifecycle hooks (no I/O)

**Files:**

- Create: `packages/recorder/src/recorder.ts`
- Create: `packages/recorder/src/recorder.test.ts`

- [ ] **Step 1: Write the failing tests (skeleton-only — state surface)**

```ts
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
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/recorder.test.ts`
Expected: FAIL on import.

- [ ] **Step 3: Implement the skeleton**

```ts
// packages/recorder/src/recorder.ts
import { RecorderError } from './errors';
import type { RecorderHandle, RecorderOptions, RecorderState, RecordingResult } from './types';

const DEFAULTS = {
  resolution: '1080p' as const,
  fps: 30,
  videoBitsPerSecond: 4_000_000,
  maxDurationMs: 600_000,
  cursorHighlights: true,
  storage: 'auto' as const,
};

export function createRecorder(opts: RecorderOptions): RecorderHandle {
  let state: RecorderState = 'idle';
  const setState = (next: RecorderState) => {
    if (next === state) return;
    state = next;
    opts.onStateChange?.(state);
  };

  // Suppress unused-defaults warnings until full lifecycle lands in Task H2.
  void DEFAULTS;

  const invalid = (verb: string) =>
    new RecorderError('invalid-state', `cannot ${verb} in state '${state}'`);

  return {
    get state() {
      return state;
    },
    async start() {
      throw invalid('start');
    },
    pause() {
      throw invalid('pause');
    },
    resume() {
      throw invalid('resume');
    },
    async stop(): Promise<RecordingResult> {
      throw invalid('stop');
    },
    dispose() {
      setState('idle');
    },
  };
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/recorder.test.ts`
Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/recorder/src/recorder.ts packages/recorder/src/recorder.test.ts
git commit -m "feat(recorder): createRecorder skeleton — state property + invalid-state guards"
```

---

### Task H2: Wire the full lifecycle — start / pause / resume / stop / dispose

**Files:**

- Modify: `packages/recorder/src/recorder.ts`
- Modify: `packages/recorder/src/recorder.test.ts`

- [ ] **Step 1: Extend the tests for the full lifecycle**

Append to `packages/recorder/src/recorder.test.ts`:

```ts
import { afterEach, beforeEach } from 'vitest';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import {
  setDisplayMediaResponse,
  setUserMediaResponse,
  resetMediaDevices,
} from './test/mocks/media-devices';
import { flushAsync } from './test/factories';

describe('createRecorder · full lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
        'Date',
      ],
    });
    vi.setSystemTime(new Date('2026-05-28T10:00:00Z'));
    resetMediaDevices();
    MockMediaRecorder.reset();
    setUserMediaResponse({ kind: 'resolve', tracks: ['video', 'audio'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('start() transitions idle → requesting-permissions → recording', async () => {
    const states: string[] = [];
    const handle = createRecorder({
      mode: 'cam-only',
      onStateChange: (s) => states.push(s),
    });

    const startPromise = handle.start();
    await flushAsync();
    await startPromise;
    expect(states).toEqual(['requesting-permissions', 'recording']);
    expect(handle.state).toBe('recording');
    handle.dispose();
  });

  it('start() transitions to error on permission denial', async () => {
    setUserMediaResponse({
      kind: 'reject',
      error: new DOMException('denied', 'NotAllowedError'),
    });
    const onError = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onError });

    await expect(handle.start()).rejects.toMatchObject({ kind: 'permission-denied' });
    expect(handle.state).toBe('error');
    expect(onError).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it('pause / resume toggles paused state and forwards to encoder', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();
    handle.pause();
    expect(handle.state).toBe('paused');
    handle.resume();
    expect(handle.state).toBe('recording');
    expect(MockMediaRecorder.instances[0].pauseCalls).toBe(1);
    expect(MockMediaRecorder.instances[0].resumeCalls).toBe(1);
    handle.dispose();
  });

  it('stop() finalizes and returns a RecordingResult with a Blob + suggestedFilename', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();

    // Drive two chunks through MediaRecorder before stop().
    const rec = MockMediaRecorder.instances[0];
    rec._emitChunk(1024);
    rec._emitChunk(2048);

    const result = await handle.stop();
    expect(handle.state).toBe('ready');
    expect(result.blob.size).toBe(3072);
    expect(result.bytes).toBe(3072);
    expect(result.mimeType).toMatch(/^video\//);
    expect(result.suggestedFilename).toMatch(/^record-me-2026-05-28-\d{3}\.(mp4|webm)$/);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.url.startsWith('blob:')).toBe(true);
    expect(typeof result.release).toBe('function');
    result.release();
    handle.dispose();
  });

  it('onDurationTick fires periodically while recording', async () => {
    const onDurationTick = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onDurationTick });
    await handle.start();
    vi.advanceTimersByTime(1_000);
    expect(onDurationTick).toHaveBeenCalled();
    expect(onDurationTick.mock.calls.at(-1)?.[0]).toBeGreaterThan(0);
    handle.dispose();
  });

  it('onBytesTick fires for each chunk', async () => {
    const onBytesTick = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onBytesTick });
    await handle.start();
    MockMediaRecorder.instances[0]._emitChunk(500);
    MockMediaRecorder.instances[0]._emitChunk(500);
    expect(onBytesTick).toHaveBeenCalledTimes(2);
    expect(onBytesTick.mock.calls.at(-1)?.[0]).toBe(1000);
    handle.dispose();
  });

  it('mode screen+cam+cursor acquires display + user media', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    setUserMediaResponse({ kind: 'resolve', tracks: ['video', 'audio'] });
    const handle = createRecorder({ mode: 'screen+cam+cursor' });
    await handle.start();
    expect(handle.state).toBe('recording');
    handle.dispose();
  });

  it('dispose() in recording stops tracks and transitions to idle', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await handle.start();
    handle.dispose();
    expect(handle.state).toBe('idle');
  });
});
```

- [ ] **Step 2: Run, confirm failure**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/recorder.test.ts`
Expected: the new tests FAIL — the skeleton throws `invalid-state`.

- [ ] **Step 3: Replace `recorder.ts` with the full implementation**

```ts
// packages/recorder/src/recorder.ts
import { acquireTracks, type AcquiredTracks } from './acquire';
import { supportedMimeType } from './capabilities';
import { createComposer, type Composer } from './composer';
import { createCursorHighlights, type CursorHighlights } from './cursor-highlights';
import { createEncoder, type Encoder } from './encoder';
import { RecorderError } from './errors';
import { extensionForMimeType, suggestedFilename } from './filename';
import { createChunkStore, type ChunkStore } from './storage';
import type { RecorderHandle, RecorderOptions, RecorderState, RecordingResult } from './types';

const DEFAULTS = {
  resolution: '1080p' as const,
  fps: 30,
  videoBitsPerSecond: 4_000_000,
  maxDurationMs: 600_000,
  cursorHighlights: true,
  storage: 'auto' as const,
};

const DURATION_TICK_MS = 250;
const TIMESLICE_MS = 1_000;

let sequenceCounter = 0;

interface InternalRecorderState {
  acquired?: AcquiredTracks;
  composer?: Composer;
  highlights?: CursorHighlights;
  encoder?: Encoder;
  store?: ChunkStore;
  audioTrack?: MediaStreamTrack;
  startedAt?: number;
  finishedAt?: number;
  pausedAtMs?: number;
  pausedTotalMs: number;
  durationInterval?: ReturnType<typeof setInterval>;
  autoStopTimeout?: ReturnType<typeof setTimeout>;
  mimeType?: string;
}

export function createRecorder(opts: RecorderOptions): RecorderHandle {
  const resolved = {
    mode: opts.mode,
    resolution: opts.resolution ?? DEFAULTS.resolution,
    fps: opts.fps ?? DEFAULTS.fps,
    videoBitsPerSecond: opts.videoBitsPerSecond ?? DEFAULTS.videoBitsPerSecond,
    maxDurationMs: opts.maxDurationMs ?? DEFAULTS.maxDurationMs,
    cursorHighlights: opts.cursorHighlights ?? DEFAULTS.cursorHighlights,
    storage: opts.storage ?? DEFAULTS.storage,
  };

  let state: RecorderState = 'idle';
  const internal: InternalRecorderState = { pausedTotalMs: 0 };

  const setState = (next: RecorderState) => {
    if (next === state) return;
    state = next;
    opts.onStateChange?.(state);
  };

  const toError = (err: RecorderError): RecorderError => {
    setState('error');
    opts.onError?.(err);
    return err;
  };

  const cleanupResources = () => {
    if (internal.durationInterval) {
      clearInterval(internal.durationInterval);
      internal.durationInterval = undefined;
    }
    if (internal.autoStopTimeout) {
      clearTimeout(internal.autoStopTimeout);
      internal.autoStopTimeout = undefined;
    }
    internal.highlights?.detach();
    internal.composer?.dispose();
    internal.acquired?.all.forEach((t) => {
      try {
        t.stop();
      } catch {
        /* best-effort */
      }
    });
    internal.acquired = undefined;
    internal.composer = undefined;
    internal.highlights = undefined;
    internal.encoder = undefined;
    internal.audioTrack = undefined;
  };

  const elapsedMs = (): number => {
    if (!internal.startedAt) return 0;
    const end = internal.finishedAt ?? Date.now();
    return Math.max(0, end - internal.startedAt - internal.pausedTotalMs);
  };

  const handle: RecorderHandle = {
    get state() {
      return state;
    },

    async start(): Promise<void> {
      if (state !== 'idle') {
        throw new RecorderError('invalid-state', `cannot start in state '${state}'`);
      }

      const mime = supportedMimeType();
      if (!mime) {
        throw toError(
          new RecorderError('unsupported-browser', 'no supported MediaRecorder MIME type'),
        );
      }
      internal.mimeType = mime;

      setState('requesting-permissions');

      try {
        internal.acquired = await acquireTracks({ mode: resolved.mode });
      } catch (err) {
        cleanupResources();
        throw toError(
          err instanceof RecorderError ? err : new RecorderError('track-failed', String(err)),
        );
      }

      internal.composer = createComposer({
        mode: resolved.mode,
        resolution: resolved.resolution,
        fps: resolved.fps,
        onOverlay: (ctx, frame) => internal.highlights?.draw(ctx, frame, performance.now()),
      });
      internal.composer.setLayers({
        screen: internal.acquired.screen,
        camera: internal.acquired.camera,
      });
      internal.composer.start();

      internal.highlights = createCursorHighlights({ enabled: resolved.cursorHighlights });
      internal.highlights.attach();

      const videoStream = internal.composer.captureStream();
      const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
      if (internal.acquired.mic) tracks.push(internal.acquired.mic);
      internal.audioTrack = internal.acquired.mic;
      const combined = new MediaStream(tracks);

      internal.store = createChunkStore({
        strategy: resolved.storage,
        maxDurationMs: resolved.maxDurationMs,
      });

      internal.encoder = createEncoder({
        stream: combined,
        mimeType: mime,
        videoBitsPerSecond: resolved.videoBitsPerSecond,
        timesliceMs: TIMESLICE_MS,
        onChunk: (chunk) => {
          void internal.store?.append(chunk);
          opts.onBytesTick?.(internal.store?.bytes ?? 0);
        },
        onError: (err) => toError(err),
      });
      internal.encoder.start();

      internal.startedAt = Date.now();
      internal.pausedTotalMs = 0;
      internal.durationInterval = setInterval(() => {
        if (state === 'recording') opts.onDurationTick?.(elapsedMs());
      }, DURATION_TICK_MS);

      internal.autoStopTimeout = setTimeout(() => {
        if (state === 'recording' || state === 'paused') {
          void handle.stop().catch(() => {
            /* error already routed through onError */
          });
        }
      }, resolved.maxDurationMs - 100);

      setState('recording');
    },

    pause(): void {
      if (state !== 'recording') {
        throw new RecorderError('invalid-state', `cannot pause in state '${state}'`);
      }
      internal.encoder?.pause();
      internal.composer?.stop();
      internal.pausedAtMs = Date.now();
      setState('paused');
    },

    resume(): void {
      if (state !== 'paused') {
        throw new RecorderError('invalid-state', `cannot resume in state '${state}'`);
      }
      if (internal.pausedAtMs) {
        internal.pausedTotalMs += Date.now() - internal.pausedAtMs;
        internal.pausedAtMs = undefined;
      }
      internal.encoder?.resume();
      internal.composer?.start();
      setState('recording');
    },

    async stop(): Promise<RecordingResult> {
      if (state !== 'recording' && state !== 'paused') {
        throw new RecorderError('invalid-state', `cannot stop in state '${state}'`);
      }
      setState('finalizing');
      internal.finishedAt = Date.now();
      if (internal.pausedAtMs) {
        internal.pausedTotalMs += internal.finishedAt - internal.pausedAtMs;
        internal.pausedAtMs = undefined;
      }

      await internal.encoder?.stop();
      internal.composer?.stop();
      internal.highlights?.detach();

      const mimeType = internal.mimeType ?? 'video/webm';
      const blob = (await internal.store?.assemble(mimeType)) ?? new Blob([], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const durationMs = elapsedMs();
      const sequence = ++sequenceCounter;
      const filename = suggestedFilename(
        new Date(internal.startedAt ?? Date.now()),
        sequence,
        mimeType,
      );
      const ext = extensionForMimeType(mimeType);
      void ext; // surfaced via suggestedFilename for now; kept explicit for future debugging

      const store = internal.store;
      const acquired = internal.acquired;
      internal.acquired?.all.forEach((t) => {
        try {
          t.stop();
        } catch {
          /* best-effort */
        }
      });

      setState('ready');

      return {
        blob,
        url,
        mimeType,
        durationMs,
        bytes: blob.size,
        suggestedFilename: filename,
        release: () => {
          URL.revokeObjectURL(url);
          void store?.clear();
          // keep acquired reference for tests inspecting cleanup state
          void acquired;
        },
      };
    },

    dispose(): void {
      cleanupResources();
      if (state !== 'idle') setState('idle');
    },
  };

  return handle;
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/recorder.test.ts`
Expected: all 15 (7 skeleton + 8 lifecycle) tests pass.

If the `screen+cam+cursor` test fails because `new MediaStream(tracks)` complains about a non-Track input, ensure the canvas mock's captureStream returns a `MockMediaStream` and that the constructor accepts an array of tracks. The current `MockMediaStream` constructor satisfies this.

- [ ] **Step 5: Commit**

```bash
git add packages/recorder/src/recorder.ts packages/recorder/src/recorder.test.ts
git commit -m "feat(recorder): full createRecorder lifecycle (acquire → compose → encode → assemble)"
```

---

### Task H3: Auto-stop at cap + onError surfaces from internals

**Files:**

- Modify: `packages/recorder/src/recorder.test.ts`

- [ ] **Step 1: Add the auto-stop + error-propagation tests**

Append:

```ts
describe('createRecorder · auto-stop and error surfaces', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
        'Date',
      ],
    });
    vi.setSystemTime(new Date('2026-05-28T11:00:00Z'));
    resetMediaDevices();
    MockMediaRecorder.reset();
    setUserMediaResponse({ kind: 'resolve', tracks: ['video', 'audio'] });
  });
  afterEach(() => vi.useRealTimers());

  it('auto-stops 100ms before maxDurationMs', async () => {
    const handle = createRecorder({ mode: 'cam-only', maxDurationMs: 5_000 });
    await handle.start();
    expect(handle.state).toBe('recording');

    vi.advanceTimersByTime(4_900);
    await flushAsync();
    await flushAsync();
    expect(['finalizing', 'ready']).toContain(handle.state);
  });

  it('onError fires when MediaRecorder emits error mid-recording', async () => {
    const onError = vi.fn();
    const handle = createRecorder({ mode: 'cam-only', onError });
    await handle.start();
    MockMediaRecorder.instances[0]._emitError('UnknownError', 'kaboom');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({ kind: 'recorder-failed' });
    expect(handle.state).toBe('error');
    handle.dispose();
  });

  it('storage strategy "indexeddb" uses IndexedDbChunkStore for assembly', async () => {
    const handle = createRecorder({
      mode: 'cam-only',
      storage: 'indexeddb',
      maxDurationMs: 60_000,
    });
    await handle.start();
    MockMediaRecorder.instances[0]._emitChunk(256);
    MockMediaRecorder.instances[0]._emitChunk(256);
    const result = await handle.stop();
    expect(result.blob.size).toBe(512);
    result.release();
    handle.dispose();
  });
});
```

- [ ] **Step 2: Run, confirm pass**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/recorder.test.ts`
Expected: all tests pass — the recorder already wires `autoStopTimeout` and routes encoder errors through `onError` in H2.

- [ ] **Step 3: Commit**

```bash
git add packages/recorder/src/recorder.test.ts
git commit -m "test(recorder): cover auto-stop at cap + recorder-failed error surface"
```

---

## Section I · Coverage, public surface, docs, PR

### Task I1: Run the full coverage gate and close any gaps

**Files:** (potentially) various `*.test.ts` files if coverage falls under 90% somewhere.

- [ ] **Step 1: Run with coverage**

Run: `pnpm --filter @record-me/recorder test`
Expected: report shows ≥ 90 % on lines, functions, branches, and statements. If any file is under threshold, the run fails.

- [ ] **Step 2: Address any reported gaps**

Common gaps and where to patch:

- `errors.ts` branches: ensure tests cover both `DOMException` and non-Error `input`.
- `recorder.ts` branches: ensure tests cover (a) `pause()` then `stop()` path so `pausedAtMs` accumulation in stop runs, (b) dispose() called while still recording.
- `composer.ts`: ensure mode A test triggers `drawCamPip` (needs both `screen` AND `camera` layers).
- `storage/indexeddb.ts`: the `onerror` reject branches are inherently hard to hit with `fake-indexeddb`; if branch coverage stays under 90 %, add a `// eslint-disable-next-line` comment is _not_ acceptable — instead, force the branch by stubbing `indexedDB.open` to call `onerror`. Example:

```ts
import { vi } from 'vitest';
import { IndexedDbChunkStore } from './indexeddb';

it('append() rejects with storage-failed when the open request errors', async () => {
  const original = indexedDB.open;
  vi.spyOn(indexedDB, 'open').mockImplementation(((name: string) => {
    const req = {
      result: null,
      error: new Error('quota'),
      onsuccess: null,
      onerror: null,
    } as IDBOpenDBRequest;
    queueMicrotask(() => req.onerror?.(new Event('error')));
    return req;
  }) as typeof indexedDB.open);
  const store = new IndexedDbChunkStore('forced-fail');
  await expect(store.append(new Blob([new Uint8Array(8)]))).rejects.toMatchObject({
    kind: 'storage-failed',
  });
  vi.mocked(indexedDB.open).mockRestore?.();
  (indexedDB as any).open = original;
});
```

Add such tests only for any branch the coverage report actually flags. Do not pad.

- [ ] **Step 3: Re-run until green**

Run: `pnpm --filter @record-me/recorder test`
Expected: green; coverage report shows all four metrics ≥ 90%.

- [ ] **Step 4: Commit (only if you added gap-closing tests)**

```bash
git add packages/recorder/src
git commit -m "test(recorder): close coverage gaps to meet ≥90% gate"
```

---

### Task I2: Finalize `index.ts` public exports

**Files:**

- Modify: `packages/recorder/src/index.ts`

- [ ] **Step 1: Update the surface to include `createRecorder`**

```ts
// packages/recorder/src/index.ts
// @record-me/recorder · public surface

export { createRecorder } from './recorder';
export { supportedMimeType, probeCapabilities, MIME_PREFERENCE } from './capabilities';
export type { CapabilityReport } from './capabilities';
export type {
  RecordMode,
  RecorderState,
  RecorderOptions,
  RecordingResolution,
  ChunkStorageStrategy,
  RecordingResult,
  RecorderHandle,
  RecorderErrorLike,
  RecorderErrorKind,
} from './types';
export { RecorderError } from './errors';
export type { PermissionSubject } from './errors';
export { suggestedFilename, extensionForMimeType } from './filename';

export const RECORDER_PACKAGE_VERSION = '0.1.0';
```

- [ ] **Step 2: Typecheck + smoke import**

Run: `pnpm --filter @record-me/recorder typecheck`
Expected: green.

Then verify the surface from the top-level imports work by adding a tiny smoke test:

```ts
// packages/recorder/src/index.smoke.test.ts
import { describe, it, expect } from 'vitest';
import * as api from './index';

describe('@record-me/recorder · public surface', () => {
  it('re-exports createRecorder + capabilities + errors + filename', () => {
    expect(typeof api.createRecorder).toBe('function');
    expect(typeof api.supportedMimeType).toBe('function');
    expect(typeof api.probeCapabilities).toBe('function');
    expect(typeof api.suggestedFilename).toBe('function');
    expect(typeof api.extensionForMimeType).toBe('function');
    expect(api.RecorderError).toBeDefined();
    expect(api.RECORDER_PACKAGE_VERSION).toBe('0.1.0');
  });
});
```

- [ ] **Step 3: Run the smoke test**

Run: `pnpm --filter @record-me/recorder exec vitest run --no-coverage src/index.smoke.test.ts`
Expected: 1 passing.

- [ ] **Step 4: Commit**

```bash
git add packages/recorder/src/index.ts packages/recorder/src/index.smoke.test.ts
git commit -m "feat(recorder): publish createRecorder via public index surface"
```

---

### Task I3: Documentation refresh

**Files:**

- Modify: `docs/RECORDING.md`
- Modify: `docs/PROGRESS.md`
- Modify: `docs/CODEBASE_MAP.md`
- Modify: `docs/ARCHITECTURE.md`

> **Owner:** when running under `/spawn-record-me-team`, the dispatch loop routes this task to `record-me-scribe`. The scribe reads each file first, then splices the new content in.

- [ ] **Step 1: Update `docs/RECORDING.md`**

Replace the "Public API" stub section and append a Storage subsection. Final shape:

```markdown
# Recording pipeline

Authoritative reference for the `@record-me/recorder` engine. Source of truth
for the contract: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 7.

## Module map

| Module                                    | Responsibility                                                        |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `src/index.ts`                            | Public re-exports                                                     |
| `src/types.ts`                            | Public types (`RecorderOptions`, `RecorderHandle`, `RecordingResult`) |
| `src/capabilities.ts`                     | `supportedMimeType()` + `probeCapabilities()` (MP4-first negotiation) |
| `src/errors.ts`                           | `RecorderError` + DOMException → kind mapping                         |
| `src/filename.ts`                         | `suggestedFilename(date, seq, mime)` builder                          |
| `src/acquire.ts`                          | Per-mode track acquisition (A/B/C)                                    |
| `src/composer.ts`                         | 2D canvas composer (RAF, screen full, cam PiP, square crop)           |
| `src/cursor-highlights.ts`                | In-tab click ripples — drawn into composer's overlay slot             |
| `src/encoder.ts`                          | `MediaRecorder` wrapper with chunk + error dispatch                   |
| `src/storage/{memory,indexeddb,index}.ts` | Pluggable chunk stores + auto-strategy factory                        |
| `src/recorder.ts`                         | `createRecorder()` state machine wiring everything                    |

## Five stages

1. **Acquire** — `getDisplayMedia` and/or `getUserMedia` per mode.
2. **Composite** — 2D canvas, `requestAnimationFrame` draws screen → cam PiP
   → cursor ripples.
3. **Stream** — `canvas.captureStream(fps)` + audio track from `getUserMedia`.
4. **Encode** — `MediaRecorder` with negotiated mimeType, 30 fps, 4 Mbps,
   chunks every 1 s.
5. **Deliver** — concat chunks → `Blob` → object URL → `release()` revokes.

## State machine
```

idle → requesting-permissions → recording ⇄ paused → finalizing → ready → idle
↘ error

```

`error` is reachable from any state; recovery = `dispose()` then create a new recorder.

## Codec negotiation

Walked in `supportedMimeType()`:

1. `video/mp4;codecs=avc1.42E01E,mp4a.40.2`
2. `video/mp4;codecs=h264,aac`
3. `video/webm;codecs=vp9,opus`
4. `video/webm;codecs=vp8,opus`

MP4 first for universal playback (Safari, QuickTime, social platforms). MP4 via
MediaRecorder is recent (Chrome / Firefox added it in 2024–2025); older browsers
silently fall back to WebM — this is fine.

## Storage strategy

| `maxDurationMs` (cap) | `strategy: 'auto'` resolves to | Notes                            |
| --------------------- | ------------------------------ | -------------------------------- |
| ≤ 10 min              | in-memory (`MemoryChunkStore`) | Default fast path                |
| > 10 min              | `IndexedDbChunkStore`          | One DB per session; cleared on `release()` / `dispose()` |

Hard cap: 60 min. Recorder auto-stops 100 ms before the cap.

Explicit overrides:

- `storage: 'memory'` — always in-memory regardless of cap
- `storage: 'indexeddb'` — always spill regardless of cap

## Cursor highlights — honest scope

Web sandboxing prevents observing mouse events outside the record-me tab.
Click ripples only work for in-tab clicks. The `/record` UI says so explicitly.
v2 will ship a Chrome extension for arbitrary-surface highlights.

## Public API

See the TypeScript declarations in `packages/recorder/src/types.ts` and the
factory at `packages/recorder/src/recorder.ts`. The public surface is:

- `createRecorder(opts: RecorderOptions): RecorderHandle`
- `supportedMimeType(): string | null`
- `probeCapabilities(): CapabilityReport`
- `suggestedFilename(date, seq, mime): string`
- `RecorderError` class + `RecorderErrorKind` union

## Testing

Unit tests run in jsdom with `MediaRecorder`, `MediaStream`,
`navigator.mediaDevices`, `HTMLCanvasElement.{getContext, captureStream}`,
and `AudioContext` mocked globally in `src/test/setup.ts`. IndexedDB uses
`fake-indexeddb/auto`. Coverage gate is 90% lines / functions / branches /
statements per spec § 12.3.
```

- [ ] **Step 2: Update `docs/PROGRESS.md`**

Replace the `Phase 3 · Recording engine · planned` block with:

```markdown
## Phase 3 · Recording engine · complete

Plan: `docs/superpowers/plans/2026-05-28-record-me-phase-3-recorder.md`
Epic: #3 (closed)
Completed: 2026-05-28

- [x] `supportedMimeType()` + `probeCapabilities()` (extracted into `capabilities.ts`)
- [x] `createRecorder()` state machine
- [x] Track acquisition per mode (A/B/C)
- [x] Canvas compositing pipeline (RAF + per-mode layouts)
- [x] Cursor highlight overlay (in-tab clicks)
- [x] MediaRecorder integration + codec negotiation
- [x] IndexedDB chunk spill for long recordings
- [x] Memory mode + RecordingResult assembly
- [x] 90%+ unit test coverage
```

Leave Phase 4+ untouched.

- [ ] **Step 3: Update `docs/CODEBASE_MAP.md`**

Under the `record-me-staff` ownership block, replace any existing recorder rows with the new inventory:

```markdown
- `packages/recorder/src/index.ts` — public surface (re-exports)
- `packages/recorder/src/types.ts` — public types
- `packages/recorder/src/capabilities.ts` — MP4-first MIME negotiation + capability probe
- `packages/recorder/src/errors.ts` — RecorderError + DOMException mapping
- `packages/recorder/src/filename.ts` — suggestedFilename builder
- `packages/recorder/src/acquire.ts` — per-mode track acquisition
- `packages/recorder/src/composer.ts` — 2D canvas RAF composer
- `packages/recorder/src/cursor-highlights.ts` — in-tab click ripples
- `packages/recorder/src/encoder.ts` — MediaRecorder wrapper
- `packages/recorder/src/recorder.ts` — createRecorder state machine
- `packages/recorder/src/storage/index.ts` — ChunkStore + factory
- `packages/recorder/src/storage/memory.ts` — in-memory chunk store
- `packages/recorder/src/storage/indexeddb.ts` — IndexedDB chunk store
- `packages/recorder/src/test/setup.ts` — vitest global mock setup
- `packages/recorder/src/test/mocks/**` — MediaRecorder / MediaStream / navigator.mediaDevices / canvas / AudioContext mocks
- `packages/recorder/vitest.config.ts` — vitest jsdom + 90% coverage gate
```

- [ ] **Step 4: Update `docs/ARCHITECTURE.md`**

Find the `@record-me/recorder` row in the package-responsibility table and replace it with:

```markdown
| `@record-me/recorder` | `@record-me/config` | Framework-agnostic recording engine. State machine + acquire + composer (RAF) + cursor highlights + MediaRecorder + pluggable chunk storage (in-memory or IndexedDB). **No React import.** Unit-tested in jsdom with MediaStream / MediaRecorder / canvas / IDB mocks. Public API: `createRecorder`, `supportedMimeType`, `probeCapabilities`, `RecorderError`, `suggestedFilename`. |
```

- [ ] **Step 5: Commit**

```bash
git add docs/RECORDING.md docs/PROGRESS.md docs/CODEBASE_MAP.md docs/ARCHITECTURE.md
git commit -m "docs: mark phase 3 complete; refresh recorder module map + ownership"
```

---

### Task I4: Holistic gate + PR

**Files:** none — orchestration.

- [ ] **Step 1: Run the full holistic check from repo root**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected: all four green. If any step fails, fix in the relevant earlier task — loop back, don't paper over.

- [ ] **Step 2: Run any existing E2E suite to confirm Phase 3 didn't regress**

```bash
pnpm test:e2e
```

Phase 3 doesn't add E2E specs (the recorder is exercised end-to-end starting in Phase 4 via the studio UI). The Phase-2 smoke spec must still pass.

- [ ] **Step 3: Push the branch**

```bash
git push -u origin phase-3-recorder
```

- [ ] **Step 4: Invoke `/pr`**

Run the `/pr` slash command. It will:

1. Aggregate the commit history,
2. Compose a PR body that follows the record-me PR template (Summary · Changes · Test plan · Closes #3),
3. Open the PR against `main`.

PR title: `feat(phase-3): recording engine`.

- [ ] **Step 5: Hand off to the principal review gate**

When dispatched via `/spawn-record-me-team`, the principal runs `[REVIEW_RESULT] APPROVED` over the entire diff. Address any CRITICAL or MAJOR findings before merge.

- [ ] **Step 6: Squash-merge**

After approval, squash-merge the PR. Delete the remote branch.

- [ ] **Step 7: Verify epic auto-closes**

The phase-3 epic (#3) closes automatically via the `Closes #3` footer on the squash commit. If the auto-close doesn't fire, close it manually:

```bash
gh issue close 3 --reason completed --comment "Phase 3 complete — see PR for full inventory."
```

---

## Self-review notes

**Spec coverage (§ 7):**

- § 7.1 five-stage pipeline → Sections D (acquire), F (composite), G (encode), E + H (deliver via store assemble + release).
- § 7.2 state machine → Section H (skeleton + full lifecycle + auto-stop/error covers every transition).
- § 7.3 cursor highlights (honest scope) → Task F2 (in-tab click ripples + opt-out).
- § 7.4 codec negotiation → already shipped in Phase 1, preserved in Task C1 (`capabilities.ts`).
- § 7.5 memory strategy & caps → Tasks E1–E3 (memory + IDB stores + auto factory at 10-min threshold).
- § 7.6 public API → all of `RecorderOptions`, `RecorderHandle`, `RecordingResult`, `CapabilityReport`, `createRecorder`, `supportedMimeType`, `probeCapabilities` ship via `index.ts` (Tasks B1, C1, H2, I2).

**Phase 3 milestone coverage (`docs/PROGRESS.md`):**

- `supportedMimeType()` + `probeCapabilities()` (✓ from Phase 1) → preserved + tested in Task C1.
- `createRecorder()` state machine → Tasks H1 + H2 + H3.
- Track acquisition per mode (A/B/C) → Task D1.
- Canvas compositing pipeline → Task F1.
- Cursor highlight overlay → Task F2.
- MediaRecorder integration + codec negotiation → Task G1 + capabilities.
- IndexedDB chunk spill → Task E2 + E3.
- Memory mode + RecordingResult assembly → Tasks E1 + H2 (RecordingResult build in `stop()`).
- 90%+ unit test coverage → Task I1 raises and closes any gap; thresholds are bumped in vitest.config.ts during Task A5.

**Type consistency check:**

- All call sites use `RecorderState`, `RecorderOptions`, `RecordingResult`, `RecorderHandle` from `types.ts` — no parallel definitions.
- `RecorderError.kind` values match `RecorderErrorKind` union exactly: `permission-denied | unsupported-browser | track-failed | recorder-failed | storage-failed | invalid-state`.
- `ChunkStore.append(chunk: Blob): Promise<void>` is identical in both `MemoryChunkStore` and `IndexedDbChunkStore`.
- `Composer` interface uses `setLayers`, `start`, `stop`, `captureStream`, `dispose` — same names as the recorder calls.

**Open risks for the executor:**

- **jsdom and `URL.createObjectURL`.** jsdom provides a stub that returns a `blob:` URL string and `revokeObjectURL` is a no-op. Tests can assert the prefix but should not depend on the URL being usable as a `src`.
- **`HTMLVideoElement.play()` in jsdom.** Returns a rejected promise (no real video stack). The composer awaits it with a `.catch(() => {})` so this is harmless — but if you add a test that depends on `play()` resolving, you'll need to stub it.
- **`fake-indexeddb` transaction timing.** Transactions complete on a microtask, not synchronously. Tests that interleave `append()` and `assemble()` should `await` each — they already do.
- **Coverage 90% on branches.** The hardest branches are the IDB `onerror` paths and the `if (state !== 'idle') setState('idle')` guards. Task I1 documents how to force IDB error branches via `vi.spyOn(indexedDB, 'open')` when needed.
- **`new MediaStream(tracks)` in jsdom.** The mock constructor accepts a tracks array — `recorder.ts` uses this to build the composite stream. If the mock signature drifts (e.g. only accepting a single stream), Section H tests will catch it.
- **`apps/web` does NOT change in Phase 3.** Do not edit `apps/web/**` — the React `useRecorder()` hook lands in Phase 4. Any task that wants to "demo" the recorder in the web app belongs in Phase 4.
