---
name: phase-3-patterns
description: Technical patterns and gotchas discovered during Phase 3 recorder implementation
metadata:
  type: pattern
  owner: record-me-scribe
---

# Phase 3 Recorder · Technical Patterns

## fake-indexeddb Blob polyfill workaround

`fake-indexeddb` v6 shadows the global `Blob` constructor with a polyfill that
lacks `arrayBuffer()` method. When round-tripping `Blob`s through IDB in tests:

**Solution:** Serialize to `ArrayBuffer` before storing via `FileReader.readAsArrayBuffer()`,
then reconstruct `Blob` on assemble. See `packages/recorder/src/storage/indexeddb.ts`
for the implementation pattern.

**Why this matters:** Any future recorder code that persists blobs (e.g., partial
chunks, thumbnails, metadata) to IDB in tests will need the same workaround.

## TypeScript strictness: exactOptionalPropertyTypes + noImplicitOverride

Phase 3 uses `exactOptionalPropertyTypes: true` and `noImplicitOverride: true` in
`tsconfig.json` (inherited from `@record-me/config`). These flags caught:

- Assigning `undefined` to optional properties (must use property omission instead)
- State machine branches that shadowed parent class methods without explicit `override` keyword

**Why this matters:** The strictness forced cleaner state machine logic and prevented
silent bugs in the recorder lifecycle. Keep these flags enabled in future work.

## jsdom and canvas mocking

jsdom stubs `HTMLCanvasElement.prototype.getContext` but returns `null` for '2d'
by default. For recorder tests, we installed comprehensive mocks via Vitest
`setupFiles` that provide:

- Instrumented `MockCanvasContext` with all draw methods as `vi.fn()` for assertion
- Per-canvas stable `MockMediaStream` on `captureStream(fps)`
- Consistent global `MediaRecorder`, `MediaStream`, `MediaStreamTrack` across all test files

**Why this matters:** The mocks enable deterministic RAF-based tests without flaky
timing. Future canvas or media work can reuse the same mock infrastructure.
