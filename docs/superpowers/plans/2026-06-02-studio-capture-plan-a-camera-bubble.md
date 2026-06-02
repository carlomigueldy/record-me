# Plan A — Cover-crop + Movable Camera Bubble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the stretched camera (real "cover" crop) and add a Loom-style movable, resizable camera bubble (free-drag + snap-to-corner, S/M/L presets, persisted, works in setup and live recording).

**Architecture:** The recorder composites onto an off-screen canvas; the camera PiP is painted into that canvas, so the bubble's position/size is fed to the composer as a resolved `PipState` (normalized center + diameter). The composer stays "dumb" (draws where told). All interaction logic — drag, snap, presets, persistence, letterbox coordinate mapping — lives in the `apps/web` UI layer. The cover-crop uses the 9-argument `drawImage` with a centered square source rect.

**Tech Stack:** TypeScript, Next.js 15 (App Router), React, Vitest + Testing Library + `@testing-library/user-event` (jsdom), Playwright (E2E), Tailwind (Twilight tokens), `@vercel/analytics`.

**Scope:** Spec `docs/superpowers/specs/2026-06-02-studio-capture-fixes-design.md` §§ 5, 6, 7, and the **Plan A** rows of §§ 8, 10. **Excludes Plan B** (background-freeze / `FrameClock` / `captureStream(0)` / `requestFrame` / CSP) entirely.

**Source-of-truth decisions locked from the spec:**

- Size preset → diameter: `Math.round(fraction × canvasHeight)`, `sm=0.17, md=0.22, lg=0.30`, clamped to `Math.floor(0.40 × min(canvasWidth, canvasHeight))`. (`md @ 1080p = round(237.6) = 238`px — matches the spec's "≈238".)
- Corner inset (normalized, per-axis, 32px canvas margin): `xInset=(diameter/2+32)/canvasWidth`, `yInset=(diameter/2+32)/canvasHeight`.
- localStorage key `record-me-pip`, value `{ v: 1, corner, size }`, default `{ corner: 'br', size: 'md' }`.
- Bubble applies only to `screen+cam+cursor`. Composite aspect is 16:9, fixed per session (resolution locked at `start()`).

**Running commands (record-me):** if `pnpm`/`node` are not on the shell PATH, wrap commands in a login shell: `zsh -lic '<command>'`. Recorder tests: `pnpm --filter @record-me/recorder ...`. Web tests: `pnpm --filter @record-me/web ...`. A single Vitest file: `pnpm --filter <pkg> exec vitest run <path>`.

---

## File structure

**`@record-me/recorder` (engine):**

- `packages/recorder/src/types.ts` — add `PipState`; `RecorderOptions.initialPip`; `RecorderHandle.setCameraBubble`.
- `packages/recorder/src/composer.ts` — `coverSquare()` (exported pure helper); 9-arg cover-crop in `drawCamPip`/`drawCamFull`; zero-size guard; `ComposerOptions.initialPip`; `Composer.setPip()`; dynamic pip + default.
- `packages/recorder/src/recorder.ts` — pass `initialPip` to composer; implement `setCameraBubble` (mode-guarded forward to `composer.setPip`).
- `packages/recorder/src/acquire.ts` — `CAM_PIP_VIDEO` higher-res hint (no hard `aspectRatio`).
- `packages/recorder/src/test/mocks/video.ts` _(new)_ — stub `HTMLVideoElement` `videoWidth/videoHeight`.
- `packages/recorder/src/test/setup.ts` — install the video mock.

**`apps/web` (UI):**

- `apps/web/src/lib/pip-geometry.ts` _(new)_ — `PipCorner`, `PipSize`, `pipDiameter`, `resolvePip`, `nearestCorner`, `computeContentRect`.
- `apps/web/src/lib/pip-storage.ts` _(new)_ — versioned `record-me-pip` load/save.
- `apps/web/src/hooks/use-video-content-rect.ts` _(new)_ — `ResizeObserver`-backed content-rect hook.
- `apps/web/src/hooks/use-pip-state.ts` _(new)_ — corner/size state + persistence.
- `apps/web/src/lib/analytics.ts` — `cameraBubbleMoved` / `cameraBubbleResized`.
- `apps/web/src/hooks/use-recorder.ts` — expose `setCameraBubble` command.
- `apps/web/src/app/record/_components/CameraBubbleControl.tsx` _(new)_ — drag/snap/resize overlay + setup placeholder.
- `apps/web/src/app/record/_components/Studio.tsx` / `LivePreview.tsx` — mount overlay, wire seed/preview/commit.
- `apps/web/tests/e2e/camera-bubble.spec.ts` _(new)_ — drag + persist E2E on the setup stage.
- Docs: `docs/RECORDING.md`, `docs/FRONTEND.md`, `docs/DESIGN.md`, `docs/PROGRESS.md`.

---

## Task 1: Cover-crop helper + video-dimension test mock

**Files:**

- Create: `packages/recorder/src/test/mocks/video.ts`
- Modify: `packages/recorder/src/test/setup.ts`
- Modify: `packages/recorder/src/composer.ts`
- Test: `packages/recorder/src/composer.test.ts`

- [ ] **Step 1: Add a video-dimension mock**

The composer creates `<video>` elements internally via `trackToImageSource`. jsdom reports `videoWidth/videoHeight = 0`, which (with the new zero-size guard) would skip every camera draw. This mock lets tests control reported dimensions.

Create `packages/recorder/src/test/mocks/video.ts`:

```ts
// packages/recorder/src/test/mocks/video.ts
// jsdom reports videoWidth/videoHeight = 0. The composer's cover-crop skips the
// camera draw when dimensions are 0, so tests must be able to set them.
let mockVideoWidth = 1280;
let mockVideoHeight = 720;

export function installVideoMocks(): void {
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
    configurable: true,
    get: () => mockVideoWidth,
  });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
    configurable: true,
    get: () => mockVideoHeight,
  });
}

/** Set the dimensions every mock <video> reports. */
export function setMockVideoSize(width: number, height: number): void {
  mockVideoWidth = width;
  mockVideoHeight = height;
}

/** Reset to the default 1280x720. Call in afterEach where a test changed it. */
export function resetMockVideoSize(): void {
  mockVideoWidth = 1280;
  mockVideoHeight = 720;
}
```

- [ ] **Step 2: Install the mock globally**

Modify `packages/recorder/src/test/setup.ts` — add the import and install call alongside the others:

```ts
import { installCanvasMocks } from './mocks/canvas';
import { installAudioContextGlobal } from './mocks/audio-context';
import { installVideoMocks, resetMockVideoSize } from './mocks/video';

installMediaStreamGlobals();
installMediaRecorderGlobal();
installMediaDevices();
installCanvasMocks();
installAudioContextGlobal();
installVideoMocks();
```

And in the existing `afterEach`, reset the size so a test that changed it cannot leak:

```ts
afterEach(() => {
  resetMediaDevices();
  MockMediaRecorder.reset();
  resetMockVideoSize();
});
```

- [ ] **Step 3: Write the failing test for `coverSquare`**

Add to `packages/recorder/src/composer.test.ts` (new import + describe block):

```ts
import { createComposer, coverSquare } from './composer';
import { setMockVideoSize } from './test/mocks/video';

describe('coverSquare', () => {
  it('crops a centered square from a landscape source', () => {
    expect(coverSquare(640, 480)).toEqual({ sx: 80, sy: 0, side: 480 });
    expect(coverSquare(1280, 720)).toEqual({ sx: 280, sy: 0, side: 720 });
  });
  it('crops a centered square from a portrait source', () => {
    expect(coverSquare(480, 640)).toEqual({ sx: 0, sy: 80, side: 480 });
  });
  it('is a no-op rect for an already-square source', () => {
    expect(coverSquare(720, 720)).toEqual({ sx: 0, sy: 0, side: 720 });
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm --filter @record-me/recorder exec vitest run src/composer.test.ts`
Expected: FAIL — `coverSquare` is not exported.

- [ ] **Step 5: Implement `coverSquare` and the cover-crop draws**

In `packages/recorder/src/composer.ts`, add the exported helper near the top (after imports):

```ts
/** Largest centered square in the source, mapped to a square dest (object-fit: cover). */
export function coverSquare(vw: number, vh: number): { sx: number; sy: number; side: number } {
  const side = Math.min(vw, vh);
  return { sx: (vw - side) / 2, sy: (vh - side) / 2, side };
}
```

Replace `drawCamFull` with the cover-crop + zero-size guard:

```ts
const drawCamFull = () => {
  if (!cameraVideo) return;
  const vw = cameraVideo.videoWidth;
  const vh = cameraVideo.videoHeight;
  if (vw === 0 || vh === 0) return; // frame not yet decoded
  const { sx, sy, side } = coverSquare(vw, vh);
  ctx.drawImage(cameraVideo, sx, sy, side, side, 0, 0, width, height);
};
```

Replace `drawCamPip` with the cover-crop + zero-size guard (position still bottom-right for now — Task 2 makes it dynamic):

```ts
const drawCamPip = () => {
  if (!cameraVideo) return;
  const vw = cameraVideo.videoWidth;
  const vh = cameraVideo.videoHeight;
  if (vw === 0 || vh === 0) return; // frame not yet decoded
  const diameter = PIP_DIAMETER;
  const margin = 32;
  const x = width - diameter - margin;
  const y = height - diameter - margin;
  const radius = diameter / 2;
  const { sx, sy, side } = coverSquare(vw, vh);

  ctx.save();
  ctx.beginPath();
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(cameraVideo, sx, sy, side, side, x, y, diameter, diameter);
  ctx.restore();
};
```

- [ ] **Step 6: Run the `coverSquare` test to verify it passes**

Run: `pnpm --filter @record-me/recorder exec vitest run src/composer.test.ts`
Expected: the `coverSquare` describe block PASSES.

- [ ] **Step 7: Write failing integration tests for the crop + zero-size guard**

Add to `composer.test.ts` inside `describe('createComposer', ...)`:

```ts
it('PiP draws the camera with a centered square source crop (cover)', () => {
  setMockVideoSize(640, 480);
  const comp = createComposer({ mode: 'screen+cam+cursor', resolution: '720p', fps: 30 });
  comp.setLayers({
    screen: makeTrack('video') as unknown as MediaStreamTrack,
    camera: makeTrack('video') as unknown as MediaStreamTrack,
  });
  const ctx = getMockContext(comp.canvas)!;
  comp.start();
  vi.advanceTimersByTime(34);
  comp.stop();

  // The camera draw is the 9-argument drawImage; the screen draw uses 4 args.
  const camCall = ctx.drawImage.mock.calls.find((c) => c.length === 9)!;
  expect(camCall).toBeDefined();
  expect(camCall.slice(1, 5)).toEqual([80, 0, 480, 480]); // sx, sy, side, side
});

it('cam-only draws a centered square crop into the square canvas', () => {
  setMockVideoSize(1280, 720);
  const comp = createComposer({ mode: 'cam-only', resolution: '720p', fps: 30 });
  comp.setLayers({ camera: makeTrack('video') as unknown as MediaStreamTrack });
  const ctx = getMockContext(comp.canvas)!;
  comp.start();
  vi.advanceTimersByTime(34);
  comp.stop();

  const camCall = ctx.drawImage.mock.calls.find((c) => c.length === 9)!;
  expect(camCall.slice(1, 5)).toEqual([280, 0, 720, 720]); // sx, sy, side, side
  expect(camCall.slice(5)).toEqual([0, 0, 720, 720]); // dest fills the square canvas
});

it('skips the camera draw until the first frame has dimensions', () => {
  setMockVideoSize(0, 0);
  const comp = createComposer({ mode: 'screen+cam+cursor', resolution: '720p', fps: 30 });
  comp.setLayers({
    screen: makeTrack('video') as unknown as MediaStreamTrack,
    camera: makeTrack('video') as unknown as MediaStreamTrack,
  });
  const ctx = getMockContext(comp.canvas)!;
  comp.start();
  vi.advanceTimersByTime(34);
  comp.stop();

  // No 9-arg camera draw, and no circle clip, because the cam draw is skipped.
  expect(ctx.drawImage.mock.calls.some((c) => c.length === 9)).toBe(false);
  expect(ctx.clip).not.toHaveBeenCalled();
});
```

- [ ] **Step 8: Run to verify the new tests pass and the suite is green**

Run: `pnpm --filter @record-me/recorder exec vitest run src/composer.test.ts`
Expected: PASS. The pre-existing `mode A` and `cam-only` tests still pass because the default mock video size (1280×720) makes the camera draw run.

- [ ] **Step 9: Run the full recorder suite (no regressions)**

Run: `pnpm --filter @record-me/recorder test`
Expected: all tests PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/recorder/src/test/mocks/video.ts packages/recorder/src/test/setup.ts packages/recorder/src/composer.ts packages/recorder/src/composer.test.ts
git commit -m "fix(recorder): cover-crop camera draws so the picture stops stretching"
```

---

## Task 2: `PipState` type + dynamic, resizable PiP position in the composer

**Files:**

- Modify: `packages/recorder/src/types.ts`
- Modify: `packages/recorder/src/composer.ts`
- Test: `packages/recorder/src/composer.test.ts`

- [ ] **Step 1: Add the `PipState` public type**

In `packages/recorder/src/types.ts`, after `RecordingResolution`:

```ts
/** Resolved camera-bubble draw position: normalized center (0..1) + diameter in canvas px. */
export interface PipState {
  xNorm: number;
  yNorm: number;
  diameter: number;
}
```

Add `initialPip` to `RecorderOptions` (after `cursorHighlights`):

```ts
  /** Initial camera-bubble position/size; seeds the composer so the first frame is correct (screen+cam+cursor only). */
  initialPip?: PipState;
```

- [ ] **Step 2: Write the failing tests for `setPip` and the default**

Add to `composer.test.ts` inside `describe('createComposer', ...)`:

```ts
it('default PiP (no setPip) is bottom-right at round(0.22*height)', () => {
  setMockVideoSize(640, 480);
  const comp = createComposer({ mode: 'screen+cam+cursor', resolution: '1080p', fps: 30 });
  comp.setLayers({
    screen: makeTrack('video') as unknown as MediaStreamTrack,
    camera: makeTrack('video') as unknown as MediaStreamTrack,
  });
  const ctx = getMockContext(comp.canvas)!;
  comp.start();
  vi.advanceTimersByTime(34);
  comp.stop();

  const diameter = Math.round(0.22 * 1080); // 238
  const r = diameter / 2;
  const cx = 1920 - 32 - r; // bottom-right inset by 32px margin
  const cy = 1080 - 32 - r;
  expect(ctx.arc).toHaveBeenCalledWith(cx, cy, r, 0, Math.PI * 2);
});

it('setPip moves and resizes the PiP', () => {
  setMockVideoSize(640, 480);
  const comp = createComposer({ mode: 'screen+cam+cursor', resolution: '720p', fps: 30 });
  comp.setLayers({
    screen: makeTrack('video') as unknown as MediaStreamTrack,
    camera: makeTrack('video') as unknown as MediaStreamTrack,
  });
  comp.setPip({ xNorm: 0.25, yNorm: 0.25, diameter: 200 });
  const ctx = getMockContext(comp.canvas)!;
  comp.start();
  vi.advanceTimersByTime(34);
  comp.stop();

  const cx = 0.25 * 1280; // 320
  const cy = 0.25 * 720; // 180
  expect(ctx.arc).toHaveBeenCalledWith(cx, cy, 100, 0, Math.PI * 2);
  const camCall = ctx.drawImage.mock.calls.find((c) => c.length === 9)!;
  // dest x,y = center - radius; dest w,h = diameter
  expect(camCall.slice(5)).toEqual([cx - 100, cy - 100, 200, 200]);
});

it('initialPip seeds the first-frame position', () => {
  setMockVideoSize(640, 480);
  const comp = createComposer({
    mode: 'screen+cam+cursor',
    resolution: '720p',
    fps: 30,
    initialPip: { xNorm: 0.1, yNorm: 0.9, diameter: 120 },
  });
  comp.setLayers({
    screen: makeTrack('video') as unknown as MediaStreamTrack,
    camera: makeTrack('video') as unknown as MediaStreamTrack,
  });
  const ctx = getMockContext(comp.canvas)!;
  comp.start();
  vi.advanceTimersByTime(34);
  comp.stop();

  expect(ctx.arc).toHaveBeenCalledWith(0.1 * 1280, 0.9 * 720, 60, 0, Math.PI * 2);
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --filter @record-me/recorder exec vitest run src/composer.test.ts`
Expected: FAIL — `setPip` is not a function; `initialPip` is not accepted.

- [ ] **Step 4: Implement dynamic pip in the composer**

In `packages/recorder/src/composer.ts`:

Import the type and extend `ComposerOptions` + `Composer`:

```ts
import type { RecordMode, RecordingResolution, PipState } from './types';
```

```ts
export interface ComposerOptions {
  mode: RecordMode;
  resolution: RecordingResolution;
  fps: number;
  /** Seeds the camera bubble so the first frame is correct (screen+cam+cursor only). */
  initialPip?: PipState | undefined;
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
```

Inside `createComposer`, add pip state (after `let stream`):

```ts
let pip: PipState | undefined = opts.initialPip;

const defaultPip = (): PipState => {
  const diameter = Math.round(0.22 * height);
  const xInset = (diameter / 2 + 32) / width;
  const yInset = (diameter / 2 + 32) / height;
  return { xNorm: 1 - xInset, yNorm: 1 - yInset, diameter };
};
```

Rewrite `drawCamPip` to use the current pip:

```ts
const drawCamPip = () => {
  if (!cameraVideo) return;
  const vw = cameraVideo.videoWidth;
  const vh = cameraVideo.videoHeight;
  if (vw === 0 || vh === 0) return;
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
  ctx.drawImage(cameraVideo, sx, sy, side, side, cx - radius, cy - radius, p.diameter, p.diameter);
  ctx.restore();
};
```

Remove the now-unused `PIP_DIAMETER` constant. Add the `setPip` method to the returned object (next to `setLayers`):

```ts
    setPip(state) {
      pip = state;
    },
```

- [ ] **Step 5: Run to verify the new tests pass**

Run: `pnpm --filter @record-me/recorder exec vitest run src/composer.test.ts`
Expected: PASS.

- [ ] **Step 6: Run typecheck + full recorder suite**

Run: `pnpm --filter @record-me/recorder typecheck && pnpm --filter @record-me/recorder test`
Expected: PASS (no `PIP_DIAMETER` references remain).

- [ ] **Step 7: Commit**

```bash
git add packages/recorder/src/types.ts packages/recorder/src/composer.ts packages/recorder/src/composer.test.ts
git commit -m "feat(recorder): dynamic, resizable camera bubble via composer.setPip"
```

---

## Task 3: `RecorderHandle.setCameraBubble` + initialPip seed

**Files:**

- Modify: `packages/recorder/src/types.ts`
- Modify: `packages/recorder/src/recorder.ts`
- Test: `packages/recorder/src/recorder.test.ts`

- [ ] **Step 1: Add `setCameraBubble` to the public handle type**

In `packages/recorder/src/types.ts`, add to `RecorderHandle` (after `salvage`):

```ts
  /**
   * Update the camera-bubble position/size live (screen+cam+cursor only).
   * No-op in other modes or before start().
   */
  setCameraBubble: (state: PipState) => void;
```

- [ ] **Step 2: Write the failing tests**

Add to `packages/recorder/src/recorder.test.ts`. (Match the file's existing setup — it imports `createRecorder` and uses the global media mocks.) Add a focused describe:

```ts
import * as composerModule from './composer';

describe('setCameraBubble', () => {
  it('is a safe no-op before start()', () => {
    const rec = createRecorder({ mode: 'screen+cam+cursor' });
    expect(() => rec.setCameraBubble({ xNorm: 0.5, yNorm: 0.5, diameter: 200 })).not.toThrow();
  });

  it('forwards to composer.setPip while recording in screen+cam+cursor', async () => {
    let captured: ReturnType<typeof composerModule.createComposer> | undefined;
    const real = composerModule.createComposer;
    const spy = vi.spyOn(composerModule, 'createComposer').mockImplementation((o) => {
      captured = real(o);
      vi.spyOn(captured, 'setPip');
      return captured;
    });

    const rec = createRecorder({ mode: 'screen+cam+cursor' });
    await rec.start();
    const pip = { xNorm: 0.25, yNorm: 0.75, diameter: 180 };
    rec.setCameraBubble(pip);
    expect(captured!.setPip).toHaveBeenCalledWith(pip);

    rec.dispose();
    spy.mockRestore();
  });

  it('passes initialPip through to the composer', async () => {
    const spy = vi.spyOn(composerModule, 'createComposer');
    const initialPip = { xNorm: 0.1, yNorm: 0.9, diameter: 120 };
    const rec = createRecorder({ mode: 'screen+cam+cursor', initialPip });
    await rec.start();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ initialPip }));
    rec.dispose();
    spy.mockRestore();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --filter @record-me/recorder exec vitest run src/recorder.test.ts`
Expected: FAIL — `setCameraBubble` is not a function; `initialPip` not forwarded.

- [ ] **Step 4: Implement in `recorder.ts`**

Pass `initialPip` into the composer where it is created (inside `start()`):

```ts
internal.composer = createComposer({
  mode: resolved.mode,
  resolution: resolved.resolution,
  fps: resolved.fps,
  initialPip: opts.initialPip,
  onOverlay: (ctx, frame) => internal.highlights?.draw(ctx, frame, performance.now()),
});
```

Add the method to the returned `handle` object (after `dispose`):

```ts
    setCameraBubble(state): void {
      if (resolved.mode !== 'screen+cam+cursor') return;
      internal.composer?.setPip(state);
    },
```

Add `PipState` to the type import at the top of `recorder.ts`:

```ts
import type {
  RecorderHandle,
  RecorderOptions,
  RecorderState,
  RecordingResult,
  PermissionSubject,
  PipState,
} from './types';
```

(`setCameraBubble(state)` uses the inferred `PipState` from the handle signature; the import keeps the file self-documenting and satisfies the explicit annotation if you choose to add one.)

- [ ] **Step 5: Run to verify the tests pass**

Run: `pnpm --filter @record-me/recorder exec vitest run src/recorder.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + full suite + coverage gate**

Run: `pnpm --filter @record-me/recorder typecheck && pnpm --filter @record-me/recorder test`
Expected: PASS. Recorder coverage stays ≥ 90% lines/functions/statements, ≥ 85% branches.

- [ ] **Step 7: Commit**

```bash
git add packages/recorder/src/types.ts packages/recorder/src/recorder.ts packages/recorder/src/recorder.test.ts
git commit -m "feat(recorder): RecorderHandle.setCameraBubble + initialPip seed"
```

---

## Task 4: Camera capture resolution hint (sharper large bubbles)

**Files:**

- Modify: `packages/recorder/src/acquire.ts`
- Test: `packages/recorder/src/acquire.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/recorder/src/acquire.test.ts` (it already exercises `acquireTracks` against the media-devices mock — match its `getUserMedia` spying). Add:

```ts
it('requests a higher-res PiP camera without a hard aspectRatio constraint', async () => {
  const getUserMedia = vi.spyOn(navigator.mediaDevices, 'getUserMedia');
  await acquireTracks({ mode: 'screen+cam+cursor' });
  const videoConstraint = getUserMedia.mock.calls
    .map((c) => c[0]?.video)
    .find((v) => v && typeof v === 'object') as MediaTrackConstraints;
  expect(videoConstraint.width).toEqual({ ideal: 720 });
  expect(videoConstraint.height).toEqual({ ideal: 720 });
  expect(videoConstraint).not.toHaveProperty('aspectRatio'); // avoid OverconstrainedError
});
```

> If `acquire.test.ts` does not already grant camera permission via the mock, copy the permission-granting setup from the existing `screen+cam+cursor` test in that file so `getUserMedia` resolves.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @record-me/recorder exec vitest run src/acquire.test.ts`
Expected: FAIL — current `CAM_PIP_VIDEO` is `640×480`.

- [ ] **Step 3: Update the constant**

In `packages/recorder/src/acquire.ts`, replace `CAM_PIP_VIDEO`:

```ts
const CAM_PIP_VIDEO: MediaTrackConstraints = {
  width: { ideal: 720 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
};
```

(No hard `aspectRatio: 1` — the composer's `coverSquare` is the source of truth, and a hard 1:1 can throw `OverconstrainedError` on cameras that cannot do it. `ideal` is best-effort; cameras may still return 640×480.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @record-me/recorder exec vitest run src/acquire.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/recorder/src/acquire.ts packages/recorder/src/acquire.test.ts
git commit -m "feat(recorder): request higher-res PiP camera (best-effort, sharper bubble)"
```

---

## Task 5: `pip-geometry.ts` — pure geometry helpers

**Files:**

- Create: `apps/web/src/lib/pip-geometry.ts`
- Test: `apps/web/src/lib/pip-geometry.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/pip-geometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  pipDiameter,
  resolvePip,
  nearestCorner,
  computeContentRect,
  PIP_CORNERS,
  PIP_SIZES,
} from './pip-geometry';

describe('pipDiameter', () => {
  it('rounds fraction*height at 1080p', () => {
    expect(pipDiameter('sm', 1920, 1080)).toBe(184); // round(0.17*1080)
    expect(pipDiameter('md', 1920, 1080)).toBe(238); // round(0.22*1080)
    expect(pipDiameter('lg', 1920, 1080)).toBe(324); // round(0.30*1080)
  });
  it('rounds fraction*height at 720p', () => {
    expect(pipDiameter('sm', 1280, 720)).toBe(122);
    expect(pipDiameter('md', 1280, 720)).toBe(158);
    expect(pipDiameter('lg', 1280, 720)).toBe(216);
  });
  it('clamps to 40% of the shorter side', () => {
    // Square-ish surface where lg would exceed the ceiling.
    expect(pipDiameter('lg', 400, 400)).toBe(Math.floor(0.4 * 400)); // 160
  });
});

describe('resolvePip', () => {
  it('places br with per-axis 32px inset at md/1080p', () => {
    const p = resolvePip('br', 'md', 1920, 1080);
    expect(p.diameter).toBe(238);
    expect(p.xNorm).toBeCloseTo(1 - (119 + 32) / 1920, 5); // ~0.9214
    expect(p.yNorm).toBeCloseTo(1 - (119 + 32) / 1080, 5); // ~0.8602
  });
  it('places tl mirrored', () => {
    const p = resolvePip('tl', 'md', 1920, 1080);
    expect(p.xNorm).toBeCloseTo((119 + 32) / 1920, 5);
    expect(p.yNorm).toBeCloseTo((119 + 32) / 1080, 5);
  });
});

describe('nearestCorner', () => {
  it('snaps a top-left-ish drop to tl', () => {
    expect(nearestCorner(0.1, 0.1, 'md', 1920, 1080)).toBe('tl');
  });
  it('snaps a bottom-right-ish drop to br', () => {
    expect(nearestCorner(0.95, 0.92, 'md', 1920, 1080)).toBe('br');
  });
  it('snaps center-bottom-left to bl', () => {
    expect(nearestCorner(0.2, 0.8, 'md', 1920, 1080)).toBe('bl');
  });
});

describe('computeContentRect', () => {
  it('letterboxes a 16:9 composite in a wider box (pillarbox)', () => {
    const r = computeContentRect(2000, 1000, 16 / 9); // box wider than 16:9
    expect(r.height).toBe(1000);
    expect(r.width).toBeCloseTo(1000 * (16 / 9), 3);
    expect(r.top).toBe(0);
    expect(r.left).toBeCloseTo((2000 - 1000 * (16 / 9)) / 2, 3);
  });
  it('letterboxes a 16:9 composite in a narrower box', () => {
    const r = computeContentRect(1600, 1000, 16 / 9); // box narrower than 16:9
    expect(r.width).toBe(1600);
    expect(r.height).toBeCloseTo(1600 / (16 / 9), 3);
    expect(r.left).toBe(0);
  });
  it('returns zero rect for a zero-size box', () => {
    expect(computeContentRect(0, 0, 16 / 9)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });
});

describe('enums', () => {
  it('exposes corner and size lists', () => {
    expect(PIP_CORNERS).toEqual(['tl', 'tr', 'bl', 'br']);
    expect(PIP_SIZES).toEqual(['sm', 'md', 'lg']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/pip-geometry.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `pip-geometry.ts`**

Create `apps/web/src/lib/pip-geometry.ts`:

```ts
import type { PipState } from '@record-me/recorder';

export type PipCorner = 'tl' | 'tr' | 'bl' | 'br';
export type PipSize = 'sm' | 'md' | 'lg';

export const PIP_CORNERS: PipCorner[] = ['tl', 'tr', 'bl', 'br'];
export const PIP_SIZES: PipSize[] = ['sm', 'md', 'lg'];

const SIZE_FRACTION: Record<PipSize, number> = { sm: 0.17, md: 0.22, lg: 0.3 };
const MARGIN_PX = 32;

/** Bubble diameter in canvas px, clamped to 40% of the shorter canvas side. */
export function pipDiameter(size: PipSize, canvasWidth: number, canvasHeight: number): number {
  const raw = Math.round(SIZE_FRACTION[size] * canvasHeight);
  const ceiling = Math.floor(0.4 * Math.min(canvasWidth, canvasHeight));
  return Math.min(raw, ceiling);
}

/** Resolve a {corner,size} preference into composer draw coordinates. */
export function resolvePip(
  corner: PipCorner,
  size: PipSize,
  canvasWidth: number,
  canvasHeight: number,
): PipState {
  const diameter = pipDiameter(size, canvasWidth, canvasHeight);
  const xInset = (diameter / 2 + MARGIN_PX) / canvasWidth;
  const yInset = (diameter / 2 + MARGIN_PX) / canvasHeight;
  const isLeft = corner === 'tl' || corner === 'bl';
  const isTop = corner === 'tl' || corner === 'tr';
  return {
    xNorm: isLeft ? xInset : 1 - xInset,
    yNorm: isTop ? yInset : 1 - yInset,
    diameter,
  };
}

/** Nearest corner (by squared distance of centers) to a normalized drop point. */
export function nearestCorner(
  xNorm: number,
  yNorm: number,
  size: PipSize,
  canvasWidth: number,
  canvasHeight: number,
): PipCorner {
  let best: PipCorner = 'br';
  let bestDist = Infinity;
  for (const corner of PIP_CORNERS) {
    const p = resolvePip(corner, size, canvasWidth, canvasHeight);
    const dx = p.xNorm - xNorm;
    const dy = p.yNorm - yNorm;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = corner;
    }
  }
  return best;
}

export interface ContentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The rendered content rect of an object-contain element of `aspect` (w/h) inside its box. */
export function computeContentRect(boxW: number, boxH: number, aspect: number): ContentRect {
  if (boxW === 0 || boxH === 0) return { left: 0, top: 0, width: 0, height: 0 };
  const boxAspect = boxW / boxH;
  let width: number;
  let height: number;
  if (boxAspect > aspect) {
    height = boxH;
    width = boxH * aspect;
  } else {
    width = boxW;
    height = boxW / aspect;
  }
  return { left: (boxW - width) / 2, top: (boxH - height) / 2, width, height };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/pip-geometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/pip-geometry.ts apps/web/src/lib/pip-geometry.test.ts
git commit -m "feat(web): pip-geometry — diameter, corner, snap, and letterbox math"
```

---

## Task 6: `pip-storage.ts` — versioned localStorage preference

**Files:**

- Create: `apps/web/src/lib/pip-storage.ts`
- Test: `apps/web/src/lib/pip-storage.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/pip-storage.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadPipPreference, savePipPreference } from './pip-storage';

describe('pip-storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns the default when nothing is stored', () => {
    expect(loadPipPreference()).toEqual({ corner: 'br', size: 'md' });
  });

  it('round-trips a saved preference with a version field', () => {
    savePipPreference({ corner: 'tl', size: 'lg' });
    expect(JSON.parse(localStorage.getItem('record-me-pip')!)).toEqual({
      v: 1,
      corner: 'tl',
      size: 'lg',
    });
    expect(loadPipPreference()).toEqual({ corner: 'tl', size: 'lg' });
  });

  it('falls back to defaults for out-of-range values', () => {
    localStorage.setItem('record-me-pip', JSON.stringify({ v: 1, corner: 'xx', size: 'huge' }));
    expect(loadPipPreference()).toEqual({ corner: 'br', size: 'md' });
  });

  it('falls back to defaults for malformed JSON', () => {
    localStorage.setItem('record-me-pip', '{not json');
    expect(loadPipPreference()).toEqual({ corner: 'br', size: 'md' });
  });

  it('does not throw when localStorage access throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadPipPreference()).toEqual({ corner: 'br', size: 'md' });
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/pip-storage.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `pip-storage.ts`**

Create `apps/web/src/lib/pip-storage.ts`:

```ts
import { PIP_CORNERS, PIP_SIZES, type PipCorner, type PipSize } from './pip-geometry';

export interface PipPreference {
  corner: PipCorner;
  size: PipSize;
}

const KEY = 'record-me-pip';
const DEFAULT: PipPreference = { corner: 'br', size: 'md' };

export function loadPipPreference(): PipPreference {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT };
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as { corner?: unknown; size?: unknown };
    const corner = PIP_CORNERS.includes(parsed.corner as PipCorner)
      ? (parsed.corner as PipCorner)
      : DEFAULT.corner;
    const size = PIP_SIZES.includes(parsed.size as PipSize)
      ? (parsed.size as PipSize)
      : DEFAULT.size;
    return { corner, size };
  } catch {
    return { ...DEFAULT };
  }
}

export function savePipPreference(pref: PipPreference): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify({ v: 1, corner: pref.corner, size: pref.size }));
  } catch {
    /* ignore quota / blocked storage (private mode, Brave shields) */
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/pip-storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/pip-storage.ts apps/web/src/lib/pip-storage.test.ts
git commit -m "feat(web): versioned record-me-pip localStorage preference"
```

---

## Task 7: `use-video-content-rect` hook

**Files:**

- Create: `apps/web/src/hooks/use-video-content-rect.ts`
- Test: `apps/web/src/hooks/use-video-content-rect.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/hooks/use-video-content-rect.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @record-me/web exec vitest run src/hooks/use-video-content-rect.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook**

Create `apps/web/src/hooks/use-video-content-rect.ts`:

```ts
'use client';

import { useEffect, useState, type RefObject } from 'react';
import { computeContentRect, type ContentRect } from '../lib/pip-geometry';

/**
 * The rendered content rectangle of an object-contain element of `aspect` (w/h)
 * inside its box. Recomputes on resize. Returns a zero rect until measured.
 */
export function useVideoContentRect(
  ref: RefObject<HTMLElement | null>,
  aspect: number,
): ContentRect {
  const [rect, setRect] = useState<ContentRect>({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setRect(computeContentRect(el.clientWidth, el.clientHeight, aspect));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, aspect]);

  return rect;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @record-me/web exec vitest run src/hooks/use-video-content-rect.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-video-content-rect.ts apps/web/src/hooks/use-video-content-rect.test.ts
git commit -m "feat(web): useVideoContentRect — letterbox-aware content rect"
```

---

## Task 8: `use-pip-state` hook

**Files:**

- Create: `apps/web/src/hooks/use-pip-state.ts`
- Test: `apps/web/src/hooks/use-pip-state.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/hooks/use-pip-state.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePipState } from './use-pip-state';

describe('usePipState', () => {
  beforeEach(() => localStorage.clear());

  it('starts at the persisted default', () => {
    const { result } = renderHook(() => usePipState());
    expect(result.current.corner).toBe('br');
    expect(result.current.size).toBe('md');
  });

  it('updates and persists corner + size', () => {
    const { result } = renderHook(() => usePipState());
    act(() => result.current.setCorner('tl'));
    act(() => result.current.setSize('lg'));
    expect(result.current.corner).toBe('tl');
    expect(result.current.size).toBe('lg');
    expect(JSON.parse(localStorage.getItem('record-me-pip')!)).toEqual({
      v: 1,
      corner: 'tl',
      size: 'lg',
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @record-me/web exec vitest run src/hooks/use-pip-state.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook**

Create `apps/web/src/hooks/use-pip-state.ts`:

```ts
'use client';

import { useCallback, useState } from 'react';
import { loadPipPreference, savePipPreference, type PipPreference } from '../lib/pip-storage';
import type { PipCorner, PipSize } from '../lib/pip-geometry';

export interface PipStateApi {
  corner: PipCorner;
  size: PipSize;
  setCorner: (corner: PipCorner) => void;
  setSize: (size: PipSize) => void;
}

export function usePipState(): PipStateApi {
  const [pref, setPref] = useState<PipPreference>(() => loadPipPreference());

  const setCorner = useCallback((corner: PipCorner) => {
    setPref((prev) => {
      const next = { ...prev, corner };
      savePipPreference(next);
      return next;
    });
  }, []);

  const setSize = useCallback((size: PipSize) => {
    setPref((prev) => {
      const next = { ...prev, size };
      savePipPreference(next);
      return next;
    });
  }, []);

  return { corner: pref.corner, size: pref.size, setCorner, setSize };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @record-me/web exec vitest run src/hooks/use-pip-state.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-pip-state.ts apps/web/src/hooks/use-pip-state.test.ts
git commit -m "feat(web): usePipState — corner/size preference with persistence"
```

---

## Task 9: Analytics events for bubble move/resize

**Files:**

- Modify: `apps/web/src/lib/analytics.ts`
- Test: `apps/web/src/lib/analytics.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/lib/analytics.test.ts` (match its existing `vi.mock('@vercel/analytics')` + `track` spy setup):

```ts
it('emits camera_bubble_moved with corner + where', () => {
  analytics.cameraBubbleMoved({ corner: 'tl', where: 'live' });
  expect(track).toHaveBeenCalledWith('camera_bubble_moved', { corner: 'tl', where: 'live' });
});

it('emits camera_bubble_resized with size + where', () => {
  analytics.cameraBubbleResized({ size: 'lg', where: 'setup' });
  expect(track).toHaveBeenCalledWith('camera_bubble_resized', { size: 'lg', where: 'setup' });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/analytics.test.ts`
Expected: FAIL — methods do not exist.

- [ ] **Step 3: Implement the events**

In `apps/web/src/lib/analytics.ts`, add the import and two methods:

```ts
import type { PipCorner, PipSize } from './pip-geometry';
```

Add inside the `analytics` object (after `cursorHighlightDisabled`):

```ts
  cameraBubbleMoved(p: { corner: PipCorner; where: 'setup' | 'live' }): void {
    track('camera_bubble_moved', { corner: p.corner, where: p.where });
  },
  cameraBubbleResized(p: { size: PipSize; where: 'setup' | 'live' }): void {
    track('camera_bubble_resized', { size: p.size, where: p.where });
  },
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/analytics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/analytics.ts apps/web/src/lib/analytics.test.ts
git commit -m "feat(web): camera_bubble_moved / camera_bubble_resized analytics (PII-free)"
```

---

## Task 10: Expose `setCameraBubble` from `useRecorder`

**Files:**

- Modify: `apps/web/src/hooks/use-recorder.ts`
- Test: `apps/web/src/hooks/use-recorder.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/hooks/use-recorder.test.ts`:

```ts
it('exposes setCameraBubble as a safe no-op before start()', () => {
  const { result } = renderHook(() => useRecorder());
  expect(typeof result.current.setCameraBubble).toBe('function');
  expect(() =>
    result.current.setCameraBubble({ xNorm: 0.5, yNorm: 0.5, diameter: 200 }),
  ).not.toThrow();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @record-me/web exec vitest run src/hooks/use-recorder.test.ts`
Expected: FAIL — `setCameraBubble` is not on the API.

- [ ] **Step 3: Implement**

In `apps/web/src/hooks/use-recorder.ts`:

Import the type:

```ts
import {
  createRecorder,
  type RecorderHandle,
  type RecorderOptions,
  type RecorderState,
  type RecordingResult,
  type RecorderErrorLike,
  type PipState,
} from '@record-me/recorder';
```

Add to `UseRecorderApi` (after `savePartial`):

```ts
  setCameraBubble: (state: PipState) => void;
```

Add the callback (next to `pause`/`resume`):

```ts
const setCameraBubble = useCallback(
  (state: PipState) => handleRef.current?.setCameraBubble(state),
  [],
);
```

Add `setCameraBubble` to the returned object.

> `StartOptions = Omit<RecorderOptions, callbacks>` already includes `initialPip` (it is not a callback), so callers pass `initialPip` through `start({...})` with no further change here.

- [ ] **Step 4: Run to verify it passes + full web suite**

Run: `pnpm --filter @record-me/web exec vitest run src/hooks/use-recorder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-recorder.ts apps/web/src/hooks/use-recorder.test.ts
git commit -m "feat(web): expose setCameraBubble + initialPip passthrough on useRecorder"
```

---

## Task 11: `CameraBubbleControl` — drag/snap/resize overlay

> **REQUIRED before coding:** invoke the `frontend-design` skill for this component (CLAUDE.md: non-negotiable for UI work). Use Twilight tokens only (`bg-surface-2`, `text-ivory-mut`, `border-line`, `bg-amber`, `text-amber`, `font-mono`). No hardcoded hex.

**Files:**

- Create: `apps/web/src/app/record/_components/CameraBubbleControl.tsx`
- Test: `apps/web/src/app/record/_components/CameraBubbleControl.test.tsx`

**Contract:**

```ts
import type { PipState } from '@record-me/recorder';
import type { PipCorner, PipSize } from '../../../lib/pip-geometry';

export interface CameraBubbleControlProps {
  corner: PipCorner;
  size: PipSize;
  /** Composite aspect (width/height) — 16/9 for screen+cam+cursor. */
  aspect: number;
  /** Canvas dimensions for geometry, so diameter scales with resolution. */
  canvasWidth: number;
  canvasHeight: number;
  /** The preview surface this overlays (the <video> or the setup stage). */
  surfaceRef: React.RefObject<HTMLElement | null>;
  /** Whether this renders the static "CAM" placeholder (setup) or the live ring. */
  variant: 'setup' | 'live';
  /** Continuous push during drag — live composer feedback (no-op in setup). */
  onPreview?: (pip: PipState) => void;
  /** Commit on drag-end (corner) or size change. */
  onCommitCorner: (corner: PipCorner) => void;
  onCommitSize: (size: PipSize) => void;
}
```

- [ ] **Step 1: Write the failing component tests**

Create `apps/web/src/app/record/_components/CameraBubbleControl.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { CameraBubbleControl } from './CameraBubbleControl';

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

const baseProps = {
  corner: 'br' as const,
  size: 'md' as const,
  aspect: 16 / 9,
  canvasWidth: 1920,
  canvasHeight: 1080,
  surfaceRef: createRef<HTMLElement>(),
  variant: 'setup' as const,
  onCommitCorner: () => {},
  onCommitSize: () => {},
};

describe('CameraBubbleControl', () => {
  it('renders the draggable handle with an accessible label', () => {
    render(<CameraBubbleControl {...baseProps} />);
    expect(screen.getByRole('button', { name: /camera bubble position/i })).toBeInTheDocument();
  });

  it('renders the CAM placeholder label in setup variant', () => {
    render(<CameraBubbleControl {...baseProps} variant="setup" />);
    expect(screen.getByText('CAM')).toBeInTheDocument();
  });

  it('moves to an adjacent corner with the arrow keys', async () => {
    const onCommitCorner = vi.fn();
    render(<CameraBubbleControl {...baseProps} corner="br" onCommitCorner={onCommitCorner} />);
    const handle = screen.getByRole('button', { name: /camera bubble position/i });
    handle.focus();
    await userEvent.keyboard('{ArrowLeft}'); // br -> bl
    expect(onCommitCorner).toHaveBeenCalledWith('bl');
    await userEvent.keyboard('{ArrowUp}'); // br -> tr
    expect(onCommitCorner).toHaveBeenCalledWith('tr');
  });

  it('changes size via the S/M/L radio group', async () => {
    const onCommitSize = vi.fn();
    render(<CameraBubbleControl {...baseProps} onCommitSize={onCommitSize} />);
    await userEvent.click(screen.getByRole('radio', { name: /large/i }));
    expect(onCommitSize).toHaveBeenCalledWith('lg');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/CameraBubbleControl.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `CameraBubbleControl.tsx`**

Create `apps/web/src/app/record/_components/CameraBubbleControl.tsx`:

```tsx
'use client';

import { useCallback, useRef, useState } from 'react';
import type { PipState } from '@record-me/recorder';
import {
  PIP_CORNERS,
  PIP_SIZES,
  nearestCorner,
  resolvePip,
  type PipCorner,
  type PipSize,
} from '../../../lib/pip-geometry';
import { useVideoContentRect } from '../../../hooks/use-video-content-rect';

export interface CameraBubbleControlProps {
  corner: PipCorner;
  size: PipSize;
  aspect: number;
  canvasWidth: number;
  canvasHeight: number;
  surfaceRef: React.RefObject<HTMLElement | null>;
  variant: 'setup' | 'live';
  onPreview?: (pip: PipState) => void;
  onCommitCorner: (corner: PipCorner) => void;
  onCommitSize: (size: PipSize) => void;
}

const SIZE_LABEL: Record<PipSize, string> = { sm: 'Small', md: 'Medium', lg: 'Large' };

// Arrow-key corner moves: [horizontal flip on Left/Right, vertical flip on Up/Down].
function moveCorner(corner: PipCorner, key: string): PipCorner {
  const isLeft = corner === 'tl' || corner === 'bl';
  const isTop = corner === 'tl' || corner === 'tr';
  let nextLeft = isLeft;
  let nextTop = isTop;
  if (key === 'ArrowLeft') nextLeft = true;
  else if (key === 'ArrowRight') nextLeft = false;
  else if (key === 'ArrowUp') nextTop = true;
  else if (key === 'ArrowDown') nextTop = false;
  if (nextTop) return nextLeft ? 'tl' : 'tr';
  return nextLeft ? 'bl' : 'br';
}

export function CameraBubbleControl({
  corner,
  size,
  aspect,
  canvasWidth,
  canvasHeight,
  surfaceRef,
  variant,
  onPreview,
  onCommitCorner,
  onCommitSize,
}: CameraBubbleControlProps) {
  const rect = useVideoContentRect(surfaceRef, aspect);
  const [dragNorm, setDragNorm] = useState<{ x: number; y: number } | null>(null);

  // Resolved (committed) normalized position + canvas-px diameter.
  const resolved = resolvePip(corner, size, canvasWidth, canvasHeight);
  const xNorm = dragNorm ? dragNorm.x : resolved.xNorm;
  const yNorm = dragNorm ? dragNorm.y : resolved.yNorm;

  // Map canvas-normalized coords to element-px coords inside the letterboxed content rect.
  const diameterPx = (resolved.diameter / canvasHeight) * rect.height;
  const cx = rect.left + xNorm * rect.width;
  const cy = rect.top + yNorm * rect.height;
  const halfXNorm = resolved.diameter / 2 / canvasWidth;
  const halfYNorm = resolved.diameter / 2 / canvasHeight;

  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || rect.width === 0) return;
      const box = surfaceRef.current?.getBoundingClientRect();
      if (!box) return;
      const px = e.clientX - box.left - rect.left;
      const py = e.clientY - box.top - rect.top;
      const nx = Math.min(Math.max(px / rect.width, halfXNorm), 1 - halfXNorm);
      const ny = Math.min(Math.max(py / rect.height, halfYNorm), 1 - halfYNorm);
      setDragNorm({ x: nx, y: ny });
      onPreview?.({ xNorm: nx, yNorm: ny, diameter: resolved.diameter });
    },
    [rect, surfaceRef, halfXNorm, halfYNorm, onPreview, resolved.diameter],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const final = dragNorm ?? { x: xNorm, y: yNorm };
      const next = nearestCorner(final.x, final.y, size, canvasWidth, canvasHeight);
      setDragNorm(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be released */
      }
      onCommitCorner(next);
    },
    [dragNorm, xNorm, yNorm, size, canvasWidth, canvasHeight, onCommitCorner],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!e.key.startsWith('Arrow')) return;
      e.preventDefault();
      onCommitCorner(moveCorner(corner, e.key));
    },
    [corner, onCommitCorner],
  );

  // Flip the size control below the handle when it is near the top edge.
  const controlsBelow = cy - diameterPx / 2 < diameterPx; // little headroom

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="group absolute"
        style={{
          left: cx - diameterPx / 2,
          top: cy - diameterPx / 2,
          width: diameterPx,
          height: diameterPx,
        }}
      >
        <button
          type="button"
          aria-label="Camera bubble position"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className={[
            'pointer-events-auto absolute inset-0 flex items-center justify-center rounded-full',
            'cursor-grab touch-none select-none transition-transform duration-[180ms] active:cursor-grabbing',
            'motion-reduce:transition-none',
            variant === 'setup'
              ? 'bg-surface-2 text-ivory-mut ring-1 ring-line'
              : 'ring-2 ring-amber/70',
          ].join(' ')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          {variant === 'setup' ? (
            <span className="font-mono text-[10px] uppercase tracking-widest">CAM</span>
          ) : null}
        </button>

        <div
          role="radiogroup"
          aria-label="Camera bubble size"
          className={[
            'pointer-events-auto absolute left-1/2 flex -translate-x-1/2 gap-1 rounded-sm border border-line bg-surface px-1 py-0.5',
            'opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 motion-reduce:transition-none',
            controlsBelow ? 'top-full mt-2' : 'bottom-full mb-2',
          ].join(' ')}
        >
          {PIP_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={s === size}
              aria-label={SIZE_LABEL[s]}
              onClick={() => onCommitSize(s)}
              className={[
                'rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] uppercase',
                s === size ? 'bg-amber text-bg' : 'text-ivory-dim hover:text-ivory',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {/* Keep PIP_CORNERS referenced for future affordances without dead-code lint. */}
      <span className="sr-only">{PIP_CORNERS.length} corners</span>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify the tests pass**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/CameraBubbleControl.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/record/_components/CameraBubbleControl.tsx apps/web/src/app/record/_components/CameraBubbleControl.test.tsx
git commit -m "feat(web): CameraBubbleControl — drag/snap/resize overlay + setup placeholder"
```

---

## Task 12: Wire the bubble into the Studio (setup stage + live overlay)

**Files:**

- Modify: `apps/web/src/app/record/_components/Studio.tsx`
- Modify: `apps/web/src/app/record/_components/LivePreview.tsx`
- Test: `apps/web/src/app/record/_components/Studio.test.tsx`

- [ ] **Step 1: Give `LivePreview` a wrapper ref for the overlay**

Modify `apps/web/src/app/record/_components/LivePreview.tsx` to forward a ref to the surface and accept overlay children:

```tsx
'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

export interface LivePreviewProps {
  stream: MediaStream | null;
  /** Ref to the surface box (for an overlay to measure the letterboxed content). */
  surfaceRef?: RefObject<HTMLDivElement | null>;
  /** Overlay rendered above the video (e.g. the camera-bubble control). */
  children?: ReactNode;
}

export function LivePreview({ stream, surfaceRef, children }: LivePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.srcObject = stream;
    return () => {
      if (el) el.srcObject = null;
    };
  }, [stream]);

  return (
    <div ref={surfaceRef} className="relative h-full max-h-[70dvh] w-full">
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        aria-label="Live recording preview"
        className="h-full w-full bg-bg object-contain"
      />
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Write the failing Studio tests**

Add to `apps/web/src/app/record/_components/Studio.test.tsx`:

```tsx
it('shows the camera bubble placeholder in setup for screen+cam+cursor', async () => {
  render(<Studio />);
  await userEvent.click(screen.getByRole('radio', { name: /screen \+ camera \+ cursor/i }));
  expect(screen.getByRole('button', { name: /camera bubble position/i })).toBeInTheDocument();
  expect(screen.getByText('CAM')).toBeInTheDocument();
});

it('does not show the camera bubble for screen+cursor', async () => {
  render(<Studio />);
  await userEvent.click(screen.getByRole('radio', { name: /screen \+ cursor/i }));
  expect(screen.queryByRole('button', { name: /camera bubble position/i })).not.toBeInTheDocument();
});
```

> Match the existing `Studio.test.tsx` imports (`render`, `screen`, `userEvent`) and any capability mock it already sets up so all three modes are available.

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/Studio.test.tsx`
Expected: FAIL — no bubble control rendered.

- [ ] **Step 4: Wire the Studio**

In `apps/web/src/app/record/_components/Studio.tsx`:

Add imports:

```ts
import { useRef } from 'react'; // ensure useRef is imported (merge with existing react import)
import { CameraBubbleControl } from './CameraBubbleControl';
import { usePipState } from '../../../hooks/use-pip-state';
import { resolvePip } from '../../../lib/pip-geometry';
```

Inside `Studio()`, after `const recorder = useRecorder();`:

```ts
const pip = usePipState();
const liveSurfaceRef = useRef<HTMLDivElement>(null);
const setupSurfaceRef = useRef<HTMLDivElement>(null);

// Composite canvas dims for screen+cam+cursor (16:9, resolution-locked at start()).
const canvasW = resolution === '1080p' ? 1920 : 1280;
const canvasH = resolution === '1080p' ? 1080 : 720;
const PIP_ASPECT = 16 / 9;

const { setCameraBubble } = recorder;

const onCommitCorner = useCallback(
  (corner: typeof pip.corner, where: 'setup' | 'live') => {
    pip.setCorner(corner);
    setCameraBubble(resolvePip(corner, pip.size, canvasW, canvasH));
    analytics.cameraBubbleMoved({ corner, where });
  },
  [pip, setCameraBubble, canvasW, canvasH],
);

const onCommitSize = useCallback(
  (size: typeof pip.size, where: 'setup' | 'live') => {
    pip.setSize(size);
    setCameraBubble(resolvePip(pip.corner, size, canvasW, canvasH));
    analytics.cameraBubbleResized({ size, where });
  },
  [pip, setCameraBubble, canvasW, canvasH],
);
```

Seed `initialPip` in `onStart`:

```ts
const onStart = useCallback(() => {
  void recorder.start({
    mode,
    maxDurationMs: capMinutesToMs(capMinutes),
    resolution,
    cursorHighlights,
    ...(mode === 'screen+cam+cursor'
      ? { initialPip: resolvePip(pip.corner, pip.size, canvasW, canvasH) }
      : {}),
  });
}, [
  recorder,
  mode,
  capMinutes,
  resolution,
  cursorHighlights,
  pip.corner,
  pip.size,
  canvasW,
  canvasH,
]);
```

In the `setup` body branch, when `mode === 'screen+cam+cursor'`, render the placeholder stage (a 16:9 box) with the control. Replace the setup return with:

```tsx
      case 'setup':
        return (
          <div className="flex flex-col gap-6 p-6">
            <ModePicker selected={mode} available={availableModes} onSelect={onSelectMode} />
            {mode === 'screen+cam+cursor' ? (
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ivory-mut">
                  drag your camera bubble
                </span>
                <div
                  ref={setupSurfaceRef}
                  className="relative aspect-video w-full overflow-hidden rounded-sm border border-line bg-bg"
                >
                  <CameraBubbleControl
                    corner={pip.corner}
                    size={pip.size}
                    aspect={PIP_ASPECT}
                    canvasWidth={canvasW}
                    canvasHeight={canvasH}
                    surfaceRef={setupSurfaceRef}
                    variant="setup"
                    onCommitCorner={(c) => onCommitCorner(c, 'setup')}
                    onCommitSize={(s) => onCommitSize(s, 'setup')}
                  />
                </div>
              </div>
            ) : null}
            {showCursorToggle ? (
              <p className="text-xs leading-relaxed text-ivory-dim">
                Click highlights work when you record this tab. For highlights in other apps,
                install the record-me extension (coming soon).
              </p>
            ) : null}
          </div>
        );
```

In the `live`/`paused` body branch, mount the overlay over `LivePreview`:

```tsx
      case 'live':
      case 'paused':
        return (
          <LivePreview stream={recorder.previewStream} surfaceRef={liveSurfaceRef}>
            {mode === 'screen+cam+cursor' ? (
              <CameraBubbleControl
                corner={pip.corner}
                size={pip.size}
                aspect={PIP_ASPECT}
                canvasWidth={canvasW}
                canvasHeight={canvasH}
                surfaceRef={liveSurfaceRef}
                variant="live"
                onPreview={(p) => setCameraBubble(p)}
                onCommitCorner={(c) => onCommitCorner(c, 'live')}
                onCommitSize={(s) => onCommitSize(s, 'live')}
              />
            ) : null}
          </LivePreview>
        );
```

> The `body` IIFE references `pip`, the refs, and the commit callbacks — they are all in scope inside `Studio()`. Ensure `useCallback` and `useRef` are imported from `react` (the file already imports `useCallback`, `useMemo`, `useState`, `useEffect`, `useRef`).

- [ ] **Step 5: Run the Studio tests**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/Studio.test.tsx`
Expected: PASS.

- [ ] **Step 6: Typecheck + full web unit suite**

Run: `pnpm --filter @record-me/web typecheck && pnpm --filter @record-me/web test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/record/_components/Studio.tsx apps/web/src/app/record/_components/LivePreview.tsx apps/web/src/app/record/_components/Studio.test.tsx
git commit -m "feat(web): wire movable camera bubble into setup stage + live preview"
```

---

## Task 13: E2E — drag + persist on the setup stage

**Files:**

- Create: `apps/web/tests/e2e/camera-bubble.spec.ts`

> The setup placeholder is testable without `getDisplayMedia` (no real screen capture needed), so this exercises drag + snap + persistence in a real browser.

- [ ] **Step 1: Write the E2E**

Create `apps/web/tests/e2e/camera-bubble.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('camera bubble', () => {
  test('drag snaps to a corner and persists across reload', async ({ page }) => {
    await page.goto('/record');
    await page.getByRole('radio', { name: /screen \+ camera \+ cursor/i }).click();

    const handle = page.getByRole('button', { name: /camera bubble position/i });
    await expect(handle).toBeVisible();

    const stage = page.locator('.aspect-video').first();
    const box = (await stage.boundingBox())!;

    // Drag toward the top-left corner.
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1, { steps: 8 });
    await page.mouse.up();

    // Persisted preference reflects a top/left corner.
    const stored = await page.evaluate(() => localStorage.getItem('record-me-pip'));
    expect(stored).toBeTruthy();
    const pref = JSON.parse(stored!);
    expect(pref.v).toBe(1);
    expect(['tl', 'bl', 'tr']).toContain(pref.corner);

    // Survives reload.
    await page.reload();
    await page.getByRole('radio', { name: /screen \+ camera \+ cursor/i }).click();
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('record-me-pip')!));
    expect(after.corner).toBe(pref.corner);
  });

  test('size control updates the persisted size', async ({ page }) => {
    await page.goto('/record');
    await page.getByRole('radio', { name: /screen \+ camera \+ cursor/i }).click();
    await page.getByRole('button', { name: /camera bubble position/i }).hover();
    await page.getByRole('radio', { name: /large/i }).click();
    const pref = await page.evaluate(() => JSON.parse(localStorage.getItem('record-me-pip')!));
    expect(pref.size).toBe('lg');
  });
});
```

- [ ] **Step 2: Run the E2E**

Run: `pnpm --filter @record-me/web test:e2e -- camera-bubble`
Expected: PASS. (If the project requires the dev/preview server to be running, follow the existing E2E run procedure used for `record.spec.ts`.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/e2e/camera-bubble.spec.ts
git commit -m "test(e2e): camera bubble drag-snap + persistence on the setup stage"
```

---

## Task 14: Visual verification + docs

**Files:**

- Modify: `docs/RECORDING.md`, `docs/FRONTEND.md`, `docs/DESIGN.md`, `docs/PROGRESS.md`

- [ ] **Step 1: Visual verification via Playwright MCP (no exceptions — CLAUDE.md)**

Run the app (`pnpm dev` at root), then with Playwright MCP:

- `browser_navigate` to `http://localhost:3000/record`.
- Select **screen + camera + cursor**; `browser_snapshot` + `browser_take_screenshot` of the setup stage; drag the placeholder to each corner; switch S/M/L; confirm snap + resize feel.
- `browser_console_messages` — confirm **no errors/warnings**.
- Start a real recording (grant screen + camera), confirm the camera is **undistorted** (cover-crop) and the bubble is draggable live; drag it to another corner; stop and review the file.
- Verify reduced-motion: emulate `prefers-reduced-motion: reduce` and confirm the snap is instant.

Record outcomes (screenshots) in the PR description.

- [ ] **Step 2: Update `docs/RECORDING.md`**

In the composer/module section, document: cover-crop (`coverSquare`, 9-arg `drawImage`, zero-size guard), `Composer.setPip` / `ComposerOptions.initialPip`, `RecorderHandle.setCameraBubble`, and `RecorderOptions.initialPip`. Note that the bubble applies only to `screen+cam+cursor`.

- [ ] **Step 3: Update `docs/FRONTEND.md`**

Add the new files to the inventory: `CameraBubbleControl`, `use-pip-state`, `use-video-content-rect`, `pip-geometry`, `pip-storage`; note `useRecorder().setCameraBubble` and the new analytics events.

- [ ] **Step 4: Update `docs/DESIGN.md`**

Document the camera-bubble control: the setup placeholder (`bg-surface-2` circle, `text-ivory-mut` "CAM" mono label, `bg-bg` 16:9 stage, `ring-line`), the live ring (`ring-amber/70`), the S/M/L control (`bg-amber`/`text-bg` selected), the `cubic-bezier(0.34,1.56,0.64,1)` 180ms snap, and the `motion-reduce` instant path.

- [ ] **Step 5: Update `docs/PROGRESS.md`**

Mark Plan A (cover-crop + movable bubble) items complete; link this plan and the spec.

- [ ] **Step 6: Run the whole gate**

Run: `pnpm --filter @record-me/recorder test && pnpm --filter @record-me/web test && pnpm typecheck && pnpm lint && pnpm --filter @record-me/web build`
Expected: all PASS; recorder coverage ≥ 90/90/85/90; web build succeeds.

- [ ] **Step 7: Commit**

```bash
git add docs/RECORDING.md docs/FRONTEND.md docs/DESIGN.md docs/PROGRESS.md
git commit -m "docs: cover-crop + movable camera bubble (Plan A)"
```

---

## Self-review checklist (run before handoff)

- **Spec coverage:**
  - §5 cover-crop → Task 1 (helper + draws) ✓; §5 camera constraint hint → Task 4 ✓.
  - §6.1 `setPip`/default → Task 2 ✓; §6.2 `setCameraBubble`/initialPip/use-recorder → Tasks 3, 10 ✓; §6.3 geometry → Task 5 ✓; §6.4 control → Tasks 11, 12 ✓; §6.5 persistence → Tasks 6, 8 ✓; §6.6 analytics → Task 9 ✓.
  - §7.1 live drag → Task 12 ✓; §7.2 mode gating → Tasks 11, 12 ✓; §7.4 setup placeholder + 16:9 stage → Task 12 ✓.
  - §8 Plan A tests → composer/recorder/acquire (Tasks 1–4), geometry/storage/hooks/analytics/control (Tasks 5–11), Studio (Task 12), E2E (Task 13), manual visual (Task 14) ✓.
  - §10 Plan A files → all created/modified across Tasks 1–14 ✓.
- **Deferred to a follow-up (acknowledged, not silently dropped):** `§7.3` `paused`-frame semantics depend on Plan B's `captureStream(0)`/`requestFrame`; under today's `captureStream(fps)` auto-sampling a `setPip` while paused is reflected by the next sampled frame, so no extra wiring is needed in Plan A. The explicit "issue a `requestFrame()` on `setPip` while paused" rule is implemented in **Plan B** alongside the manual-capture switch.
- **Placeholder scan:** no TBD/TODO; every code step shows complete code. ✓
- **Type consistency:** `PipState` (recorder) used everywhere; `PipCorner`/`PipSize` (web) consistent; `setCameraBubble`/`setPip`/`resolvePip`/`pipDiameter`/`nearestCorner`/`computeContentRect`/`loadPipPreference`/`savePipPreference` names match across tasks; analytics `camera_bubble_moved`/`camera_bubble_resized` consistent. ✓
