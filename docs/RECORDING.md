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

| `maxDurationMs` (cap) | `strategy: 'auto'` resolves to | Notes                                                    |
| --------------------- | ------------------------------ | -------------------------------------------------------- |
| ≤ 10 min              | in-memory (`MemoryChunkStore`) | Default fast path                                        |
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
- `RecorderError` class + `RecorderErrorKind` union + `PermissionSubject` type

### RecorderOptions callbacks (Phase 4+)

Two new optional callbacks on `RecorderOptions`:

- **`onResult?: (result: RecordingResult) => void`** — Fired with the finished
  recording when `stop()` completes. Critically, this also fires on auto-cap
  stop (when `maxDurationMs` is reached), where the return value of `stop()` is
  discarded. Consumers must wire through `onResult` to reliably receive both
  manual and automatic completions.

- **`onPreviewReady?: (stream: MediaStream) => void`** — Fired once immediately
  after `start()` reaches `recording` state, delivering a **video-only**
  composite stream (no audio) for live preview mirrors. The stream is a fresh
  `MediaStream` of the composite video tracks from `composer.captureStream()`,
  safe for `<video srcObject>` binding.

### RecorderError error subject

When an error originates from a device-specific permission or track failure,
the `RecorderErrorLike` shape now includes:

- **`subject?: PermissionSubject`** — The device this error refers to:
  `'screen' | 'camera' | 'mic'`. Set by `mapDomException()` based on which
  track acquisition failed. Allows consumers to surface device-specific error
  messaging (e.g., "need camera access" vs. "screen capture denied"). Always
  set for `'permission-denied'` and `'track-failed'` kinds; `undefined` for
  other error kinds.

## Testing

Unit tests run in jsdom with `MediaRecorder`, `MediaStream`,
`navigator.mediaDevices`, `HTMLCanvasElement.{getContext, captureStream}`,
and `AudioContext` mocked globally in `src/test/setup.ts`. IndexedDB uses
`fake-indexeddb/auto`. Coverage gate is 90% lines / functions / branches /
statements per spec § 12.3.

### Testing gotcha: fake-indexeddb Blob polyfill

`fake-indexeddb` shadows the global `Blob` with a polyfill missing `arrayBuffer()`.
Our `IndexedDbChunkStore` serializes chunks as `ArrayBuffer` (via
`FileReader.readAsArrayBuffer`) before storing and reconstructs `Blob` on
assemble. Future code that needs to round-trip `Blob`s through IDB in tests
needs the same workaround.
