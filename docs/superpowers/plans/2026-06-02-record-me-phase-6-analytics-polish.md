# Phase 6 · Analytics & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the final gaps between today's build and the spec § 18 "v1 done" checklist — finish the recorder's resilience surface (storage fallback, memory pressure, partial-save), complete the studio error UX + analytics taxonomy, finish `/record` SEO, enforce per-route Lighthouse budgets, and ship to production on a custom domain.

**Architecture:** Engine-first. `@record-me/recorder` gains three resilience signals (`onStorageFallback`, `onMemoryPressure`, a `salvage()` partial-assembly path) plus a Safari-safe stale-session sweep (issue #60). The `useRecorder` hook surfaces those signals to React. The studio renders calm editorial states for each and completes the analytics taxonomy. SEO, Lighthouse, deploy, and the done-checklist follow as independent closers.

**Tech Stack:** Next.js 15 (App Router, RSC), TypeScript, Vitest + jsdom + React Testing Library, Playwright, `@vercel/analytics`, Lighthouse CI, Turborepo.

---

## Context for the implementer (read before Task A1)

**What already exists (do NOT rebuild):**

- `apps/web/src/lib/analytics.ts` — the full typed event taxonomy (`mode_selected`, `recording_started`, `recording_stopped` with optional `partial`, `recording_downloaded`, `permission_denied`, `browser_unsupported`, `cursor_highlight_disabled`). It is complete.
- `apps/web/src/app/record/_components/Studio.tsx` — already fires 6 of 7 events. Gaps: never sends `partial: true` on stop; only ever calls `cursorHighlightDisabled('opt-out')`, never `'not-record-me-tab'`.
- `.github/workflows/ci.yml` + `lighthouserc.json` — Lighthouse CI is already a gating job. The budget is a single global `performance ≥ 0.9`; spec § 8.5/§ 18 require `/` ≥ 0.95.
- `packages/recorder/src/recorder.ts` `sweepStaleChunkDatabases()` — a 24h, `indexedDB.databases()`-gated sweep already exists. Issue #60 asks to _harden_ it, not create it.
- `apps/web/src/app/record/page.tsx` — already has canonical + title + description via `buildMetadata`. Gaps: no OG image, no JSON-LD.

**What does NOT exist (this plan builds it):**

- Any IDB-write-failure → in-memory fallback. `IndexedDbChunkStore.append()` throws `storage-failed`, which routes to the error state today.
- Any memory-pressure signal.
- Any mid-recording track-failure detection. There is **no `track.onended` handler anywhere** (`packages/recorder/src/acquire.ts` attaches none). The spec § 14 "Save partial recording" flow has no engine support — `stop()` only runs from `recording`/`paused`.
- `/record` OG image or JSON-LD.

**Recorder test harness (reuse — do not reinvent):**

- `packages/recorder/src/test/mocks/media-stream.ts` — `MockMediaStreamTrack` with `_simulateEnded()` (fires the `'ended'` event) and `stop()`.
- `packages/recorder/src/test/mocks/media-recorder.ts` — `MockMediaRecorder.instances` (array; last entry is the live recorder), `_emitChunk(bytes)`, `_emitError(name)`.
- `packages/recorder/src/test/mocks/media-devices.ts` — `setDisplayMediaResponse`, `setUserMediaResponse`, `resetMediaDevices`.
- `packages/recorder/src/test/factories.ts` — `flushAsync()`, `makeStream`, `makeTrack`.
- `packages/recorder/src/test/setup.ts` — installs all globals.

**Test commands used throughout:**

- Recorder, one file: `pnpm --filter @record-me/recorder exec vitest run <relative-path>`
- Recorder, whole package: `pnpm --filter @record-me/recorder test`
- Web, one file: `pnpm --filter @record-me/web exec vitest run <relative-path>`
- Repo gates: `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build` · `pnpm format:check`

**Coverage floor (CI blocks under):** `recorder` ≥ 90%. Every new engine branch needs a test.

**Ownership (for `/spawn-record-me-team` routing):** Section A + E → `record-me-staff`. Section B → `record-me-staff` (hook touches engine contract). Sections C, D → `record-me-sr-frontend`. Section F → operational (Carlo + staff). Section G → `record-me-scribe`. E2E updates → `record-me-e2e`.

**Dependency order:** A → B → C are sequential (UX depends on hook depends on engine). D, E are independent and may run in parallel with A–C. F depends on everything merged. G is last.

---

## File Structure

| File                                                                 | Responsibility                                                                                                                                         | Tasks      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `packages/recorder/src/storage/fallback.ts` (new)                    | `FallbackChunkStore` — IDB primary, memory after first append failure                                                                                  | A1         |
| `packages/recorder/src/storage/index.ts` (modify)                    | Wire `onFallback` into `createChunkStore`                                                                                                              | A1         |
| `packages/recorder/src/types.ts` (modify)                            | Add `onStorageFallback`, `onMemoryPressure`, `memoryPressureChunkThreshold` to options; `partial?` on `RecordingResult`; `salvage` on `RecorderHandle` | A1–A3      |
| `packages/recorder/src/recorder.ts` (modify)                         | Wire fallback + pressure callbacks, chunk counter, track-end detection, `salvage()`, registry-backed sweep                                             | A1–A4      |
| `packages/recorder/src/storage/session-registry.ts` (new)            | localStorage registry of live IDB session DB names (Safari-safe sweep)                                                                                 | A4         |
| `apps/web/src/hooks/use-recorder.ts` (modify)                        | Surface `memoryPressure`, `storageFallback`, `savePartial()`, thread `partial`                                                                         | B1         |
| `apps/web/src/app/record/_components/MemoryPressureBanner.tsx` (new) | Calm "recording is getting long" banner                                                                                                                | C1         |
| `apps/web/src/app/record/_components/StorageFallbackToast.tsx` (new) | "Saving to memory instead" warning toast                                                                                                               | C2         |
| `apps/web/src/app/record/_components/ErrorState.tsx` (modify)        | "Save partial recording" action for `track-failed`                                                                                                     | C3         |
| `apps/web/src/app/record/_components/Studio.tsx` (modify)            | Render banner/toast, wire `savePartial`, send `partial` + `not-record-me-tab` analytics                                                                | C1–C4      |
| `apps/web/src/app/record/opengraph-image.tsx` (new)                  | `/record` OG card                                                                                                                                      | D1         |
| `apps/web/src/app/record/page.tsx` (modify)                          | Inject `/record` JSON-LD                                                                                                                               | D2         |
| `lighthouserc.json` (modify)                                         | Per-route assertion matrix (`/` ≥ 0.95)                                                                                                                | E1         |
| `apps/web/tests/e2e/studio-resilience.spec.ts` (new)                 | E2E smoke for partial-save + banner (e2e agent)                                                                                                        | C-followup |
| `docs/PROGRESS.md`, `docs/RECORDING.md`, `docs/SEO.md` (modify)      | Doc sync                                                                                                                                               | G1         |

---

# Section A · Recorder engine resilience (`@record-me/recorder`)

## Task A1: Storage fallback — IDB write failure falls back to in-memory

**Spec:** § 14 "IndexedDB write failure (long-recording mode) → Fall back to in-memory with explicit warning toast (logged only)."

**Files:**

- Create: `packages/recorder/src/storage/fallback.ts`
- Create: `packages/recorder/src/storage/fallback.test.ts`
- Modify: `packages/recorder/src/storage/index.ts`
- Modify: `packages/recorder/src/types.ts`
- Modify: `packages/recorder/src/recorder.ts:263-282` (chunk-store creation + onChunk)

- [ ] **Step 1: Write the failing test for `FallbackChunkStore`**

Create `packages/recorder/src/storage/fallback.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { ChunkStore } from './index';
import { FallbackChunkStore } from './fallback';

/** A ChunkStore stub whose append() can be flipped to throw on demand. */
function makeFlakyStore(): ChunkStore & { failNext: () => void; appended: number[] } {
  let fail = false;
  const parts: BlobPart[] = [];
  let byteCount = 0;
  return {
    appended: [] as number[],
    failNext() {
      fail = true;
    },
    get bytes() {
      return byteCount;
    },
    async append(chunk: Blob) {
      if (fail) throw new Error('idb write failed');
      parts.push(await chunk.arrayBuffer());
      byteCount += chunk.size;
      (this as { appended: number[] }).appended.push(chunk.size);
    },
    async assemble(mime: string) {
      return new Blob(parts, { type: mime });
    },
    async clear() {
      parts.length = 0;
      byteCount = 0;
    },
  };
}

const blob = (n: number) => new Blob([new Uint8Array(n)], { type: 'video/webm' });

describe('FallbackChunkStore', () => {
  it('delegates appends to the primary store while healthy', async () => {
    const primary = makeFlakyStore();
    const store = new FallbackChunkStore(primary, vi.fn());
    await store.append(blob(10));
    expect(primary.appended).toEqual([10]);
    expect(store.bytes).toBe(10);
  });

  it('falls back to memory after the primary append fails, firing onFallback once', async () => {
    const primary = makeFlakyStore();
    const onFallback = vi.fn();
    const store = new FallbackChunkStore(primary, onFallback);

    await store.append(blob(10)); // lands in IDB (seq 0)
    primary.failNext();
    await store.append(blob(20)); // IDB throws → memory
    await store.append(blob(30)); // stays in memory, no further onFallback

    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(store.bytes).toBe(60);
  });

  it('assemble() concatenates IDB chunks then memory chunks in order', async () => {
    const primary = makeFlakyStore();
    const store = new FallbackChunkStore(primary, vi.fn());
    await store.append(blob(10));
    primary.failNext();
    await store.append(blob(20));
    const out = await store.assemble('video/webm');
    expect(out.size).toBe(30);
  });

  it('clear() clears both stores', async () => {
    const primary = makeFlakyStore();
    const store = new FallbackChunkStore(primary, vi.fn());
    await store.append(blob(10));
    primary.failNext();
    await store.append(blob(20));
    await store.clear();
    expect(store.bytes).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @record-me/recorder exec vitest run src/storage/fallback.test.ts`
Expected: FAIL — `Cannot find module './fallback'`.

- [ ] **Step 3: Implement `FallbackChunkStore`**

Create `packages/recorder/src/storage/fallback.ts`:

```ts
// packages/recorder/src/storage/fallback.ts
import type { ChunkStore } from './index';
import { MemoryChunkStore } from './memory';

/**
 * Wraps a primary (IndexedDB) store. On the first append() failure it flips to
 * a MemoryChunkStore for all subsequent chunks and fires onFallback() exactly
 * once. Chunks already committed to the primary are preserved: assemble()
 * concatenates the primary's assembled blob (chunks 0..k) followed by the
 * memory blob (chunks k+1..n), which keeps recording order intact because the
 * fallback always happens at the tail. Spec § 14.
 */
export class FallbackChunkStore implements ChunkStore {
  private readonly memory = new MemoryChunkStore();
  private degraded = false;

  constructor(
    private readonly primary: ChunkStore,
    private readonly onFallback: () => void,
  ) {}

  get bytes(): number {
    return this.primary.bytes + this.memory.bytes;
  }

  async append(chunk: Blob): Promise<void> {
    if (this.degraded) {
      await this.memory.append(chunk);
      return;
    }
    try {
      await this.primary.append(chunk);
    } catch {
      this.degraded = true;
      this.onFallback();
      await this.memory.append(chunk);
    }
  }

  async assemble(mimeType: string): Promise<Blob> {
    if (!this.degraded) return this.primary.assemble(mimeType);
    // Best-effort recovery of whatever committed to the primary before failure.
    const primaryBlob = await this.primary
      .assemble(mimeType)
      .catch(() => new Blob([], { type: mimeType }));
    const memoryBlob = await this.memory.assemble(mimeType);
    return new Blob([primaryBlob, memoryBlob], { type: mimeType });
  }

  async clear(): Promise<void> {
    await Promise.allSettled([this.primary.clear(), this.memory.clear()]);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @record-me/recorder exec vitest run src/storage/fallback.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the option types**

In `packages/recorder/src/types.ts`, inside `RecorderOptions` (after the `onPreviewReady` line, before the closing `}`):

```ts
  /** Fired once if IDB chunk writes fail and the engine falls back to in-memory storage (spec § 14). */
  onStorageFallback?: () => void;
  /** Fired once when buffered chunk count first crosses the memory-pressure threshold (spec § 14). */
  onMemoryPressure?: () => void;
  /** Chunk count that triggers onMemoryPressure. Defaults to MEMORY_PRESSURE_CHUNK_THRESHOLD. */
  memoryPressureChunkThreshold?: number;
```

- [ ] **Step 6: Wire `onFallback` into the store factory**

In `packages/recorder/src/storage/index.ts`, add to `CreateChunkStoreOptions`:

```ts
  /** Invoked once if an IDB store degrades to in-memory mid-recording. */
  onFallback?: () => void;
```

Replace the two `new IndexedDbChunkStore(...)` returns so each is wrapped when a fallback handler is supplied. Add the import at top:

```ts
import { FallbackChunkStore } from './fallback';
```

Then change the IDB branches:

```ts
  if (opts.strategy === 'indexeddb') {
    return wrap(new IndexedDbChunkStore(opts.sessionId ?? newSessionId()), opts.onFallback);
  }
  if (opts.maxDurationMs > AUTO_IDB_THRESHOLD_MS) {
    return wrap(new IndexedDbChunkStore(opts.sessionId ?? newSessionId()), opts.onFallback);
  }
  return new MemoryChunkStore();
}

function wrap(store: ChunkStore, onFallback: (() => void) | undefined): ChunkStore {
  return onFallback ? new FallbackChunkStore(store, onFallback) : store;
}
```

Add `FallbackChunkStore` to the bottom re-exports:

```ts
export { FallbackChunkStore } from './fallback';
```

- [ ] **Step 7: Wire the recorder to pass the fallback handler**

In `packages/recorder/src/recorder.ts`, in the `createChunkStore` call (currently lines ~263-266), add the `onFallback`:

```ts
internal.store = createChunkStore({
  strategy: resolved.storage,
  maxDurationMs: resolved.maxDurationMs,
  onFallback: () => opts.onStorageFallback?.(),
});
```

- [ ] **Step 8: Write the recorder-level integration test for fallback**

Create `packages/recorder/src/recorder.storage-fallback.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRecorder } from './recorder';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import { setDisplayMediaResponse, resetMediaDevices } from './test/mocks/media-devices';
import { flushAsync } from './test/factories';

afterEach(() => {
  MockMediaRecorder.reset();
  resetMediaDevices();
});

describe('createRecorder · storage fallback', () => {
  it('fires onStorageFallback when an IDB append fails mid-recording', async () => {
    // Force IDB strategy + make the IDB open reject so the first append fails.
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onStorageFallback = vi.fn();

    const handle = createRecorder({
      mode: 'screen+cursor',
      storage: 'indexeddb',
      onStorageFallback,
    });

    // Break indexedDB.open so IDB appends reject and the store degrades.
    const realOpen = indexedDB.open.bind(indexedDB);
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const req = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      } as unknown as IDBOpenDBRequest;
      queueMicrotask(() => req.onerror?.(new Event('error')));
      return req;
    });

    await handle.start();
    const mr = MockMediaRecorder.instances.at(-1)!;
    mr._emitChunk(1024);
    await flushAsync();
    await flushAsync();

    expect(onStorageFallback).toHaveBeenCalledTimes(1);

    vi.mocked(indexedDB.open).mockRestore?.();
    void realOpen;
    handle.dispose();
  });
});
```

> NOTE for implementer: the exact IDB-open spy may need adjusting to the test env's `fake-indexeddb`. If spying on `indexedDB.open` is brittle, the unit test in Step 1 already proves `FallbackChunkStore` behaviour; this integration test only needs to prove the wiring fires `onStorageFallback`. An acceptable alternative is to inject a failing store via the `storage` seam — if so, document the seam in the test.

- [ ] **Step 9: Run the recorder package tests**

Run: `pnpm --filter @record-me/recorder test`
Expected: PASS, coverage still ≥ 90%.

- [ ] **Step 10: Commit**

```bash
git add packages/recorder/src/storage/fallback.ts packages/recorder/src/storage/fallback.test.ts packages/recorder/src/storage/index.ts packages/recorder/src/types.ts packages/recorder/src/recorder.ts packages/recorder/src/recorder.storage-fallback.test.ts
git commit -m "feat(recorder): IDB write failure falls back to in-memory storage"
```

---

## Task A2: Memory-pressure signal

**Spec:** § 14 "Memory pressure (chunk count threshold) → Calm banner (logged only)."

**Files:**

- Modify: `packages/recorder/src/recorder.ts` (constants + onChunk handler)
- Test: `packages/recorder/src/recorder.memory-pressure.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `packages/recorder/src/recorder.memory-pressure.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRecorder } from './recorder';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import { setDisplayMediaResponse, resetMediaDevices } from './test/mocks/media-devices';
import { flushAsync } from './test/factories';

afterEach(() => {
  MockMediaRecorder.reset();
  resetMediaDevices();
});

describe('createRecorder · memory pressure', () => {
  it('fires onMemoryPressure exactly once when the chunk count crosses the threshold', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onMemoryPressure = vi.fn();
    const handle = createRecorder({
      mode: 'screen+cursor',
      memoryPressureChunkThreshold: 3,
      onMemoryPressure,
    });
    await handle.start();
    const mr = MockMediaRecorder.instances.at(-1)!;

    mr._emitChunk(100);
    mr._emitChunk(100);
    await flushAsync();
    expect(onMemoryPressure).not.toHaveBeenCalled();

    mr._emitChunk(100); // 3rd chunk crosses threshold
    mr._emitChunk(100); // 4th — must not re-fire
    await flushAsync();

    expect(onMemoryPressure).toHaveBeenCalledTimes(1);
    handle.dispose();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @record-me/recorder exec vitest run src/recorder.memory-pressure.test.ts`
Expected: FAIL — `onMemoryPressure` never called (no implementation yet).

- [ ] **Step 3: Implement the chunk counter + threshold**

In `packages/recorder/src/recorder.ts`, add a constant near the top (after `TIMESLICE_MS`):

```ts
// Buffered-chunk count that trips the memory-pressure signal (spec § 14).
// At the 1s timeslice this is ~10 min — past the auto-IDB spill point but a
// real heads-up for memory-strategy sessions.
const MEMORY_PRESSURE_CHUNK_THRESHOLD = 600;
```

Add to the resolved-options object (in `createRecorder`, alongside the other resolved fields):

```ts
    memoryPressureChunkThreshold:
      opts.memoryPressureChunkThreshold ?? MEMORY_PRESSURE_CHUNK_THRESHOLD,
```

Add counter fields to `InternalRecorderState` and its initializer:

```ts
chunkCount: number;
memoryPressureFired: boolean;
```

```ts
    chunkCount: 0,
    memoryPressureFired: false,
```

In the encoder `onChunk` callback (currently lines ~273-280), after `opts.onBytesTick?.(store.bytes);`, add:

```ts
internal.chunkCount += 1;
if (!internal.memoryPressureFired && internal.chunkCount >= resolved.memoryPressureChunkThreshold) {
  internal.memoryPressureFired = true;
  opts.onMemoryPressure?.();
}
```

Reset `chunkCount`/`memoryPressureFired` in `cleanupResources()` (alongside the other `internal.* = undefined` resets near the end):

```ts
internal.chunkCount = 0;
internal.memoryPressureFired = false;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @record-me/recorder exec vitest run src/recorder.memory-pressure.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full package + commit**

Run: `pnpm --filter @record-me/recorder test`
Expected: PASS, coverage ≥ 90%.

```bash
git add packages/recorder/src/recorder.ts packages/recorder/src/recorder.memory-pressure.test.ts
git commit -m "feat(recorder): emit onMemoryPressure when buffered chunks cross threshold"
```

---

## Task A3: Mid-recording track-failure detection + `salvage()` partial-save

**Spec:** § 14 "Track failure mid-recording → Keep what we have · 'Save partial recording' + 'Start over'; `recording_stopped` with partial flag." § 7.6 public API.

**Files:**

- Modify: `packages/recorder/src/types.ts` (`RecordingResult.partial`, `RecorderHandle.salvage`)
- Modify: `packages/recorder/src/recorder.ts` (track-end listeners, salvage path)
- Test: `packages/recorder/src/recorder.salvage.test.ts` (new)

- [ ] **Step 1: Add the public types**

In `packages/recorder/src/types.ts`, add to `RecordingResult` (after `suggestedFilename`):

```ts
  /** True when this recording was salvaged from a mid-session track failure (spec § 14). */
  partial?: boolean;
```

Add to `RecorderHandle` (after `stop`):

```ts
/**
 * Assemble whatever was buffered before a mid-recording track failure into a
 * partial RecordingResult (partial: true). Valid only from the 'error' state
 * after a 'track-failed' error; rejects with invalid-state otherwise.
 */
salvage: () => Promise<RecordingResult>;
```

- [ ] **Step 2: Write the failing test — track end transitions to error and retains buffer**

Create `packages/recorder/src/recorder.salvage.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRecorder } from './recorder';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import { MockMediaStreamTrack } from './test/mocks/media-stream';
import { setDisplayMediaResponse, resetMediaDevices } from './test/mocks/media-devices';
import { flushAsync } from './test/factories';
import type { RecorderState } from './types';

afterEach(() => {
  MockMediaRecorder.reset();
  resetMediaDevices();
});

describe('createRecorder · track failure + salvage', () => {
  it('a screen track ending mid-recording surfaces a track-failed error', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const states: RecorderState[] = [];
    const onError = vi.fn();
    const handle = createRecorder({
      mode: 'screen+cursor',
      onStateChange: (s) => states.push(s),
      onError,
    });
    await handle.start();
    expect(handle.state).toBe('recording');

    // Simulate the user clicking the browser's native "Stop sharing" pill.
    const mr = MockMediaRecorder.instances.at(-1)!;
    const screenTrack = mr.stream.getVideoTracks()[0] as unknown as MockMediaStreamTrack;
    screenTrack._simulateEnded();
    await flushAsync();

    expect(handle.state).toBe('error');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'track-failed' }));
  });

  it('salvage() assembles buffered chunks into a partial result and goes ready', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onResult = vi.fn();
    const handle = createRecorder({ mode: 'screen+cursor', onResult });
    await handle.start();

    const mr = MockMediaRecorder.instances.at(-1)!;
    mr._emitChunk(2048);
    await flushAsync();

    const screenTrack = mr.stream.getVideoTracks()[0] as unknown as MockMediaStreamTrack;
    screenTrack._simulateEnded();
    await flushAsync();
    expect(handle.state).toBe('error');

    const result = await handle.salvage();
    expect(result.partial).toBe(true);
    expect(result.bytes).toBeGreaterThan(0);
    expect(handle.state).toBe('ready');
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ partial: true }));

    await result.release();
  });

  it('salvage() rejects with invalid-state when not in an error state', async () => {
    const handle = createRecorder({ mode: 'cam-only' });
    await expect(handle.salvage()).rejects.toMatchObject({ kind: 'invalid-state' });
  });

  it('a normal stop() does NOT trigger the track-failure path', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onError = vi.fn();
    const handle = createRecorder({ mode: 'screen+cursor', onError });
    await handle.start();
    const mr = MockMediaRecorder.instances.at(-1)!;
    mr._emitChunk(1024);
    const result = await handle.stop(); // stop() internally stops tracks
    await flushAsync();
    expect(onError).not.toHaveBeenCalled();
    expect(result.partial).toBeUndefined();
    await result.release();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @record-me/recorder exec vitest run src/recorder.salvage.test.ts`
Expected: FAIL — `handle.salvage is not a function` / track end does not move to error.

- [ ] **Step 4: Implement track-failure detection**

In `packages/recorder/src/recorder.ts`, add to `InternalRecorderState` + initializer:

```ts
/** True while OUR stop()/cleanup is intentionally ending tracks — suppresses the track-failure path. */
intentionalStop: boolean;
/** Detach functions for the track 'ended' listeners attached at start(). */
trackEndedDetachers: Array<() => void>;
```

```ts
    intentionalStop: false,
    trackEndedDetachers: [],
```

Add a `handleTrackFailure` helper inside `createRecorder` (after `toError` is defined):

```ts
const handleTrackFailure = (subject: PermissionSubject | undefined) => {
  // Only meaningful while actively recording; ignore expected ends.
  if (internal.intentionalStop) return;
  if (state !== 'recording' && state !== 'paused') return;
  internal.finishedAt = Date.now();
  if (internal.pausedAtMs) {
    internal.pausedTotalMs += internal.finishedAt - internal.pausedAtMs;
    internal.pausedAtMs = undefined;
  }
  // Flush a final chunk, but KEEP the store so salvage() can assemble it.
  void internal.encoder?.stop();
  internal.composer?.stop();
  internal.highlights?.detach();
  if (internal.durationInterval) {
    clearInterval(internal.durationInterval);
    internal.durationInterval = undefined;
  }
  if (internal.autoStopTimeout) {
    clearTimeout(internal.autoStopTimeout);
    internal.autoStopTimeout = undefined;
  }
  toError(new RecorderError('track-failed', `${subject ?? 'media'} track ended`, { subject }));
};
```

Import `PermissionSubject` at the top of recorder.ts if not already in the `types` import list:

```ts
import type {
  RecorderHandle,
  RecorderOptions,
  RecorderState,
  RecordingResult,
  PermissionSubject,
} from './types';
```

In `start()`, immediately after `internal.acquired = await acquireTracks(...)` succeeds (inside the try, before composer wiring), attach listeners:

```ts
internal.trackEndedDetachers = internal.acquired.all.map((track) => {
  const subject: PermissionSubject =
    track.kind === 'audio' ? 'mic' : track === internal.acquired!.camera ? 'camera' : 'screen';
  const onEnded = () => handleTrackFailure(subject);
  track.addEventListener('ended', onEnded);
  return () => track.removeEventListener('ended', onEnded);
});
```

In `cleanupResources()`, at the very top, set the intentional-stop guard and detach listeners so our own `track.stop()` calls don't re-enter `handleTrackFailure`:

```ts
internal.intentionalStop = true;
internal.trackEndedDetachers.forEach((d) => d());
internal.trackEndedDetachers = [];
```

In `stop()`, at the very top (before `setState('finalizing')`), guard + detach the same way, so the deliberate `t.stop()` calls later in stop() don't fire the failure path:

```ts
internal.intentionalStop = true;
internal.trackEndedDetachers.forEach((d) => d());
internal.trackEndedDetachers = [];
```

Reset `intentionalStop` to `false` in `start()` right after the concurrency/state check (so a fresh session re-arms detection):

```ts
internal.intentionalStop = false;
```

- [ ] **Step 5: Implement `salvage()`**

Refactor the result-building tail of `stop()` into a shared helper so `salvage()` reuses it. Add inside `createRecorder` (above the `handle` object) a `buildResult` helper:

```ts
const buildResult = async (partial: boolean): Promise<RecordingResult> => {
  await Promise.all([...internal.pendingAppends]);
  /* c8 ignore next 2 */
  const mimeType = internal.mimeType ?? 'video/webm';
  const blob = (await internal.store?.assemble(mimeType)) ?? new Blob([], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const durationMs = elapsedMs();
  const sequence = ++sequenceCounter;
  /* c8 ignore next */
  const filename = suggestedFilename(
    new Date(internal.startedAt ?? Date.now()),
    sequence,
    mimeType,
  );
  void extensionForMimeType;

  const store = internal.store;
  internal.acquired?.all.forEach((t) => {
    try {
      t.stop();
    } catch {
      /* c8 ignore next */
    }
  });

  setState('ready');

  let released = false;
  const result: RecordingResult = {
    blob,
    url,
    mimeType,
    durationMs,
    bytes: blob.size,
    suggestedFilename: filename,
    ...(partial ? { partial: true } : {}),
    release: async (): Promise<void> => {
      if (released) return;
      released = true;
      URL.revokeObjectURL(url);
      try {
        await store?.clear();
      } catch {
        /* c8 ignore next */
      }
      if (internal.store === store) {
        internal.store = undefined;
        if (state === 'ready') setState('idle');
      }
    },
  };
  opts.onResult?.(result);
  return result;
};
```

Replace the body of `stop()` after `await internal.encoder?.stop(); internal.composer?.stop(); internal.highlights?.detach();` (i.e. from the `// Drain...` comment through `return result;`) with:

```ts
return buildResult(false);
```

Add the `salvage` method to the `handle` object (after `stop`):

```ts
    async salvage(): Promise<RecordingResult> {
      if (state !== 'error') {
        throw new RecorderError('invalid-state', `cannot salvage in state '${state}'`);
      }
      if (!internal.store) {
        throw new RecorderError('invalid-state', 'nothing to salvage');
      }
      return buildResult(true);
    },
```

> NOTE: `buildResult` stops tracks and sets state to `ready`. After a track failure the encoder was already stopped by `handleTrackFailure`, and `pendingAppends` will include the flushed final chunk — `buildResult` awaits them. The `intentionalStop` guard is already true at salvage time (set when the failed track ended? No — set it now): in `handleTrackFailure`, after `toError(...)`, also set `internal.intentionalStop = true` and detach remaining listeners so `buildResult`'s `t.stop()` loop is quiet. Add that line at the end of `handleTrackFailure`.

Add to the end of `handleTrackFailure` (after the `toError(...)` line):

```ts
internal.intentionalStop = true;
internal.trackEndedDetachers.forEach((d) => d());
internal.trackEndedDetachers = [];
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @record-me/recorder exec vitest run src/recorder.salvage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Run the full package, watch coverage**

Run: `pnpm --filter @record-me/recorder test`
Expected: PASS, coverage ≥ 90%. If new branches in `handleTrackFailure` dip coverage, add a `paused`-state track-failure test variant.

- [ ] **Step 8: Commit**

```bash
git add packages/recorder/src/types.ts packages/recorder/src/recorder.ts packages/recorder/src/recorder.salvage.test.ts
git commit -m "feat(recorder): detect mid-recording track failure and salvage a partial result"
```

---

## Task A4: Safari-safe stale-session sweep (issue #60)

**Issue #60:** Shrink the stale-sweep window and add a Safari-safe sweep that does not depend on `indexedDB.databases()`.

**Files:**

- Create: `packages/recorder/src/storage/session-registry.ts`
- Create: `packages/recorder/src/storage/session-registry.test.ts`
- Modify: `packages/recorder/src/storage/indexeddb.ts` (register on construct, deregister on clear)
- Modify: `packages/recorder/src/recorder.ts` (sweep registry on start; shrink threshold)

- [ ] **Step 1: Write the failing test for the registry**

Create `packages/recorder/src/storage/session-registry.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  registerSession,
  deregisterSession,
  sweepRegisteredSessions,
  REGISTRY_KEY,
} from './session-registry';

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('session-registry', () => {
  it('registers and deregisters a DB name with a timestamp', () => {
    registerSession('record-me-chunks-abc', 1000);
    expect(localStorage.getItem(REGISTRY_KEY)).toContain('record-me-chunks-abc');
    deregisterSession('record-me-chunks-abc');
    expect(localStorage.getItem(REGISTRY_KEY)).not.toContain('record-me-chunks-abc');
  });

  it('sweeps entries older than the threshold and deletes their DBs', async () => {
    const now = 10_000_000;
    registerSession('record-me-chunks-stale', now - 5_000_000); // older than 1h
    registerSession('record-me-chunks-fresh', now - 1_000); // recent
    const deleted: string[] = [];
    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation((name: string) => {
      deleted.push(name);
      const req = {} as IDBOpenDBRequest;
      queueMicrotask(() => (req as unknown as { onsuccess?: () => void }).onsuccess?.());
      return req;
    });

    await sweepRegisteredSessions(now);

    expect(deleted).toContain('record-me-chunks-stale');
    expect(deleted).not.toContain('record-me-chunks-fresh');
    expect(localStorage.getItem(REGISTRY_KEY)).not.toContain('record-me-chunks-stale');
    expect(localStorage.getItem(REGISTRY_KEY)).toContain('record-me-chunks-fresh');
  });

  it('is a no-op when localStorage is unavailable', async () => {
    const orig = globalThis.localStorage;
    // @ts-expect-error force-remove
    delete globalThis.localStorage;
    await expect(sweepRegisteredSessions(0)).resolves.toBeUndefined();
    expect(() => registerSession('x', 0)).not.toThrow();
    globalThis.localStorage = orig;
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @record-me/recorder exec vitest run src/storage/session-registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the registry**

Create `packages/recorder/src/storage/session-registry.ts`:

```ts
// packages/recorder/src/storage/session-registry.ts
// A localStorage-backed registry of live IDB chunk-store DB names. Enables a
// Safari-safe stale sweep that does not depend on indexedDB.databases()
// (unavailable in Safari). Issue #60.

export const REGISTRY_KEY = 'record-me-idb-sessions';
// Shrunk from the old 24h databases()-only window: registry entries are cheap
// and each session deregisters itself on clear(), so leftovers are rare.
export const STALE_REGISTRY_THRESHOLD_MS = 60 * 60 * 1000; // 1h

interface Entry {
  name: string;
  ts: number;
}

function safeRead(): Entry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.name === 'string') : [];
  } catch {
    return [];
  }
}

function safeWrite(entries: Entry[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(entries));
  } catch {
    /* best-effort */
  }
}

export function registerSession(name: string, now: number): void {
  const entries = safeRead().filter((e) => e.name !== name);
  entries.push({ name, ts: now });
  safeWrite(entries);
}

export function deregisterSession(name: string): void {
  safeWrite(safeRead().filter((e) => e.name !== name));
}

function deleteDb(name: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve();
      return;
    }
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

/** Delete any registered DB older than the threshold; keep fresh ones. */
export async function sweepRegisteredSessions(now: number): Promise<void> {
  const entries = safeRead();
  if (entries.length === 0) return;
  const survivors: Entry[] = [];
  for (const entry of entries) {
    if (now - entry.ts >= STALE_REGISTRY_THRESHOLD_MS) {
      await deleteDb(entry.name);
    } else {
      survivors.push(entry);
    }
  }
  safeWrite(survivors);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @record-me/recorder exec vitest run src/storage/session-registry.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Register/deregister from the IDB store**

In `packages/recorder/src/storage/indexeddb.ts`, import the registry:

```ts
import { registerSession, deregisterSession } from './session-registry';
```

In the constructor, after `this.dbName = ...`, register:

```ts
registerSession(this.dbName, Date.now());
```

In `clear()`, after `await deleteDb(this.dbName);`, deregister:

```ts
deregisterSession(this.dbName);
```

> The existing tests construct `IndexedDbChunkStore` — `Date.now()` is allowed in package source (it is only banned in workflow scripts). Confirm the package's existing tests still pass after adding the registry write.

- [ ] **Step 6: Sweep the registry on start() and shrink the legacy window**

In `packages/recorder/src/recorder.ts`:

- Import the sweep: `import { sweepRegisteredSessions } from './storage/session-registry';`
- In `start()`, after `await sweepStaleChunkDatabases();`, add the Safari-safe sweep:

```ts
await sweepRegisteredSessions(Date.now());
```

- Shrink the legacy threshold constant to match the registry window:

```ts
const STALE_SESSION_THRESHOLD_MS = 60 * 60 * 1000; // 1h (was 24h) — see issue #60
```

- [ ] **Step 7: Run the full package test + commit**

Run: `pnpm --filter @record-me/recorder test`
Expected: PASS, coverage ≥ 90%.

```bash
git add packages/recorder/src/storage/session-registry.ts packages/recorder/src/storage/session-registry.test.ts packages/recorder/src/storage/indexeddb.ts packages/recorder/src/recorder.ts
git commit -m "fix(recorder): Safari-safe stale IDB sweep via localStorage registry (closes #60)"
```

---

# Section B · `useRecorder` hook surface

## Task B1: Surface resilience signals + `savePartial()` to React

**Files:**

- Modify: `apps/web/src/hooks/use-recorder.ts`
- Modify: `apps/web/src/hooks/use-recorder.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/hooks/use-recorder.test.ts` (mirror the existing test setup in that file for mocks; reuse the existing recorder mock harness it already imports). Add a describe block:

```ts
describe('useRecorder · resilience signals', () => {
  it('exposes memoryPressure, storageFallback flags and a savePartial method', () => {
    const { result } = renderHook(() => useRecorder());
    expect(result.current.memoryPressure).toBe(false);
    expect(result.current.storageFallback).toBe(false);
    expect(typeof result.current.savePartial).toBe('function');
  });

  it('flips memoryPressure to true when the engine fires onMemoryPressure', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'screen+cursor' });
    });
    // Drive the engine's onMemoryPressure via the mock recorder used in this suite.
    act(() => {
      getLastRecorderMock().fireMemoryPressure();
    });
    expect(result.current.memoryPressure).toBe(true);
  });
});
```

> NOTE: `getLastRecorderMock()` / `fireMemoryPressure()` mirror however this test file already drives engine callbacks (the existing suite already simulates `onStateChange`/`onResult`). Use the file's established mock seam; if the suite mocks `@record-me/recorder` with `vi.mock`, extend that mock factory to capture and expose `onMemoryPressure`/`onStorageFallback`. Match the existing pattern exactly — do not introduce a second mocking style.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @record-me/web exec vitest run src/hooks/use-recorder.test.ts`
Expected: FAIL — `memoryPressure` is undefined / `savePartial` missing.

- [ ] **Step 3: Extend the hook**

In `apps/web/src/hooks/use-recorder.ts`:

- Add to the `StartOptions` Omit list the new engine callbacks:

```ts
export type StartOptions = Omit<
  RecorderOptions,
  | 'onStateChange'
  | 'onDurationTick'
  | 'onBytesTick'
  | 'onError'
  | 'onResult'
  | 'onPreviewReady'
  | 'onMemoryPressure'
  | 'onStorageFallback'
>;
```

- Add to `UseRecorderApi`:

```ts
memoryPressure: boolean;
storageFallback: boolean;
savePartial: () => Promise<void>;
```

- Add state in the hook body (near the other `useState`s):

```ts
const [memoryPressure, setMemoryPressure] = useState(false);
const [storageFallback, setStorageFallback] = useState(false);
```

- In the `createRecorder({...})` call inside `start`, reset both flags before creating (alongside `setResult(null)`/`setError(null)`):

```ts
setMemoryPressure(false);
setStorageFallback(false);
```

and wire the callbacks in the options object:

```ts
        onMemoryPressure: () => setMemoryPressure(true),
        onStorageFallback: () => setStorageFallback(true),
```

- Add a `savePartial` callback (after `stop`):

```ts
const savePartial = useCallback(() => {
  // Result arrives via onResult → setResult; ignore the returned value.
  void handleRef.current?.salvage().catch(() => {
    /* surfaced via onError */
  });
  return Promise.resolve();
}, []);
```

- In `reset()`, also clear the new flags (alongside `setError(null)` etc.):

```ts
setMemoryPressure(false);
setStorageFallback(false);
```

- Add `memoryPressure`, `storageFallback`, `savePartial` to the returned object.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @record-me/web exec vitest run src/hooks/use-recorder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-recorder.ts apps/web/src/hooks/use-recorder.test.ts
git commit -m "feat(web): surface memory-pressure, storage-fallback, savePartial from useRecorder"
```

---

# Section C · Studio resilience UX + analytics completion

> **UI work — `frontend-design` skill is mandatory before writing component code** (CLAUDE.md). Invoke it for C1–C3 to fix the visual language of the banner, toast, and partial-save action against `docs/DESIGN.md` tokens. Verify each with Playwright MCP (`browser_navigate` → `/record`, `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`).

## Task C1: Memory-pressure banner

**Spec:** § 14 "Calm banner above the studio: 'Recording is getting long. We recommend stopping soon.'"

**Files:**

- Create: `apps/web/src/app/record/_components/MemoryPressureBanner.tsx`
- Create: `apps/web/src/app/record/_components/MemoryPressureBanner.test.tsx`
- Modify: `apps/web/src/app/record/_components/Studio.tsx`

- [ ] **Step 1: Write the failing component test**

Create `apps/web/src/app/record/_components/MemoryPressureBanner.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryPressureBanner } from './MemoryPressureBanner';

describe('MemoryPressureBanner', () => {
  it('renders the calm long-recording advisory with role=status', () => {
    render(<MemoryPressureBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent(/recording is getting long/i);
    expect(banner).toHaveTextContent(/recommend stopping soon/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/MemoryPressureBanner.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the banner** (after `frontend-design`)

Create `apps/web/src/app/record/_components/MemoryPressureBanner.tsx`:

```tsx
'use client';

export function MemoryPressureBanner() {
  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-amber/30 bg-amber/10 px-6 py-3 text-sm text-ivory"
    >
      <span aria-hidden className="font-mono text-xs uppercase tracking-widest text-amber">
        heads up
      </span>
      <p className="leading-snug text-ivory-dim">
        Recording is getting long. We recommend stopping soon.
      </p>
    </div>
  );
}
```

> Confirm the `amber` token exists in `packages/ui` / `docs/DESIGN.md`. If not, use the established warning token (e.g. the same tone `MetaChip tone="danger"` uses) — do NOT invent a hex value.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/MemoryPressureBanner.test.tsx`
Expected: PASS.

- [ ] **Step 5: Render it in the studio when pressure is signalled**

In `apps/web/src/app/record/_components/Studio.tsx`:

- Import: `import { MemoryPressureBanner } from './MemoryPressureBanner';`
- It should show only during live/paused. Render it above `StudioShell` by wrapping the return in a fragment:

```tsx
return (
  <div className="flex w-full max-w-5xl flex-col gap-3">
    {recorder.memoryPressure && (phase === 'live' || phase === 'paused') ? (
      <MemoryPressureBanner />
    ) : null}
    <StudioShell className="w-full" header={header} footer={footer}>
      {body}
    </StudioShell>
  </div>
);
```

- [ ] **Step 6: Visual verification (Playwright MCP)**

Drive a recording in dev, force `memoryPressure` (temporarily set the engine threshold low via the studio start opts OR trigger via console), confirm the banner renders calm with no console errors. Document the screenshot path.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/record/_components/MemoryPressureBanner.tsx apps/web/src/app/record/_components/MemoryPressureBanner.test.tsx apps/web/src/app/record/_components/Studio.tsx
git commit -m "feat(studio): calm memory-pressure banner during long recordings"
```

---

## Task C2: Storage-fallback toast

**Spec:** § 14 "IndexedDB write failure → Fall back to in-memory with explicit warning toast."

**Files:**

- Create: `apps/web/src/app/record/_components/StorageFallbackToast.tsx`
- Create: `apps/web/src/app/record/_components/StorageFallbackToast.test.tsx`
- Modify: `apps/web/src/app/record/_components/Studio.tsx`

- [ ] **Step 1: Write the failing component test**

Create `apps/web/src/app/record/_components/StorageFallbackToast.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorageFallbackToast } from './StorageFallbackToast';

describe('StorageFallbackToast', () => {
  it('explains the in-memory fallback as an alert', () => {
    render(<StorageFallbackToast />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveTextContent(/saving to memory/i);
    expect(toast).toHaveTextContent(/keep this tab open|don.?t close this tab|stop sooner/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/StorageFallbackToast.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the toast** (after `frontend-design`)

Create `apps/web/src/app/record/_components/StorageFallbackToast.tsx`:

```tsx
'use client';

export function StorageFallbackToast() {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-amber/30 bg-amber/10 px-6 py-3 text-sm text-ivory"
    >
      <span aria-hidden className="font-mono text-xs uppercase tracking-widest text-amber">
        storage
      </span>
      <p className="leading-snug text-ivory-dim">
        Disk buffering hit a snag — we&rsquo;re saving to memory instead. Keep this tab open and
        consider stopping sooner.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/StorageFallbackToast.test.tsx`
Expected: PASS.

- [ ] **Step 5: Render it in the studio when fallback is signalled**

In `Studio.tsx`, import and render `StorageFallbackToast` in the same wrapper as the banner, when `recorder.storageFallback` and live/paused:

```tsx
{
  recorder.storageFallback && (phase === 'live' || phase === 'paused') ? (
    <StorageFallbackToast />
  ) : null;
}
```

- [ ] **Step 6: Visual verification (Playwright MCP)** — confirm toast renders, console clean.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/record/_components/StorageFallbackToast.tsx apps/web/src/app/record/_components/StorageFallbackToast.test.tsx apps/web/src/app/record/_components/Studio.tsx
git commit -m "feat(studio): warning toast when IDB storage falls back to memory"
```

---

## Task C3: "Save partial recording" on track failure + `recording_stopped { partial: true }`

**Spec:** § 14 track-failure row; § 10.2 `recording_stopped … partial?`.

**Files:**

- Modify: `apps/web/src/app/record/_components/ErrorState.tsx`
- Modify: `apps/web/src/app/record/_components/ErrorState.test.tsx`
- Modify: `apps/web/src/app/record/_components/Studio.tsx`

- [ ] **Step 1: Write the failing test for the salvage action**

Add to `apps/web/src/app/record/_components/ErrorState.test.tsx`:

```tsx
it('offers "Save partial recording" only for track-failed errors', () => {
  const onSavePartial = vi.fn();
  const { rerender } = render(
    <ErrorState
      error={{ name: 'RecorderError', message: '', kind: 'track-failed' }}
      onRetry={vi.fn()}
      onSavePartial={onSavePartial}
    />,
  );
  const save = screen.getByRole('button', { name: /save partial recording/i });
  fireEvent.click(save);
  expect(onSavePartial).toHaveBeenCalledTimes(1);

  rerender(
    <ErrorState
      error={{ name: 'RecorderError', message: '', kind: 'permission-denied', subject: 'screen' }}
      onRetry={vi.fn()}
      onSavePartial={onSavePartial}
    />,
  );
  expect(screen.queryByRole('button', { name: /save partial recording/i })).toBeNull();
});
```

(Ensure `vi`, `fireEvent`, `screen`, `render` are imported at the top of the file.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/ErrorState.test.tsx`
Expected: FAIL — `onSavePartial` prop unknown / button not found.

- [ ] **Step 3: Add the optional salvage action to `ErrorState`**

Edit `apps/web/src/app/record/_components/ErrorState.tsx`:

```tsx
export interface ErrorStateProps {
  error: RecorderErrorLike;
  onRetry: () => void;
  /** When provided and the error is a track failure, offer to save what was recorded. */
  onSavePartial?: () => void;
}

export function ErrorState({ error, onRetry, onSavePartial }: ErrorStateProps) {
  const canSavePartial = error.kind === 'track-failed' && typeof onSavePartial === 'function';
  return (
    <div className="flex flex-col items-start gap-4 p-10">
      <MetaChip tone="danger">recording error</MetaChip>
      <p className="max-w-prose font-serif text-2xl leading-snug text-ivory">{messageFor(error)}</p>
      <div className="flex items-center gap-3">
        {canSavePartial ? <Button onClick={onSavePartial}>Save partial recording</Button> : null}
        <Button variant="secondary" onClick={onRetry}>
          {canSavePartial ? 'Start over' : 'Try again'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/ErrorState.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire `savePartial` + `partial` analytics in `Studio.tsx`**

- Pass the new prop where `ErrorState` is rendered (currently lines ~271-274):

```tsx
      case 'error':
        return recorder.error ? (
          <ErrorState
            error={recorder.error}
            onRetry={() => void recorderReset()}
            onSavePartial={() => void recorder.savePartial()}
          />
        ) : null;
```

- Thread the `partial` flag into the existing `recording_stopped` effect (currently lines ~120-131). Replace the `analytics.recordingStopped({...})` payload to include partial:

```tsx
analytics.recordingStopped({
  mode,
  duration_seconds: Math.round(recorder.result.durationMs / 1000),
  bytes: recorder.result.bytes,
  mime_type: recorder.result.mimeType,
  ...(recorder.result.partial ? { partial: true } : {}),
});
```

> This works because `savePartial()` → engine `salvage()` → `onResult` (partial:true) → state goes `ready` → the existing stop effect fires with the partial result.

- [ ] **Step 6: Update the Studio test** to assert `recordingStopped` is called with `partial: true` after a salvage. Add a test to `Studio.test.tsx` mirroring its existing analytics-assertion pattern (the suite already spies on `analytics`). Drive the recorder mock to `error` (track-failed), click "Save partial recording", let the mock deliver a `partial` result, assert `analytics.recordingStopped` received `partial: true`.

- [ ] **Step 7: Run web tests + visual verification**

Run: `pnpm --filter @record-me/web test`
Expected: PASS. Then Playwright MCP: drive a screen recording, stop the share via the browser pill, confirm the error pane shows both "Save partial recording" + "Start over", click save, confirm review pane + download works, console clean.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/record/_components/ErrorState.tsx apps/web/src/app/record/_components/ErrorState.test.tsx apps/web/src/app/record/_components/Studio.tsx apps/web/src/app/record/_components/Studio.test.tsx
git commit -m "feat(studio): save-partial-recording on track failure + partial analytics flag"
```

---

## Task C4: `cursor_highlight_disabled('not-record-me-tab')`

**Spec:** § 10.2 `cursor_highlight_disabled { reason: 'opt-out' | 'not-record-me-tab' }`. Today only `'opt-out'` fires. This completes the taxonomy.

**Approach:** When a screen mode starts with cursor highlights enabled but the chosen display surface is not this browser tab, in-tab click highlights cannot apply (spec § 7.3 honest scope). Detect via the screen track's `getSettings().displaySurface !== 'browser'` and surface a one-shot engine signal `onCursorScopeMissed`.

**Files:**

- Modify: `packages/recorder/src/types.ts` (add `onCursorScopeMissed?` to options)
- Modify: `packages/recorder/src/recorder.ts` (fire after start in screen modes)
- Modify: `packages/recorder/src/test/mocks/media-stream.ts` (add `getSettings()` to the track mock)
- Modify: `apps/web/src/hooks/use-recorder.ts` (expose `cursorScopeMissed` or pass a callback)
- Modify: `apps/web/src/app/record/_components/Studio.tsx` (map to analytics)

- [ ] **Step 1: Add `getSettings()` to the track mock**

In `packages/recorder/src/test/mocks/media-stream.ts`, add a configurable surface to `MockMediaStreamTrack`:

```ts
  public displaySurface: 'browser' | 'window' | 'monitor' | undefined;

  getSettings(): MediaTrackSettings {
    return this.displaySurface
      ? ({ displaySurface: this.displaySurface } as MediaTrackSettings)
      : ({} as MediaTrackSettings);
  }
```

- [ ] **Step 2: Write the failing engine test**

Create `packages/recorder/src/recorder.cursor-scope.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRecorder } from './recorder';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import { MockMediaStreamTrack } from './test/mocks/media-stream';
import { setDisplayMediaResponse, resetMediaDevices } from './test/mocks/media-devices';
import { flushAsync } from './test/factories';

afterEach(() => {
  MockMediaRecorder.reset();
  resetMediaDevices();
});

describe('createRecorder · cursor scope', () => {
  it('fires onCursorScopeMissed when highlights are on but the surface is a window', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onCursorScopeMissed = vi.fn();
    const handle = createRecorder({
      mode: 'screen+cursor',
      cursorHighlights: true,
      onCursorScopeMissed,
    });
    // Make the produced screen track report a non-browser surface.
    const origBuild = MockMediaStreamTrack.prototype.getSettings;
    vi.spyOn(MockMediaStreamTrack.prototype, 'getSettings').mockReturnValue({
      displaySurface: 'window',
    } as MediaTrackSettings);

    await handle.start();
    await flushAsync();
    expect(onCursorScopeMissed).toHaveBeenCalledTimes(1);

    vi.mocked(MockMediaStreamTrack.prototype.getSettings).mockRestore();
    void origBuild;
    handle.dispose();
  });

  it('does NOT fire when highlights are disabled', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onCursorScopeMissed = vi.fn();
    const handle = createRecorder({
      mode: 'screen+cursor',
      cursorHighlights: false,
      onCursorScopeMissed,
    });
    await handle.start();
    await flushAsync();
    expect(onCursorScopeMissed).not.toHaveBeenCalled();
    handle.dispose();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @record-me/recorder exec vitest run src/recorder.cursor-scope.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement the option + signal**

In `types.ts` `RecorderOptions`:

```ts
  /** Fired once after start() in a screen mode when cursorHighlights is on but the captured surface is not this tab (spec § 7.3, § 10.2). */
  onCursorScopeMissed?: () => void;
```

In `recorder.ts` `start()`, after `internal.composer.start();` and the highlights attach (and after `internal.acquired.screen` is known to exist), add:

```ts
if (resolved.cursorHighlights && resolved.mode !== 'cam-only' && internal.acquired.screen) {
  const surface = internal.acquired.screen.getSettings?.().displaySurface;
  if (surface && surface !== 'browser') {
    opts.onCursorScopeMissed?.();
  }
}
```

- [ ] **Step 5: Run the engine test to verify it passes**

Run: `pnpm --filter @record-me/recorder exec vitest run src/recorder.cursor-scope.test.ts`
Expected: PASS.

- [ ] **Step 6: Surface via the hook + map to analytics**

In `use-recorder.ts`, add `'onCursorScopeMissed'` to the `StartOptions` Omit, and wire the callback through to a new flag `cursorScopeMissed` (mirroring Task B1's pattern) OR accept a thin callback. Simplest: add `cursorScopeMissed: boolean` flag + reset on start/reset, set true on the callback. Add it to `UseRecorderApi` and the return.

In `Studio.tsx`, add an effect mirroring the others:

```tsx
// cursor_highlight_disabled('not-record-me-tab') analytics.
useEffect(() => {
  if (recorder.cursorScopeMissed) {
    analytics.cursorHighlightDisabled('not-record-me-tab');
  }
}, [recorder.cursorScopeMissed]);
```

- [ ] **Step 7: Run all tests + commit**

Run: `pnpm --filter @record-me/recorder test && pnpm --filter @record-me/web test`
Expected: PASS.

```bash
git add packages/recorder/src/types.ts packages/recorder/src/recorder.ts packages/recorder/src/test/mocks/media-stream.ts packages/recorder/src/recorder.cursor-scope.test.ts apps/web/src/hooks/use-recorder.ts apps/web/src/app/record/_components/Studio.tsx
git commit -m "feat: complete analytics taxonomy with cursor_highlight_disabled(not-record-me-tab)"
```

---

# Section D · `/record` SEO completion

> Independent of Sections A–C. UI/asset work — `frontend-design` applies to the OG card.

## Task D1: `/record` OG image

**Files:**

- Create: `apps/web/src/app/record/opengraph-image.tsx`

- [ ] **Step 1: Implement the OG image** (mirror `apps/web/src/app/privacy/opengraph-image.tsx`)

Create `apps/web/src/app/record/opengraph-image.tsx`:

```tsx
import { ogImage, SIZE } from '../_og/template';

export const size = SIZE;
export const contentType = 'image/png';
export const alt = 'record me — The studio';

export default function OgImage() {
  return ogImage({ title: 'Record your screen, camera, and cursor.', caption: 'studio' });
}
```

- [ ] **Step 2: Verify it renders**

Run: `pnpm --filter @record-me/web build`
Expected: build succeeds; `/record` now emits an `opengraph-image` route.

Then with the app running: `browser_navigate` to `http://localhost:3000/record/opengraph-image` and confirm a 1200×630 PNG renders with no fallback. (Or curl the route and confirm `content-type: image/png`.)

- [ ] **Step 3: Confirm metadata picks it up**

`/record/page.tsx` uses `buildMetadata({ path: '/record' })` which omits an explicit `og`; Next's file-based `opengraph-image` is auto-attached. Verify the page `<head>` includes `og:image` pointing at `/record/opengraph-image` (view source or `browser_evaluate`).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/record/opengraph-image.tsx
git commit -m "feat(seo): /record OG card"
```

---

## Task D2: `/record` JSON-LD

**Files:**

- Modify: `apps/web/src/app/record/page.tsx`

- [ ] **Step 1: Inject WebApplication + BreadcrumbList JSON-LD**

The builders already exist in `apps/web/src/lib/seo/json-ld.ts` (`webApplicationLd`, `breadcrumbLd`) and `JsonLd` in `apps/web/src/lib/seo/JsonLd.tsx`. Edit `apps/web/src/app/record/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { webApplicationLd, breadcrumbLd } from '@/lib/seo/json-ld';
import { JsonLd } from '@/lib/seo/JsonLd';
import { Studio } from './_components/Studio';

export const metadata: Metadata = buildMetadata({
  title: 'The studio',
  description:
    'Record your screen, camera, and cursor. No accounts, no upload — everything stays in your browser.',
  path: '/record',
});

export default function RecordPage() {
  return (
    <>
      <JsonLd
        data={[
          webApplicationLd(),
          breadcrumbLd([
            { name: 'record me', path: '/' },
            { name: 'The studio', path: '/record' },
          ]),
        ]}
      />
      <Studio />
    </>
  );
}
```

> Confirm `breadcrumbLd`'s parameter shape matches (`{ name, path }[]`) by reading `json-ld.ts`. If `webApplicationLd()` is already injected globally in `layout.tsx`, drop it here to avoid duplication and inject only the breadcrumb (verify whether layout-level `webApplicationLd` is sitewide or landing-only first).

- [ ] **Step 2: Add/extend the page test**

If `apps/web/src/app/record/page.test.tsx` does not exist, create a minimal RSC-metadata test asserting the JSON-LD is present, mirroring how `features/[mode]/page.tsx` is tested. Otherwise extend it.

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter @record-me/web build` then validate the `/record` `<script type="application/ld+json">` parses (paste into a JSON-LD validator or assert in test).

```bash
git add apps/web/src/app/record/page.tsx apps/web/src/app/record/page.test.tsx
git commit -m "feat(seo): /record WebApplication + BreadcrumbList JSON-LD"
```

---

# Section E · Lighthouse CI per-route budgets

## Task E1: Enforce `/` ≥ 0.95, `/record` ≥ 0.90 per route

**Spec:** § 8.5 / § 18 "Lighthouse ≥ 95 on `/`, ≥ 90 on `/record`; budgets enforced in CI." Today `lighthouserc.json` applies a single global `performance ≥ 0.9` to every URL.

**Files:**

- Modify: `lighthouserc.json`

- [ ] **Step 1: Split into per-route assertion matrices**

Lighthouse CI supports `assertMatrix` for per-URL assertions. Replace the `assert` block in `lighthouserc.json` with a matrix that holds the home page to 0.95 and the rest to 0.90. Keep the existing CWV thresholds.

```json
    "assert": {
      "assertMatrix": [
        {
          "matchingUrlPattern": "http://localhost:3000/$",
          "assertions": {
            "categories:performance": ["error", { "minScore": 0.95 }],
            "categories:accessibility": ["error", { "minScore": 0.95 }],
            "categories:best-practices": ["error", { "minScore": 0.95 }],
            "categories:seo": ["error", { "minScore": 0.95 }],
            "largest-contentful-paint": ["error", { "maxNumericValue": 1800 }],
            "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05 }],
            "interaction-to-next-paint": ["warn", { "maxNumericValue": 200 }]
          }
        },
        {
          "matchingUrlPattern": "http://localhost:3000/(record|privacy|changelog|features|docs).*",
          "assertions": {
            "categories:performance": ["error", { "minScore": 0.9 }],
            "categories:accessibility": ["error", { "minScore": 0.95 }],
            "categories:best-practices": ["error", { "minScore": 0.95 }],
            "categories:seo": ["error", { "minScore": 0.95 }],
            "largest-contentful-paint": ["error", { "maxNumericValue": 1800 }],
            "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05 }],
            "interaction-to-next-paint": ["warn", { "maxNumericValue": 200 }]
          }
        }
      ]
    },
```

Also add `http://localhost:3000/record` to the `collect.url` array (it is currently collected — confirm it is in the list; it is).

- [ ] **Step 2: Run Lighthouse locally**

Run: `pnpm build && pnpm lhci`
Expected: All URLs pass; `/` meets the 0.95 bars. If `/` regresses below 0.95, STOP and treat it as a perf bug (chrome-devtools-mcp `debug-optimize-lcp`) — do not lower the budget.

- [ ] **Step 3: Commit**

```bash
git add lighthouserc.json
git commit -m "ci: enforce per-route Lighthouse budgets (/ >= 0.95, others >= 0.90)"
```

---

# Section F · Production deployment + custom domain (operational)

> This section is operational, not code. It is **Carlo-driven** for any step requiring Vercel dashboard auth or DNS. The agent prepares, verifies, and documents; Carlo executes auth/DNS. Reference memory: record-me's Vercel **Root Directory must be `apps/web`**.

## Task F1: Ship to production on a custom domain

- [ ] **Step 1: Confirm the Vercel project + Root Directory**

Verify the linked Vercel project's Root Directory is `apps/web` (per saved memory `vercel-deploy-config`). If the Vercel CLI is installed, `vercel project ls` / `vercel link`; otherwise confirm via dashboard. Note: CLI is not currently installed — suggest `npm i -g vercel` if CLI-driven verification is wanted.

- [ ] **Step 2: Confirm env + analytics in production**

`@vercel/analytics` + `@vercel/speed-insights` are mounted in `layout.tsx` (Phase 1). Confirm they are active on the production deployment (Vercel dashboard → Analytics shows page views; Speed Insights shows CWV after traffic). No env vars are required for cookieless analytics.

- [ ] **Step 3: Verify preview deployments are enabled**

Confirm every PR to `main` produces a Vercel preview URL (spec § 18). This is default behaviour for connected repos — verify on the most recent PR.

- [ ] **Step 4: Add the custom domain (Carlo)**

In Vercel → Project → Domains, add the chosen domain and set DNS records as instructed. Confirm `siteConfig.url` (`apps/web/src/lib/seo/site-config.ts`) matches the production domain — if it changes, update it and re-verify canonical/OG/sitemap absolute URLs.

- [ ] **Step 5: Production smoke test**

After the domain resolves: load `/`, `/record`, `/privacy`, `/changelog`, `/features/screen-camera-cursor`, `/docs/getting-started` over HTTPS. Confirm CSP headers present (`docs/SECURITY.md`), no console errors, OG images resolve, `sitemap.xml`/`robots.txt` reachable, and a real recording downloads in Chrome + Firefox.

- [ ] **Step 6: Record the production URL** in `docs/PROGRESS.md` and the GitHub repo "About". No commit needed beyond doc sync (Section G).

---

# Section G · v1 done-checklist verification + doc sync

## Task G1: Walk spec § 18 and close the phase

**Files:**

- Modify: `docs/PROGRESS.md`, `docs/RECORDING.md`, `docs/SEO.md`, `docs/SECURITY.md` (if privacy copy can now be strengthened post-#60)

- [ ] **Step 1: Walk every spec § 18 checkbox** against the live production deployment. For each, record evidence (passing test, Lighthouse run, screenshot, or production URL). Any unchecked item → file an issue or a follow-up task; do not silently skip.

- [ ] **Step 2: Update `docs/RECORDING.md`** — document the new recorder public surface: `onStorageFallback`, `onMemoryPressure`, `memoryPressureChunkThreshold`, `onCursorScopeMissed`, `salvage()`, `RecordingResult.partial`, and the registry-backed sweep. The recorder public API section must match `packages/recorder/src/index.ts` / `types.ts` exactly.

- [ ] **Step 3: Update `docs/SEO.md`** — note `/record` now ships OG + WebApplication/BreadcrumbList JSON-LD, and the per-route Lighthouse matrix.

- [ ] **Step 4: Revisit `docs/SECURITY.md` + `/privacy` copy** — issue #60's Safari gap is now closed via the localStorage registry; if the privacy copy was qualified to describe the gap, tighten it to reflect the Safari-safe sweep. Keep `/privacy` and `docs/SECURITY.md` consistent.

- [ ] **Step 5: Update `docs/PROGRESS.md`** — check off all Phase 6 items, record completion date, and the production URL.

- [ ] **Step 6: Close GitHub issues** — close epic #6 and issue #60 with links to the merged PRs. (`/spawn-record-me-team` closes per-task issues automatically; this is the epic + #60 wrap-up.)

- [ ] **Step 7: Commit doc sync**

```bash
git add docs/PROGRESS.md docs/RECORDING.md docs/SEO.md docs/SECURITY.md apps/web/src/app/privacy
git commit -m "docs(phase-6): sync recorder API, SEO, privacy copy; mark v1 done"
```

---

## Self-Review (completed during planning)

**Spec coverage** (spec § 18 "v1 done" + § 10 + § 14):

- § 10.2 taxonomy → already firing; gaps closed by C3 (`partial`) + C4 (`not-record-me-tab`). ✓
- § 14 memory pressure → A2 + C1. ✓
- § 14 IDB fallback → A1 + C2. ✓
- § 14 track failure / save partial → A3 + B1 + C3. ✓
- § 8.5 / § 18 Lighthouse `/` ≥ 95 enforced → E1. ✓
- § 18 `/record` metadata/OG/JSON-LD → D1 + D2 (canonical already done). ✓
- § 18 deploy + custom domain + previews → F1. ✓
- Issue #60 → A4. ✓
- § 18 done-checklist walk + docs → G1. ✓

**Type consistency:** New engine surface is named identically everywhere — `onStorageFallback`, `onMemoryPressure`, `memoryPressureChunkThreshold`, `onCursorScopeMissed`, `salvage()`, `RecordingResult.partial`. Hook exposes `memoryPressure`, `storageFallback`, `cursorScopeMissed`, `savePartial()`. Studio reads `recorder.result.partial`.

**Known soft spots flagged for the implementer (verify, don't assume):**

1. A1 Step 8 IDB-open spy may be brittle under `fake-indexeddb` — the unit test (Step 1) is the real proof; an injection seam is an acceptable alternative.
2. B1 / C4 hook tests must reuse the existing `use-recorder.test.ts` mock seam — do not introduce a second mocking style.
3. C1/C2 `amber` token must exist in `docs/DESIGN.md` / `packages/ui` — use the established warning tone if not; never invent a hex.
4. D2 — verify whether `webApplicationLd()` is already injected sitewide in `layout.tsx` before adding it to `/record` (avoid duplicate JSON-LD).
5. E1 — confirm LHCI `assertMatrix` semantics against the installed `@lhci/cli` version; the `matchingUrlPattern` for `/` uses `/$` to avoid matching sub-routes.

---

## Execution Handoff

After review, recommended path: **`/spawn-record-me-team`** against this plan — the 6-member team routes Section A/E to staff, B (engine-contract) to staff, C/D to sr-frontend, e2e to the e2e agent, docs to scribe, and the principal clears CRITICAL+MAJOR before each merge. Section F is operational (Carlo-driven auth/DNS).
