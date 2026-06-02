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

### Phase 6 · Storage resilience

- **FallbackChunkStore wrapper** — If `IndexedDbChunkStore.append()` fails
  (quota exceeded, IDB unavailable, etc.), the store automatically falls back
  to in-memory buffering and fires `onStorageFallback()` once. The rest of the
  session buffers in RAM. Spec § 14.

- **Memory-pressure detection** — After each chunk is appended, if the buffered
  chunk count ≥ `memoryPressureChunkThreshold` (default 600), fire
  `onMemoryPressure()` once to allow the UI to surface a warning. Subsequent
  chunks do not re-fire. Spec § 14.

- **Stale IndexedDB sweep (Safari-safe)** — On `start()`, call
  `sweepRegisteredSessions()` to clean up IDB databases from prior sessions
  that crashed or were terminated before calling `release()`. Uses a
  localStorage-backed session registry (not `indexedDB.databases()`, which is
  unavailable in Safari). Entries older than 1h are deleted; if deletion fails
  (blocked/errored), the entry is retained and retried on the next sweep. When
  `IndexedDbChunkStore.clear()` is blocked, call `markStale()` to force the
  entry to stale (ts=0) so it is swept on the next start(). Spec § 15.5, issue
  #60.

## Mid-recording track failure recovery (Phase 6)

When a media track (screen, camera, mic) ends unexpectedly during recording, the
recorder detects the end event, transitions to the `'error'` state with kind
`'track-failed'`, and **keeps the buffered chunks in storage**. This allows the
`salvage()` API to assemble whatever was captured before the interruption:

1. **Detection** — Each track is wired with an `'ended'` listener. When fired,
   call `handleTrackFailure()`, which stops the encoder (final flush), fires
   `onError` with kind `'track-failed'`, and transitions to `'error'`.
2. **Call `salvage()`** — From the error state, the consumer can call
   `recorder.salvage()` to assemble a partial blob from the buffered chunks.
   Returns a `RecordingResult { blob, partial: true, ... }`. If called outside
   of a `'track-failed'` error, rejects with `invalid-state`.
3. **Encoder state** — The encoder is stopped (no new chunks are written), so
   calling `salvage()` is safe and does not race with encoding.
4. **Privacy on `release()`** — The partial result's `release()` call clears the
   IDB store, respecting the privacy contract (spec § 7.2, § 15). Spec § 14.

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

Optional callbacks on `RecorderOptions`:

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

- **`onStorageFallback?: () => void`** (Phase 6) — Fired once when IndexedDB
  chunk writes fail and the engine degrades to in-memory storage. Allows the
  UI to warn the user that buffering may be bounded by available RAM. See spec
  § 14.

- **`onMemoryPressure?: () => void`** (Phase 6) — Fired once when the buffered
  chunk count crosses `memoryPressureChunkThreshold`. Allows the UI to
  surface a banner ("your recording is getting large"). See spec § 14.

- **`memoryPressureChunkThreshold?: number`** (Phase 6) — Chunk count that
  triggers `onMemoryPressure`. Defaults to `MEMORY_PRESSURE_CHUNK_THRESHOLD =
600`. See spec § 14.

- **`onCursorScopeMissed?: () => void`** (Phase 6) — Fired once after `start()`
  in a screen mode (A or B) when `cursorHighlights` is on but the captured
  surface is not a browser tab (best-effort, requires `navigator.mediaDevices.getDisplayMedia()`
  system picker result). Allows the UI to notify the user that cursor ripples
  will not render. See spec § 7.3, § 10.2.

### RecorderHandle.salvage() (Phase 6)

Assemble a partial `RecordingResult` from buffered chunks after a mid-recording
track failure:

```typescript
salvage(): Promise<RecordingResult>
```

Valid only when the recorder is in the `'error'` state **and** the error kind is
`'track-failed'` (e.g., a stream unexpectedly stopped mid-recording). Rejects
with `invalid-state` otherwise. Returns a `RecordingResult` with `partial: true`
flag. The result's `blob` contains whatever was successfully encoded before the
failure; bytes and duration reflect the partial capture. Spec § 14.

### RecordingResult fields (Phase 6)

- **`partial?: boolean`** — True when this recording was salvaged from a
  mid-session track failure via `salvage()`. Allows the UI to disambiguate
  between an intentionally stopped, complete recording vs. an interrupted,
  partial one. Spec § 14.

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
