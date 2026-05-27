# Recording pipeline

Authoritative reference for the `@record-me/recorder` engine. Source of truth
for the contract: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 7.

## Five stages

1. **Acquire** — `getDisplayMedia` and/or `getUserMedia` per mode.
2. **Composite** — 2D canvas, `requestAnimationFrame` draws screen → cam PiP
   → cursor ripples.
3. **Stream** — `canvas.captureStream(fps)` + `AudioContext` audio merge.
4. **Encode** — `MediaRecorder` with negotiated mimeType, 30 fps, 4 Mbps,
   chunks every 1 s.
5. **Deliver** — concat → Blob → object URL → anchor download → revoke URL.

## State machine

```
idle → requesting-permissions → recording ⇄ paused → finalizing → ready → idle
                                                      ↘ error
```

`error` is reachable from any state; recovery = reset + re-acquire.

## Codec negotiation

Walked in `supportedMimeType()`:

1. `video/mp4;codecs=avc1.42E01E,mp4a.40.2`
2. `video/mp4;codecs=h264,aac`
3. `video/webm;codecs=vp9,opus`
4. `video/webm;codecs=vp8,opus`

MP4 first for universal playback (Safari, QuickTime, social platforms). MP4 via
MediaRecorder is recent (Chrome / Firefox added it in 2024–2025); older browsers
silently fall back to WebM — this is fine.

## Caps + memory strategy

| `maxDurationMs` (cap) | Storage                           | Quality default             |
| --------------------- | --------------------------------- | --------------------------- |
| ≤ 10 min              | in-memory array                   | 1080p @ 4 Mbps              |
| > 10 min, ≤ 30 min    | in-memory or IndexedDB (auto)     | 1080p @ 4 Mbps              |
| ≥ 30 min              | IndexedDB spill                   | 720p @ 2 Mbps (overridable) |
| > 10 min always       | UI shows warning at cap selection | —                           |

Hard cap: 60 min. Recorder auto-stops 100 ms before the cap.

## Cursor highlights — honest scope

Web sandboxing prevents observing mouse events outside the record-me tab.
Click ripples only work for in-tab clicks. The `/record` UI says so explicitly.
v2 will ship a Chrome extension for arbitrary-surface highlights.

## Public API

See the TypeScript declarations in `packages/recorder/src/index.ts` (kept in
sync with spec § 7.6).

## Testing

Unit tests run in jsdom with `MediaRecorder` and `navigator.mediaDevices.*`
mocked on `globalThis`. E2E tests use Chromium fake-device flags. See
`docs/TESTING.md`.
