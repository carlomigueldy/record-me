# Studio capture fixes & movable camera bubble — design

**Status:** approved (brainstorm) · **Date:** 2026-06-02 · **Epic:** _to be opened before plan dispatch_ (replaces `TBD`)
**Parent spec:** [`2026-05-27-record-me-design.md`](2026-05-27-record-me-design.md) §§ 6, 7
**Touches:** `@record-me/recorder` (composer + new frame-clock), `apps/web` studio UI
(`/record`), `apps/web` CSP (`next.config.ts`), `docs/SECURITY.md`

> **Reviewed (2026-06-02):** This spec was hardened against a 5-lens adversarial
> review (54 findings → 31 actions). The freeze-fix clock was changed from a
> silent AudioWorklet to a **Web Worker `setInterval` + `requestFrame()`** primary
> (the battle-tested pattern for this exact bug), with the audio-clock kept as a
> documented alternative and a spike that validates both. The work is split into
> two independently-shippable plans (§ 0).

## 0 · Decomposition — two plans

The three fixes are logically separable and have very different risk. They ship
as **two implementation plans** so a risky spike never blocks ready work:

| Plan       | Scope                                                   | Risk                                                                                      | Spike?         |
| ---------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------- |
| **Plan A** | Fix 2 (cover-crop, § 5) + Fix 3 (movable bubble, § 6–7) | Low–medium, no novel platform behavior                                                    | No             |
| **Plan B** | Fix 1 (background-freeze, § 4)                          | High — depends on unverified hidden-tab capture behavior; may escalate to WebCodecs (§ 9) | **Yes, first** |

Shared composer touch-points are scoped per plan: Plan A adds `PipState`/`setPip`
and the cover-crop; Plan B injects the `FrameClock` and switches to
`captureStream(0)` + `requestFrame()`. **Plan B's composer change is additive and
non-breaking** relative to Plan A — the cover-crop and `setPip` draw logic are
unaffected by where draw ticks come from — so the two plans can land in either
order. (Recommended: Plan A first, since it is unblocked.)

## 1 · Summary

Three related defects/gaps in the live recording experience, all rooted in the
composer (`packages/recorder/src/composer.ts`):

1. **Background-tab freeze (critical · Plan B).** When the user switches away
   from the record-me tab mid-recording, the recorded **video freezes** while
   **audio keeps recording**. Root cause: the composite canvas is driven by
   `requestAnimationFrame`, which browsers throttle to ≈0 in hidden tabs.
   `canvas.captureStream(fps)` then re-samples a frozen canvas, and `MediaRecorder`
   — which encodes on a **wall clock** — duplicates the last frame for the whole
   hidden window. This breaks the core Loom workflow (record your screen, switch
   to other tabs/apps to demo them).
2. **Stretched camera (Plan A).** The camera is distorted in both the circular
   PiP and `cam-only` mode. Root cause: `drawImage(video, x, y, w, h)` (4-arg)
   scales the entire webcam frame into the destination, ignoring aspect ratio.
   The in-code comment claims "Square crop: fit shortest dimension, center" but
   that crop math was never implemented.
3. **Fixed camera bubble (Plan A).** The PiP is painted at a hardcoded
   bottom-right position and fixed size. Users want a Loom-style **movable,
   resizable** camera bubble.

## 2 · Goals & non-goals

### 2.1 Goals

- **Plan B:** recorded **video no longer freezes** when the record-me tab is
  backgrounded — **target browsers Brave/Chrome/Edge/Arc (Chromium), pending the
  § 4.3 spike** (this is an empirically-verified gate, not a guarantee — see
  § 4.3 and the risks in § 11). Safari is a plausible secondary win (§ 4.5);
  Firefox degrades gracefully to today's behavior.
- **Plan A:** camera renders **undistorted** (correct aspect ratio) in the
  circular PiP and in `cam-only` mode.
- **Plan A:** the camera bubble is **free-draggable with snap-to-nearest-corner**,
  **resizable via S/M/L presets**, movable **during setup and live recording**,
  with position + size **persisted to `localStorage`**.
- The recorder engine stays a **self-contained, framework-agnostic library**.
- Coverage stays at the recorder gate: **90% lines / functions / statements, 85%
  branches** (`docs/TESTING.md` — the gate is _not_ 90% branches); new UI tested.

### 2.2 Non-goals (deferred)

- **WebCodecs / `OffscreenCanvas`-in-worker compositing** is the **escalation
  path for Plan B** if the § 4.3 spike fails for _both_ clock candidates — see
  § 9. It is not the default build.
- **Live camera preview at setup.** The setup stage uses a _placeholder_ bubble
  (§ 7.4) to avoid an early `getUserMedia` prompt.
- **Bubble shapes other than a circle**, theming of borders/shadows, mirroring
  toggle — out of scope.
- **Repositioning in `cam-only` / `screen+cursor` modes** — neither has a PiP.
  The bubble feature applies only to `screen+cam+cursor`.
- **Cursor highlights for arbitrary surfaces** — still v2 (unchanged).

## 3 · Background — current composer (what we're changing)

`createComposer()` today:

- Sizes a canvas from `mode`/`resolution` (`cam-only` → square; else 16:9).
- Wraps each track in an `HTMLVideoElement` (`trackToImageSource`).
- Runs `tick()` on `requestAnimationFrame` (`composer.ts:110,122`): `clearRect` →
  `drawScreenFull` → `drawCamPip` (`screen+cam+cursor`) or `drawCamFull`
  (`cam-only`) → `onOverlay` (cursor ripples).
- `captureStream()` calls `canvas.captureStream(opts.fps)` once and memoizes it;
  the recorder pushes the video track + mic track into `MediaRecorder` and
  exposes a video-only clone via `onPreviewReady` (`recorder.ts:526-528`).
- `recorder.ts` `pause()`/`resume()` call `composer.stop()` / `composer.start()`.

Precise problems:

| Symptom                       | Line(s) today                                                                 | Cause                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Video freezes when tab hidden | `composer.ts` `tick()` via `requestAnimationFrame`; `captureStream(opts.fps)` | rAF throttled in hidden tabs → canvas stale → `MediaRecorder` (wall-clock) duplicates last frame |
| Camera stretched (PiP)        | `drawCamPip`: `drawImage(cameraVideo, x, y, diameter, diameter)`              | 4-arg drawImage scales full frame into square dest                                               |
| Camera stretched (`cam-only`) | `drawCamFull`: `drawImage(cameraVideo, 0, 0, width, height)`                  | same; comment promises a crop that does not exist                                                |
| Bubble fixed                  | `drawCamPip`: `PIP_DIAMETER = 240`, constant margin                           | position + size hardcoded                                                                        |

(The literal mode name `screen+cam+cursor` is used throughout; earlier drafts
said "mode A".)

---

# Plan B — background-resilient compositing clock (Fix 1)

## 4 · Design

### 4.1 Two coordinated changes

**(a) New `packages/recorder/src/frame-clock.ts`** — a `FrameClock` that invokes
a tick callback at a target FPS and _keeps firing when the tab is hidden_:

```ts
export interface FrameClock {
  start(onTick: () => void): void;
  stop(): void;
  dispose(): void;
  /** Which backing source is active — for diagnostics/tests/spike assertions. */
  readonly kind: 'worker' | 'audio-worklet' | 'raf';
}

export interface FrameClockOptions {
  fps: number;
  /** Preferred backing source; defaults to 'worker'. */
  prefer?: 'worker' | 'audio-worklet';
  /** Injectable for tests. */
  workerFactory?: () => Worker | undefined;
  audioContextFactory?: () => AudioContext | undefined;
}

export function createFrameClock(opts: FrameClockOptions): FrameClock;
```

- **Primary: Web Worker `setInterval` metronome (default `prefer: 'worker'`).**
  Dedicated workers run on their own thread and are the documented, battle-tested
  fix for hidden-tab canvas-capture freeze: a worker `setInterval(1000/fps)` posts
  a tick message that the main thread handles to drive `tick()` + `requestFrame()`.
  The worker script is **inlined as a string → `Blob` → object URL** and loaded
  via `new Worker(blobUrl)` so `@record-me/recorder` stays self-contained (no
  asset the consuming app must serve). The blob URL is revoked after the worker
  is constructed. (Worker creation from `blob:` is governed by `worker-src` /
  `script-src` CSP — see § 4.6, a required change.)
- **Alternative: AudioWorklet metronome (`prefer: 'audio-worklet'`).** Retained
  as a spike candidate (§ 4.3) and a fallback. The audio render thread runs
  independent of rAF/timer throttling, BUT silent audio is _not_ counted toward
  Chrome's background-throttling exemption, the `AudioContext` may be suspended
  under battery-saver, and it adds autoplay + sample-rate handling. Details in
  § 4.4. **Not the default** for those reasons.
- **Fallback: `requestAnimationFrame`.** Used when the preferred source is
  unavailable or fails to initialize (no `Worker`, worker construction throws,
  CSP blocks the blob, `AudioContext` unavailable, etc.). Foreground behavior is
  identical to today; background degrades to today's freeze — **no regression**.

`createFrameClock` resolves its backing source and presents a synchronous
`start/stop`. **Atomic source selection (no double-fire):** `start()` begins on
the rAF fallback immediately; when the preferred source becomes ready _and_
`start` is still active, the clock **synchronously** sets `kind`, cancels the
pending rAF (`cancelAnimationFrame`) **before** wiring the new source's callback,
and an `onTick` dispatch guard ignores any late rAF callback once `kind` has
flipped — so exactly one `onTick` fires per logical frame across the hand-off
(tested, § 8.1). `stop()` halts whichever source is active (clears the worker
interval / disconnects the worklet / cancels rAF) without tearing down the worker
or context (cheap pause/resume). `dispose()` terminates the worker / closes the
context and revokes any held resources.

**(b) Manual frame capture — `captureStream(0)` + `videoTrack.requestFrame()`.**
The composer switches off automatic sampling:

- `captureStream()` calls `canvas.captureStream(0)` (capture only on demand).
- After each composed `tick()`, the composer calls `requestFrame()` on the
  `CanvasCaptureMediaStreamTrack`, pushing exactly one frame per composed frame.
  This decouples capture from the (throttled) compositor.
- The `onPreviewReady` clone is a new `MediaStream` wrapping the **same** zero-fps
  `CanvasCaptureMediaStreamTrack` (`recorder.ts:526-528`); it receives the same
  pushed frames from each `requestFrame()` call and needs **no** separate
  `captureStream(fps)` preview stream.

> **`requestFrame()` feature-detection — correct browser:** Chrome 51+, Edge 79+,
> and **Safari 11+** implement `requestFrame()` on `CanvasCaptureMediaStreamTrack`.
> **Firefox** does _not_ expose it on the track (historically on the stream
> object), so on Firefox `track.requestFrame` is `undefined` and the composer
> falls back to `captureStream(fps)` auto-sampling for that track (foreground-correct;
> background may still freeze — acceptable per § 2.1). The earlier draft wrongly
> attributed the gap to "older Safari".

### 4.2 Auto-stop cap must be driven by the clock (not `setTimeout`)

`recorder.ts:582` arms the `maxDurationMs` cap with `setTimeout`. Background tabs
throttle `setTimeout` (clamped ≥1s, intensively throttled after 5min hidden).
**Before** this fix that was moot (video froze anyway); **after** it, video keeps
recording correctly while hidden, so a throttled `setTimeout` lets a 10/30/60-min
cap **overshoot materially** — larger files, blowing past the memory/IDB budget
the cap was sized for.

**Change:** drive the cap off the always-running `FrameClock`. The composer (or
recorder) counts elapsed time from tick cadence (or wall-clock delta sampled each
tick) and triggers `stop()` when `elapsed ≥ maxDurationMs`, bounding overshoot to
~one frame. `recorder.ts` is in Plan B's file set; add a test for the cap firing
from the clock while the `setTimeout` is throttled.

### 4.3 Spike-first (validation gate)

The single load-bearing unknown is whether an always-running clock +
`requestFrame()` actually keeps **distinct, advancing** frames flowing to
`MediaRecorder` while the tab is hidden, given that `MediaRecorder` encodes on a
**wall clock** (w3c/mediacapture-record#213) and that `requestFrame()` is a
documented hidden-tab failure on Firefox (bugzilla 1344524).

**Plan B's first task is a throwaway spike** that validates **both** the worker
and audio-worklet clocks:

- Record ~15s in a **production build** of the app (not `next dev`, not jsdom)
  in Brave, with a **frame counter / timestamp burned into the canvas** each
  tick.
- Background the record-me tab for ~5s mid-recording. Repeat with the laptop on
  **battery + energy-saver ON**, and with a **>5min** hidden interval (to trip
  Chrome intensive throttling).
- **Pass criteria:** the downloaded file shows the burned-in counter **advancing**
  through the hidden window (not a frozen/duplicated frame), the timeline is
  continuous, audio stays in sync, **and** `frameClock.kind` is the worker (or
  worklet) — _not_ `'raf'` — with **no CSP violation in the console** (catches a
  silent fallback, § 4.6).
- If the worker passes → ship it. If only the worklet passes → ship that. If
  **both** fail → escalate to WebCodecs (§ 9) before building further.

### 4.4 AudioWorklet alternative — caveats (only if chosen by the spike)

If the spike selects the audio-worklet path:

- **Structural silence:** the `FrameClock` owns a _private_ `AudioContext`; its
  worklet node is **never added to the `MediaRecorder` stream** (`recorder.ts`
  `combined` contains only composite video + `internal.acquired.mic`), so it
  cannot reach the recording **regardless of gain**. `gain = 0` separately keeps
  the user's speakers silent.
- **Autoplay:** `AudioContext` starts `suspended`; create/`resume()` it in the
  **synchronous part** of the Start click (before the `getUserMedia` await, which
  can consume transient activation). `resume()` is async — the worklet-upgrade
  wiring hangs off its resolution, not a synchronous running-state assumption;
  on reject, stay on the rAF/worker fallback.
- **Quantum math is illustrative, not hardcoded:** compute the post-message
  threshold inside the processor from the **live** `sampleRate` and count by
  `output[0][0].length` per `process()` (the 128-frame quantum is configurable /
  hardware-chosen and the device sample rate can change at runtime, e.g. switching
  to Bluetooth output). "≈12 quanta for 30fps @ 48kHz" is an example only.

### 4.5 Pause/resume & cleanup with the 0-fps track

- `pause()` → `composer.stop()` halts the clock (no ticks ⇒ no `requestFrame`).
  Harmless while `MediaRecorder` is paused.
- `resume()` → `composer.start()` restarts the clock; **the first tick after
  resume must call `requestFrame()` promptly** so the 0-fps track delivers a fresh
  frame immediately (the old `captureStream(fps)` auto-sampled and masked this).
  Tested.
- `composer.dispose()` → `frameClock.dispose()` (terminates worker / closes
  `AudioContext`, revokes any held blob URL), then existing track teardown.
  `recorder.ts:254` already calls `composer.dispose()` in `cleanupResources()`.
- **Init/teardown race:** worker/worklet init can complete _after_ `stop()`/
  `dispose()` (user clicks Start then Stop; React unmount double-invoke —
  `use-recorder.ts:221` disposes on unmount; early auto-stop). A `disposed` flag
  is set **synchronously** by `stop()`/`dispose()`; the async init continuation
  checks it first and, if disposed, revokes the blob URL, wires nothing, and
  returns. Tested (call `dispose()` between `start()` and the mocked init
  resolution; assert no `onTick` after dispose and the blob URL is revoked once).
- The 250ms duration-display `setInterval` (`recorder.ts:578`) remains
  background-throttled, but only affects the _displayed_ elapsed time — cosmetic,
  out of scope. (The _cap_ is no longer cosmetic — see § 4.2.)

### 4.6 CSP — required change (blocker)

The production CSP in `apps/web/next.config.ts` is
`script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com` with **no
`worker-src`** and **no `blob:`** (dev adds `'unsafe-eval'` only). `'self'` does
**not** cover a `blob:` URL. Constructing a worker (or loading an AudioWorklet
module) from a Blob URL is governed by `worker-src`, falling back to `script-src`
— so **today it is CSP-blocked**, `new Worker(blobUrl)` / `addModule` throws, and
the clock silently stays on rAF (the headline fix does nothing, while passing
every jsdom test).

**Required, in-scope for Plan B:**

1. Add `worker-src 'self' blob:` to the CSP array in `apps/web/next.config.ts`
   (and add `blob:` to `script-src` as belt-and-suspenders for browsers that fall
   back to `script-src`).
2. Update `docs/SECURITY.md` to document the `worker-src blob:` allowance and the
   dev `'unsafe-eval'` branch; reference `next.config.ts` as the **authoritative**
   CSP source (the doc's static block is currently incomplete).
3. The § 4.3 spike runs against the **built** app and asserts no CSP violation +
   `kind !== 'raf'`.

---

# Plan A — cover-crop + movable camera bubble (Fix 2 + Fix 3)

## 5 · Fix 2 — "cover" crop (camera stops stretching)

Replace the 4-arg `drawImage` with the **9-arg form using a centered square
source crop** in both draw routines. Helper:

```ts
/** Largest centered square in the source, mapped to a square dest (object-fit: cover). */
function coverSquare(vw: number, vh: number) {
  const side = Math.min(vw, vh);
  return { sx: (vw - side) / 2, sy: (vh - side) / 2, side };
}
```

- **PiP** (`drawCamPip`): inside the existing circular clip,
  `const { sx, sy, side } = coverSquare(cameraVideo.videoWidth, cameraVideo.videoHeight);`
  then `ctx.drawImage(cameraVideo, sx, sy, side, side, x, y, diameter, diameter)`.
- **`cam-only`** (`drawCamFull`): square canvas, so
  `ctx.drawImage(cameraVideo, sx, sy, side, side, 0, 0, width, height)`.
- **Guard:** if `videoWidth === 0 || videoHeight === 0` (frame not yet decoded),
  skip the draw this tick.
- **Camera constraints (best-effort hint only):** the cover-crop is the source of
  truth, so `CAM_PIP_VIDEO` (currently `640×480`) is nudged toward **higher
  resolution** for sharper large bubbles — `{ width: { ideal: 720 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }`.
  **Do not** add a hard `aspectRatio: 1` (risks `OverconstrainedError` on cameras
  that cannot do 1:1; `ideal` is best-effort and many webcams return 640×480 /
  1280×720 anyway). § 8.1 keeps asserting the **non-square** crop path
  (640×480 → `sx=80, sy=0, side=480`) since that is what real cameras return.

`LivePreview`'s `<video className="… object-contain">` is unchanged; the
composite itself is now correctly proportioned.

## 6 · Fix 3 — movable + resizable camera bubble

Locked decisions: **free-drag + snap to nearest corner**, **move anytime (setup &
live)**, **S/M/L presets**, **circle only**, **`screen+cam+cursor` only**.

### 6.1 Composer stays "dumb" — `setPip(state)`

```ts
export interface PipState {
  xNorm: number;   // normalized center X in canvas space, 0..1
  yNorm: number;   // normalized center Y in canvas space, 0..1
  diameter: number; // bubble diameter in canvas pixels
}
// added to Composer:
setPip(state: PipState): void;
```

`drawCamPip` reads the composer's current `pip` each tick:
`cx = pip.xNorm * width`, `cy = pip.yNorm * height`, `r = pip.diameter / 2`; clip
the circle at `(cx, cy, r)`, then cover-crop draw (§ 5) into the
`diameter × diameter` box centered at `(cx, cy)`.

**Default pip — single source of truth is the formula:** before any `setPip`, the
composer uses `size: 'md'` ⇒ `diameter = floor(0.22 × canvasHeight)` (≈ **238px**
@ 1080p — visually equivalent to today's 240px) at the bottom-right corner. The
old `PIP_DIAMETER = 240` constant is **replaced** by the size-preset computation
(§ 6.3); the bare `240` is removed.

### 6.2 Recorder handle + hook wiring (not a trivial passthrough)

- **`types.ts`:** add `PipState`; add `setCameraBubble(state: PipState): void` to
  `RecorderHandle` (currently `state/start/pause/resume/stop/salvage/dispose`).
- **`recorder.ts`:** implement `setCameraBubble` as a forward to
  `composer.setPip()` — no-op if not `screen+cam+cursor` or composer absent.
  (Distinct from `composer.dispose()`, which is already wired at `recorder.ts:254`.)
- **Seed on start (avoid first-frame flash):** the persisted/current
  `{corner,size}`→`PipState` is threaded through `RecorderOptions` so
  `createComposer` paints the correct bubble on the **first** frame. Without this,
  `setCameraBubble` is a no-op until the handle exists (post-`start()`), and the
  first recorded frames would show the `br/md` default before the UI re-pushes —
  a visible snap captured in the file. Tested: the first composed frame after
  `start` uses the persisted bubble, not the default.
- **`use-recorder.ts`:** add `setCameraBubble: (state: PipState) => void` to
  `UseRecorderApi` as a new `useCallback` delegating to
  `handleRef.current?.setCameraBubble`. The bubble `{corner,size}` **state is a
  UI concern** (localStorage + `CameraBubbleControl`), **not** derived from the
  engine — it lives in a UI-layer hook (`usePipState`), not in `useRecorder`.
  Only the imperative `setCameraBubble` command threads through the hook.

### 6.3 Geometry (UI layer — exact math)

The composer never sees corners/presets; the UI resolves them to `PipState`.

- **Size presets → diameter (whole pixels):**
  `diameter = Math.round(fraction × canvasHeight)`, `sm = 0.17`, `md = 0.22`,
  `lg = 0.30`, then clamped:
  `diameter = Math.min(diameter, Math.floor(0.40 × Math.min(canvasWidth, canvasHeight)))`.

  | resolution (canvas) | sm  | md  | lg  | clamp ceiling | clamp fires? |
  | ------------------- | --- | --- | --- | ------------- | ------------ |
  | 1080p (1920×1080)   | 184 | 238 | 324 | 432           | no           |
  | 720p (1280×720)     | 122 | 158 | 216 | 288           | no           |

  (The clamp is a safety net for non-standard resolutions; it does not fire at the
  two supported resolutions.)

- **Corner centers (normalized, per-axis — the 32px margin is in canvas pixels, so
  the inset is asymmetric on a 16:9 canvas):**
  - X inset = `(diameter/2 + 32) / canvasWidth`
  - Y inset = `(diameter/2 + 32) / canvasHeight`
  - `tl = (Xin, Yin)`, `tr = (1−Xin, Yin)`, `bl = (Xin, 1−Yin)`, `br = (1−Xin, 1−Yin)`.
  - **Worked example — `br` at `md` @ 1080p:** `x ≈ (119+32)/1920 ≈ 0.0786` from
    the right ⇒ `xNorm ≈ 0.921`; `y ≈ (119+32)/1080 ≈ 0.140` from the bottom ⇒
    `yNorm ≈ 0.860`.

- **Authoritative state is `{corner, size}`** (free coords are transient drag
  feedback). `diameter` + corner-center are **always recomputed from
  `{corner,size}` against the active resolution's canvas dimensions at both draw
  time and overlay-render time**, so a setup resolution change (Studio
  auto-switches 1080p↔720p when cap ≥ 30min) **deterministically relays** the
  bubble. The persisted value has no resolution field by design.

- **Helper files (named):** `apps/web/src/lib/pip-geometry.ts` (corner/diameter
  math), `apps/web/src/lib/use-video-content-rect.ts` (letterbox mapping),
  `apps/web/src/lib/pip-storage.ts` (localStorage).

### 6.4 `CameraBubbleControl` — the drag overlay

New `apps/web/src/app/record/_components/CameraBubbleControl.tsx`, absolutely
positioned over the preview surface (live `<video>` and the setup stage). Kept
**internal to `apps/web`** (not extracted to `@record-me/ui`) unless reused later.

- **Letterbox mapping.** `useVideoContentRect` computes the rendered composite
  rectangle from the element box + the **composite aspect ratio passed in
  explicitly** (16:9 for `screen+cam+cursor`, constant per session since
  resolution is locked at `start()`), recomputing on `ResizeObserver`. Pointer
  coords map into canvas-normalized space; the handle overlays exactly where the
  bubble is painted.
- **Drag.** `pointerdown` on the handle → `setPointerCapture` → `pointermove`
  updates a transient free `{xNorm,yNorm}`, pushed live to the composer via
  `setCameraBubble` (real-time feedback in preview **and** recording).
  `pointerup` → nearest corner (Euclidean to the four corner centers) → **ease**
  to it → commit `{corner,size}` → push resolved coords → persist.
- **Touch correctness:** `touch-action: none` on the handle (else touch drags
  scroll/zoom the page); handle `pointercancel` (treat as `pointerup` → snap to
  nearest); `pointer-events` on the **handle only**, not the full overlay, so
  Pause/Stop are not blocked.
- **Resize.** An S/M/L segmented control. Trigger: **visible while the bubble is
  hovered or the handle is focused**. Anchor: **8px above the bubble's top edge,
  flipping to 8px below when the bubble is near the top edge**. Selecting a preset
  recomputes `diameter`, re-resolves the current corner's center (so a larger
  bubble stays inset), pushes to composer, persists.
- **Animation:** CSS `transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)`
  (spring-out) on the handle for the corner ease; under
  `prefers-reduced-motion: reduce`, duration `0ms` (instant snap).
- **A11y:** handle is focusable (`role="button"`, `tabIndex=0`,
  `aria-label="Camera bubble position"`); arrow keys move between corners; size is
  a labelled radio group; defined focus order (handle → size radios) within the
  live controls.

### 6.5 Persistence

`localStorage` key **`record-me-pip`** (matches the existing `record-me-…`
convention; the existing key is `record-me-idb-sessions`). Value:
`{ v: 1, corner, size }` (versioned). Read on studio mount; default
`{ corner: 'br', size: 'md' }` (today's look). **Out-of-range** = `corner` not in
`tl|tr|bl|br` or `size` not in `sm|md|lg` → default. Read/write wrapped in
`try/catch` (private mode / Brave shields / quota / `localStorage` undefined),
falling back to the default — mirroring `session-registry`'s defensiveness. No
recording bytes are stored — privacy-safe (spec § 15). **Document the key in
`docs/SECURITY.md`** as a non-PII UI-preference store.

### 6.6 Analytics

Add two **enum-only, PII-free** events to `apps/web/src/lib/analytics.ts` using
the existing typed-wrapper pattern, emitted from the studio:

- `cameraBubbleMoved({ corner: 'tl'|'tr'|'bl'|'br', where: 'setup'|'live' })`
- `cameraBubbleResized({ size: 'sm'|'md'|'lg', where: 'setup'|'live' })`

`analytics.ts` joins Plan A's file set with a test. (Consistent with the §10.2
taxonomy discipline; corner/size enums carry no PII.)

## 7 · Setup vs live behavior

### 7.1 Live (during `recording`)

The overlay handle is draggable/resizable; mutations hit the composer in real time
and appear in both the preview and the recorded output (same canvas source). No
new permissions, no engine restart.

### 7.2 Mode gating

The control renders **only** when `mode === 'screen+cam+cursor'`. Absent in
`cam-only` (full-frame camera) and `screen+cursor` (no camera).

### 7.3 `paused`

With `captureStream(0)` the track produces frames only on `requestFrame()`, and
the clock is stopped while paused — so a `setPip` while paused is **not reflected
until resume** unless we push a frame. **Decision:** `setCameraBubble` issues a
single `requestFrame()` when called while `paused` so the move is visible
immediately (both preview and the paused composite). (This supersedes the earlier
draft's vague "composer canvas still reflects".)

### 7.4 Setup (placeholder bubble — confirmed decision)

To place the bubble _before_ recording without an early camera prompt, the setup
stage shows a **draggable placeholder** over a neutral stage that sets
`{corner,size}`; the real camera fills that position/size on record (honors the
privacy-first ethos — no `getUserMedia` until the user commits).

- **Stage:** pinned to the **same 16:9 composite aspect** the live preview uses
  (so a corner placed at setup maps to the live bubble); background `bg-surface-0`
  (DESIGN.md token); re-renders on resolution change.
- **Placeholder fill:** `bg-surface-2` circle + a person/camera SVG from the
  existing icon set; label `CAM` in the mono caption token (DESIGN.md). Final
  visual is produced via `frontend-design` during Plan A and verified against
  DESIGN.md.

## 8 · Testing strategy

Per `docs/TESTING.md`; recorder gate = **90% lines/functions/statements, 85%
branches**.

### 8.1 Recorder unit tests (jsdom)

- `composer.test.ts` (Plan A + B):
  - **Cover-crop math** — non-square source (640×480): assert `drawImage` is
    called with the **9-arg** signature and the centered source rect
    (`sx=80, sy=0, side=480`) for both PiP and `cam-only`.
  - **`setPip`** — clip/draw use the supplied `xNorm/yNorm/diameter`; default pip
    = `floor(0.22×height)` at br before any `setPip`.
  - **Zero-size guard** — `videoWidth=0` ⇒ no `drawImage`.
  - **`captureStream(0)` + `requestFrame`** — assert `captureStream` is called
    with `0`; a tick triggers `requestFrame()`; graceful fallback to
    `captureStream(fps)` when `requestFrame` is absent (Firefox path).
- New `frame-clock.test.ts` (Plan B), via injected `workerFactory` /
  `audioContextFactory` fakes — enumerate the branch matrix:
  - worker path: controllable worker posts a tick → `onTick` fires; `kind==='worker'`.
  - worklet path: fake `AudioWorkletNode` with a dispatchable port → `onTick`;
    `kind==='audio-worklet'`.
  - fallbacks: no `Worker` / construction throws / no `AudioContext` /
    `addModule` rejects / `resume()` rejects → `kind==='raf'`.
  - **upgrade atomicity:** rAF-pending + preferred-ready overlap ⇒ `onTick` fires
    **exactly once** per logical frame across the boundary.
  - **dispose race:** `dispose()` between `start()` and mocked init resolution ⇒
    no `onTick` after dispose; blob URL revoked exactly once; `close()` during a
    pending init does not throw unhandled.
  - `stop()` halts ticks; `dispose()` terminates worker / closes context.
  - Document which environment-branch lines are reachable via fakes vs which need
    `c8-ignore`, and get **gatekeeper sign-off** that the freeze _effect_ is
    manual-only (§ 8.4) while the clock _logic_ is unit-covered.
- `recorder.test.ts`: `setCameraBubble` forwards to composer / safe no-op in
  non-A modes + before `start()`; initial pip seed paints first frame (§ 6.2);
  **cap fires from the clock** while `setTimeout` is throttled (§ 4.2);
  `requestFrame` fires on the first tick after `resume()` (§ 4.5).
- Mocks: extend `test/mocks/` with a controllable `Worker`, `AudioWorkletNode` /
  `audioWorklet.addModule`, and `CanvasCaptureMediaStreamTrack.requestFrame` on
  the canvas mock.

### 8.2 UI unit tests (`apps/web`)

- `pip-geometry`: size→diameter (both resolutions, rounding, clamp), per-axis
  corner centers (worked example), nearest-corner selection.
- `use-video-content-rect`: letterbox mapping (wide vs tall element boxes) given
  an explicit composite aspect.
- Resolution change after positioning ⇒ recomputed diameter; handle overlay
  matches composer pip.
- `pip-storage`: default, versioned round-trip, malformed/out-of-range fallback,
  `try/catch` on access exceptions.
- `CameraBubbleControl`: renders only in `screen+cam+cursor`; keyboard corner
  movement; reduced-motion path; `touch-action: none`; `pointercancel`.

### 8.3 E2E (`record-me-e2e`, Playwright)

- `screen+cam+cursor` (fake device streams via `--use-fake-device-for-media-stream`):
  start, drag the bubble to a different corner, assert committed corner +
  persisted `record-me-pip`; reload → bubble restores. Add a touch-emulation pass
  for the drag.

### 8.4 Manual verification (Playwright MCP + real browser)

- **Background-freeze fix:** verified per the § 4.3 spike (built app, burned-in
  counter, battery-saver, >5min hidden) — cannot be asserted in jsdom/headless.
- Visual: camera undistorted in PiP and `cam-only`; bubble drag/snap/resize feel;
  console clean. macOS **Safari 14.1+** included as a plausible secondary win
  (AudioContext background suspension was fixed in WebKit in 2022; `requestFrame`
  supported since Safari 11). **iOS** is out of scope (no `getDisplayMedia`).

## 9 · WebCodecs escalation (Plan B fallback)

If the § 4.3 spike fails for **both** clock candidates: composite in a Web Worker
via `MediaStreamTrackProcessor` → `OffscreenCanvas` → output a track with
`MediaStreamTrackGenerator` (or encode directly with `VideoEncoder`). Driven by
source-frame arrival, so nothing throttles it. **Chromium-only** (Safari/Firefox
lack `MediaStreamTrackGenerator` — confirmed) → keeps the rAF path as the
non-Chromium fallback; large rewrite of composer + encoder. Documented so the
path is known; not built unless the spike forces it.

## 10 · Files touched

### Plan A (cover-crop + bubble) — no spike dependency

| File                                                                                      | Change                                                                                                       |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `packages/recorder/src/composer.ts`                                                       | cover-crop in `drawCamPip`/`drawCamFull`; `setPip()` + dynamic pip; zero-size guard; default pip via formula |
| `packages/recorder/src/acquire.ts`                                                        | `CAM_PIP_VIDEO` → higher-res hint (no hard `aspectRatio:1`)                                                  |
| `packages/recorder/src/types.ts`                                                          | `PipState`; `RecorderHandle.setCameraBubble`; initial-pip option on `RecorderOptions`                        |
| `packages/recorder/src/recorder.ts`                                                       | `setCameraBubble` passthrough (new); seed initial pip into composer                                          |
| `apps/web/src/hooks/use-recorder.ts`                                                      | `setCameraBubble` command on `UseRecorderApi`                                                                |
| `apps/web/src/lib/pip-geometry.ts`, `use-video-content-rect.ts`, `pip-storage.ts` _(new)_ | geometry, letterbox mapping, versioned localStorage                                                          |
| `apps/web/src/app/record/_components/CameraBubbleControl.tsx` _(new)_                     | drag/snap/resize overlay + setup placeholder                                                                 |
| `apps/web/src/app/record/_components/Studio.tsx` / `LivePreview.tsx`                      | mount control, `usePipState`, share content rect, seed pip on start                                          |
| `apps/web/src/lib/analytics.ts`                                                           | `cameraBubbleMoved` / `cameraBubbleResized`                                                                  |

### Plan B (background freeze) — spike-first

| File                                                   | Change                                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/recorder/src/frame-clock.ts` _(new)_         | `FrameClock`: worker primary + audio-worklet alternative + rAF fallback; inlined worker/worklet via Blob URL; atomic upgrade; dispose-race guard |
| `packages/recorder/src/composer.ts`                    | inject `FrameClock`; `captureStream(0)` + `requestFrame`; resume-first-frame                                                                     |
| `packages/recorder/src/recorder.ts`                    | cap driven by clock (replace throttled `setTimeout` reliance)                                                                                    |
| `packages/recorder/src/test/setup.ts` + `test/mocks/*` | `Worker`, `AudioWorklet*`, `requestFrame` mocks                                                                                                  |
| `apps/web/next.config.ts`                              | add `worker-src 'self' blob:` (+ `blob:` on `script-src`)                                                                                        |
| `docs/SECURITY.md`                                     | document `worker-src blob:`, dev `unsafe-eval`; point at `next.config.ts` as authoritative                                                       |

### Both

`docs/RECORDING.md` (FrameClock, `setPip`/`setCameraBubble`, cover-crop, cap),
`docs/FRONTEND.md` (new component + hooks), `docs/DESIGN.md` (bubble control +
placeholder), `docs/PROGRESS.md`, `docs/SECURITY.md` (localStorage key).

## 11 · Risks & mitigations

| Risk                                                                                                                                                    | Mitigation                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `requestFrame()` doesn't deliver advancing frames in a hidden tab on a target browser (MediaRecorder wall-clock dupes the last frame; known FF failure) | Spike-first gate validating **distinct advancing frames** in a built app (§ 4.3); WebCodecs escalation (§ 9)                 |
| Production CSP blocks the worker/worklet Blob URL → silent rAF fallback                                                                                 | **Required** `worker-src 'self' blob:` change + spike asserts `kind !== 'raf'` and no CSP violation (§ 4.6)                  |
| Worker timers intensively throttled after >5min hidden / under battery-saver                                                                            | Spike tests both conditions and both clock candidates; escalate to WebCodecs if both fail                                    |
| (audio-worklet path) silent `AudioContext` suspended in background / autoplay-blocked                                                                   | Worker is the default (avoids this); if worklet chosen: resume on gesture, rAF fallback on reject; spike under battery-saver |
| `maxDurationMs` cap overshoots once video records correctly while hidden                                                                                | Drive the cap off the always-running `FrameClock`, not `setTimeout` (§ 4.2)                                                  |
| Init/teardown race resurrects a disposed clock                                                                                                          | Synchronous `disposed` flag checked in the async init continuation (§ 4.5)                                                   |
| rAF→preferred upgrade double-fires ticks                                                                                                                | Atomic source switch + `onTick` guard (§ 4.1)                                                                                |
| Resolution change relays the bubble unexpectedly                                                                                                        | Always recompute diameter/center from `{corner,size}` at draw + overlay time; tested (§ 6.3)                                 |
| First recorded frames show the default bubble                                                                                                           | Seed pip through `start()`/`RecorderOptions` (§ 6.2)                                                                         |
| `aspectRatio:1` camera constraint → `OverconstrainedError`                                                                                              | Higher-res `ideal` hint only; cover-crop is source of truth (§ 5)                                                            |
| Touch drag scrolls the page / mid-drag interruption                                                                                                     | `touch-action:none`, `pointercancel`, handle-only pointer-events (§ 6.4)                                                     |
| New untestable clock branches drop branch coverage                                                                                                      | Injected fakes cover most branches; enumerated `c8-ignore` list + gatekeeper sign-off (§ 8.1)                                |

## 12 · Definition of done (10/10)

- Build, typecheck, lint, all unit tests green; recorder ≥ 90% lines/functions/
  statements, ≥ 85% branches.
- **Plan B:** spike confirmed (built app, advancing burned-in counter through a
  hidden window, on battery-saver, >5min) with `kind !== 'raf'` and no CSP
  violation; final manual Brave pass: tab-switch ~5s → continuous video + synced
  audio; cap stops on time while backgrounded.
- **Plan A:** camera undistorted in PiP and `cam-only`; bubble free-drag +
  corner-snap, S/M/L resize, live + setup, persists across reload; keyboard +
  touch accessible; reduced-motion respected; setup placeholder matches DESIGN.md.
- E2E green (incl. touch pass); console clean.
- Docs updated (RECORDING, FRONTEND, DESIGN, SECURITY, PROGRESS); GH issue/epic
  (opened before plan dispatch) closed.
