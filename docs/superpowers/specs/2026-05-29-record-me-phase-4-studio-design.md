# Phase 4 · Studio (`/record`) — design

**Status:** approved (brainstorm) · **Date:** 2026-05-29 · **Epic:** #4
**Parent spec:** [`2026-05-27-record-me-design.md`](2026-05-27-record-me-design.md) §§ 6, 7, 10, 14
**Supersedes for `/record`:** the Phase 1 placeholder at `apps/web/src/app/record/page.tsx`

## 1 · Summary

Phase 4 ships **the studio** — the `/record` surface that turns the
framework-agnostic `@record-me/recorder` engine (Phase 3) into a working,
end-to-end recording instrument. This is the first phase where the app becomes
usable: pick a mode, set a cap, grant permissions once, watch a live composite
preview, stop, review the recorded video, and download it to disk. No accounts,
no upload — every byte stays in the browser.

The studio is a single **persistent `StudioShell`** whose body and footer
controls evolve through `setup → live → review`. The shell never unmounts; only
its contents change.

## 2 · Goals & non-goals

### 2.1 Goals (Phase 4)

- A `useRecorder()` React hook wrapping `createRecorder()` with React-friendly
  reactive state.
- The full record → review → download loop across all three modes.
- Pause/resume in the live UI.
- Faithful **live composite preview** (shows exactly what is being recorded —
  screen, camera PiP, cursor ripples, square crop — not raw source tracks).
- Core error surface + device-aware gating (permission-denied,
  unsupported-browser, mid-recording track failure, mobile/unsupported mode
  gating).
- The analytics layer (`lib/analytics.ts`) wired and firing all seven studio
  events.
- E2E coverage: Mode C live smoke; Modes A/B capability-gated UI smoke.
- Recapture `.github/assets/readme/studio.png` from the real `/record`.

### 2.2 Non-goals (deferred)

- **Memory-pressure banner + IndexedDB-fallback toast** (§14 of parent spec).
  These need new engine signals (`onMemoryPressure` / `onStorageFallback`);
  deferred to a later polish pass.
- **`/record/opengraph-image.tsx`** — Phase 5 (SEO surface).
- **Post-recording editor / cropping / filters** — v2.
- **Cursor highlights for arbitrary surfaces** — v2 (Chrome extension).
- **Marketing nav / global chrome** — Phase 5. `/record` uses a minimal local
  layout only.

## 3 · The locked flow

One persistent `<StudioShell>` from first paint to download. Header, body, and
footer evolve per phase:

```
┌─ studio · ready ──────────────── ● idle ─┐   ┌─ ● 00:42 · 12.4 MB ── screen+cursor ─┐   ┌─ ready · 00:42 ── 18.1 MB · mp4 ─┐
│  Choose your *composition*.              │   │                                      │   │                                  │
│  ┌────────┐ ┌════════┐ ┌────────┐        │ → │     [ live composite canvas ]        │ ⇄ │     [ recorded <video> ▶ ]       │
│  │ ModeA  │ ║ ModeB  ║ │ ModeC  │        │   │                              (cam)   │   │                                  │
│  └────────┘ ╚════════╝ └────────┘        │   │                                      │   │                                  │
├─ cap 10 min ▾ · 1080p ── [▶ Start] ──────┤   ├─ live preview ──── [⏸] [■ stop] ─────┤   ├─ [↻ re-record] ──── [⤓ Download]─┤
└──────────────────────────────────────────┘   └──────────────────────────────────────┘   └──────────────────────────────────┘
        setup (triptych in shell)                          live (same shell)                       review (same shell)
```

## 4 · Engine additions (`@record-me/recorder`)

Two **additive, backward-compatible** optional callbacks. No existing public
signature changes; the engine keeps the 90% coverage gate.

### 4.1 `onResult` — closes the auto-stop result gap

**Problem:** when a recording hits its cap, the engine's internal timer calls
`handle.stop()` itself (`recorder.ts` auto-stop timeout) and **discards the
returned `RecordingResult`** (`void handle.stop().catch(...)`). On a
user-initiated stop the consumer gets the result from `stop()`'s return value;
on an auto-stop the consumer only sees `state → 'ready'` with no blob, URL, or
filename — the review pane has nothing to show.

**Fix:** add an optional callback fired inside `stop()` immediately before the
result is returned, so **both** stop paths deliver the result through one
channel.

```ts
// types.ts → RecorderOptions
onResult?: (result: RecordingResult) => void;
```

```ts
// recorder.ts → stop(), refactor the inline return to:
const result: RecordingResult = {
  blob,
  url,
  mimeType,
  durationMs,
  bytes,
  suggestedFilename,
  release,
};
opts.onResult?.(result);
return result;
```

`stop()` still returns the result (no breaking change). The hook reads the
result **exclusively via `onResult`** and ignores `stop()`'s return, so
user-stop and auto-stop share one code path.

### 4.2 `onPreviewReady` — exposes the live composite for preview

**Problem:** the `RecorderHandle` exposes neither the composite canvas nor its
stream — the composer is fully internal. A faithful live preview needs the
composited frames (PiP, cursor ripples, square crop), not raw source tracks.

**Fix:** add an optional callback fired once in `start()` after the composite
stream is captured, delivering a **video-only** `MediaStream` (no audio — so a
`<video>` mirror never echoes the mic).

```ts
// types.ts → RecorderOptions
onPreviewReady?: (stream: MediaStream) => void;
```

```ts
// recorder.ts → start(), after composer.captureStream():
const videoStream = internal.composer.captureStream();
// ... existing combined-stream + encoder wiring ...
opts.onPreviewReady?.(new MediaStream(videoStream.getVideoTracks()));
```

The consumer attaches the stream to `<video srcObject>`. When the recorder
pauses, the composer's RAF halts, so the preview naturally freezes on the last
frame — matching the paused visual state.

### 4.3 Tests (keep 90% gate)

- `onResult` fires with the assembled result on **manual** stop.
- `onResult` fires with the assembled result on **auto-stop** (cap reached).
- `onPreviewReady` fires once with a video-only stream after `start()`.

## 5 · `useRecorder` hook

`apps/web/src/hooks/use-recorder.ts` — `'use client'`. Thin reactive wrapper.

```ts
interface UseRecorder {
  state: RecorderState; // raw engine state
  durationMs: number; // onDurationTick (250ms cadence)
  bytes: number; // onBytesTick
  previewStream: MediaStream | null; // onPreviewReady → LivePreview
  result: RecordingResult | null; // onResult — single source for user-stop AND auto-stop
  error: RecorderErrorLike | null; // onError
  start: (opts: RecorderOptions) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void; // calls recorder.stop(); ignores return (relies on onResult)
  reset: () => Promise<void>; // await result.release() (revoke URL + wipe IDB) → back to setup
}
```

Behavioral contract:

- **Lazy creation.** The recorder is created inside `start(opts)` — an event
  handler, not an effect — so React StrictMode's double-invoke can't
  double-create it. `opts` (mode, cap, resolution) are known only after setup.
- **Reactive state.** The hook subscribes the engine callbacks to React state
  setters. `onDurationTick` (every 250ms) is the highest-frequency update and
  is acceptable.
- **Unmount cleanup.** A `useEffect` cleanup calls `dispose()` on unmount — if
  the user navigates away mid-record, tracks stop (camera/mic light off) and
  IDB chunks are wiped (privacy contract, parent spec §15).
- **`reset()` ("record another").** `RecordingResult.release()` is **async**
  (`Promise<void>`) in the real implementation; `reset()` awaits it (revokes
  the object URL, wipes IDB, returns the engine to `idle`), clears local hook
  state, and returns the studio to `setup`.

## 6 · Studio components & UI state machine

All under `apps/web/src/app/record/_components/` (route-colocated; the
underscore prefix keeps the directory out of the route tree).

| Component              | Responsibility                                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Studio.tsx`           | `'use client'` orchestrator. Owns `useRecorder` + derived UI phase. Renders one persistent `<StudioShell>`; swaps header/body/footer per phase.                                                    |
| `ModePicker.tsx`       | The `ModeCard` triptych. Selecting a card sets the chosen mode (amber `accent` ring) and fires `mode_selected`.                                                                                    |
| `CapSelector.tsx`      | Cap select (10/20/30/45/60) + resolution toggle (720p/1080p) + >10m warning + device gating.                                                                                                       |
| `LivePreview.tsx`      | The composite mirror — `<video muted autoplay playsInline srcObject={previewStream}>` in the shell body. (The REC dot, mono timer, and MB readout live in the shell header, rendered by `Studio`.) |
| `ReviewPane.tsx`       | `<video src={result.url} controls>` + Download anchor + "Discard & re-record".                                                                                                                     |
| `ErrorState.tsx`       | Editorial error cards keyed by `RecorderErrorKind`.                                                                                                                                                |
| `UnsupportedState.tsx` | Browser-unsupported gate + supported-browser list.                                                                                                                                                 |

### 6.1 UI phase machine (derived from engine state + result presence)

```
setup ──Start──▶ requesting ──▶ live ⇄ paused ──Stop / auto-cap──▶ finalizing ──▶ review
  ▲                  │                 │                                              │
  │                  └── error ◀───────┴── track-failure → "Save partial recording" ─┘
  └──────────── reset ("record another") ◀── review ────────────────────────────────┘

capability gate (probeCapabilities, client-side on mount) ── fail ──▶ unsupported
```

`page.tsx` stays an RSC (`export const metadata`) and renders the single
`'use client'` `<Studio>` leaf, per Next.js RSC discipline.

## 7 · Setup details

- **Mode picker** — the `ModeCard` triptych, reusing the composition from
  `/dev/previews/modes`. Eyebrows: "A · the full recital", "B · just the work",
  "C · talking head".
- **Cap selector** — 10 (default) / 20 / 30 / 45 / 60 minutes. Selecting > 10m
  surfaces the parent-spec §7.5 warning verbatim: _"Longer recordings depend on
  your machine. Download and processing may take a while. We recommend 10
  minutes for the smoothest result."_
- **Resolution auto-step** — when the cap ≥ 30 min, the default drops to
  720p / 2 Mbps; a 720p/1080p toggle lets the user override.
- **Device gating** — on mobile or when `getDisplayMedia` is absent, Modes A & B
  are disabled with a calm note; Mode C (camera only) stays available.
- **Cursor note** — for Modes A/B, surface the §7.3 note verbatim: _"Click
  highlights work when you record this tab. For highlights in other apps,
  install the record-me extension (coming soon)."_

## 8 · Error surface & capability gating (core + device gating)

`probeCapabilities()` runs client-side on mount. If `MediaRecorder`,
`getDisplayMedia`, or `getUserMedia` is missing → `UnsupportedState` with the
"Try Chrome, Edge, Firefox, or Arc" list (fires `browser_unsupported`).

Mid-flow, `onError` maps `RecorderErrorKind` → editorial `ErrorState`:

| Kind                                | UI                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `permission-denied`                 | "We need [kind] access to record this mode" + **Try again**                                                   |
| `unsupported-browser`               | Falls through to `UnsupportedState`                                                                           |
| `track-failed` (mid-recording)      | Keep what we have · **Save partial recording** + **Start over** (fires `recording_stopped { partial: true }`) |
| `recorder-failed` / `invalid-state` | Generic calm "Something interrupted the recording" + **Start over**                                           |

**Deferred** (need new engine signals): memory-pressure banner, IDB-fallback
toast.

## 9 · Analytics (`lib/analytics.ts`, wired in Phase 4)

Typed wrapper over `@vercel/analytics` `track()`. Zero PII (parent spec §10.2,
§15). Emit points:

| Event                       | Properties                                           | Emit point                                                                                                                 |
| --------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `mode_selected`             | `mode`                                               | Mode card selected in picker                                                                                               |
| `recording_started`         | `mode, resolution, cap_minutes`                      | Engine reaches `recording`                                                                                                 |
| `recording_stopped`         | `mode, duration_seconds, bytes, mime_type, partial?` | Engine reaches `ready` (`partial: true` when an error triggered the stop)                                                  |
| `recording_downloaded`      | `mode, duration_seconds, bytes, mime_type`           | Download click                                                                                                             |
| `permission_denied`         | `kind: 'screen' \| 'camera' \| 'mic'`                | `onError` kind `permission-denied` (kind best-effort inferred from mode — the engine does not surface which device failed) |
| `browser_unsupported`       | `feature, ua_browser`                                | Capability gate                                                                                                            |
| `cursor_highlight_disabled` | `reason: 'opt-out' \| 'not-record-me-tab'`           | `opt-out` on user toggle; `not-record-me-tab` best-effort                                                                  |

A small `lib/capabilities.ts` derives `ua_browser` (UA → browser name) and the
device-gating predicates, layered on top of the engine's `probeCapabilities()`.

## 10 · Privacy

Reaffirms parent spec §15: bytes never leave the browser; the studio offers the
Blob via a download anchor only. Unmount/`reset()`/`dispose()` stop all tracks
and wipe IDB. No new cookies, no new network calls beyond the existing
cookieless Vercel Analytics/Speed Insights.

## 11 · Testing strategy

- **Unit (recorder):** the three engine-addition tests in §4.3. Maintains the
  90% lines/functions/branches/statements gate.
- **Component (Vitest + jsdom):** `useRecorder` phase transitions; setup gating
  (cap warning, resolution auto-step, device gating); error→UI mapping;
  analytics emit points with a mocked `track`.
- **E2E (Playwright, `record-me-e2e`):** Mode C with
  `--use-fake-device-for-media-stream` (`getUserMedia` auto-grants) — full
  start → stop → download smoke. Modes A/B `getDisplayMedia` cannot be
  auto-granted headlessly, so they get **capability-gated UI smoke** (picker,
  device gating, error states), not a live capture. This limitation is stated
  explicitly rather than faked.

## 12 · Task decomposition

| #   | Task                                                    | Owner                |
| --- | ------------------------------------------------------- | -------------------- |
| 1   | Recorder: `onResult` + `onPreviewReady` (+ tests)       | staff                |
| 2   | `useRecorder` hook (+ tests)                            | sr-frontend          |
| 3   | `lib/analytics.ts` + `lib/capabilities.ts` (+ tests)    | sr-frontend          |
| 4   | Studio components + persistent-shell flow               | sr-frontend          |
| 5   | Error / unsupported / device-gating states              | sr-frontend          |
| 6   | E2E (Mode C live; A/B gated UI)                         | e2e                  |
| 7   | Recapture `studio.png` from real `/record`; docs update | sr-frontend / scribe |

Task 1 (engine) is a dependency for Tasks 2 and 4 (preview + result delivery).

## 13 · Risks & open questions

- **`permission_denied` device kind is best-effort.** The engine's
  `RecorderError` carries only `permission-denied`, not which device. The studio
  infers `kind` from the selected mode. A precise mapping would need the engine
  to enrich acquisition errors — out of Phase 4 scope.
- **`cursor_highlight_disabled { not-record-me-tab }` is best-effort.** A web
  app cannot reliably know which surface the user picked in the
  `getDisplayMedia` dialog, so the `not-record-me-tab` branch is approximate.
- **MP4-on-Safari preview.** The recorded `<video>` in review relies on the
  browser playing its own `MediaRecorder` output, which it can; the live
  preview uses `canvas.captureStream`, also broadly supported.

## 14 · References

- Parent spec: [`2026-05-27-record-me-design.md`](2026-05-27-record-me-design.md)
  §§ 6 (product surface), 7 (recording pipeline), 10 (analytics), 14 (errors),
  15 (privacy)
- Engine: `packages/recorder/src/{recorder,types,composer}.ts`
- Primitives: `@record-me/ui` `StudioShell`, `ModeCard`, `RecDot`, `MetaChip`
- Existing mockup: `apps/web/src/app/dev/previews/studio/page.tsx`
- Docs to update on completion: `docs/FRONTEND.md` (route + hook + components),
  `docs/RECORDING.md` (new callbacks), `docs/PROGRESS.md`, `docs/SEO.md` (if
  `/record` metadata changes)
