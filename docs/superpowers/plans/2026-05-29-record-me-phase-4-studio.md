# Phase 4 · Studio (`/record`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/record` studio — pick a mode, set a cap, grant permissions once, watch a faithful live composite preview, stop, review, and download — wiring the Phase 3 `@record-me/recorder` engine to a persistent-`StudioShell` UI.

**Architecture:** Three additive engine callbacks (`onResult`, `onPreviewReady`) + a structured `subject` on `RecorderError` close the engine's consumer gaps. A `useRecorder()` hook exposes reactive state. One `'use client'` `<Studio>` orchestrator renders a single `<StudioShell>` that evolves `setup → live → review`; `page.tsx` stays an RSC for metadata. Analytics (`lib/analytics.ts`) fires the studio events. Capability + device gating come from the engine's `probeCapabilities()`.

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, TypeScript, Tailwind v4 (token preset), `@record-me/recorder`, `@record-me/ui`, `@vercel/analytics`, Vitest + jsdom + React Testing Library, Playwright.

**Spec:** [`docs/superpowers/specs/2026-05-29-record-me-phase-4-studio-design.md`](../specs/2026-05-29-record-me-phase-4-studio-design.md)

**Deviations from spec (deliberate, flagged):**

1. **`permission_denied { kind }` is accurate, not best-effort.** Spec §13 marked the device kind as "infer from mode / out of scope." The engine's `mapDomException` already knows the subject, so Task 1 adds a structured `subject` field — strictly better, ~5 lines.
2. **Track-failure → "interrupted, start over", not "save partial".** Spec §8/§14 lists "Save partial recording", but the engine cannot assemble a blob from the `error` state (`stop()` rejects in `error`, and there is no assemble-on-error path). Implementing partial-save needs engine work we deliberately deferred. Track-failure therefore shows an interrupted-error state with **Start over**. `recording_stopped { partial: true }` is consequently not emitted in Phase 4 (the `partial` param stays in the helper for forward-compat).

---

## File structure

**Created**

| File                                                       | Responsibility                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `apps/web/src/test/setup.ts`                               | Vitest setup: register `@testing-library/jest-dom` matchers |
| `apps/web/src/test/harness.test.tsx`                       | Sanity test proving RTL + jsdom + jest-dom work             |
| `apps/web/src/hooks/use-recorder.ts`                       | React wrapper around `createRecorder()`                     |
| `apps/web/src/hooks/use-recorder.test.ts`                  | Hook behavior tests (mocked engine)                         |
| `apps/web/src/lib/analytics.ts`                            | Typed `track()` wrapper — 7 studio events                   |
| `apps/web/src/lib/analytics.test.ts`                       | Analytics emit tests (mocked `track`)                       |
| `apps/web/src/lib/capabilities.ts`                         | `probeCapabilities()` → studio modes + browser name         |
| `apps/web/src/lib/capabilities.test.ts`                    | Capability derivation tests                                 |
| `apps/web/src/lib/format.ts`                               | `formatDuration` / `formatMegabytes` / `capMinutesToMs`     |
| `apps/web/src/lib/format.test.ts`                          | Format util tests                                           |
| `apps/web/src/app/record/_components/studio-phase.ts`      | Pure `derivePhase()` + `StudioPhase` type                   |
| `apps/web/src/app/record/_components/studio-phase.test.ts` | Phase derivation tests                                      |
| `apps/web/src/app/record/_components/ModePicker.tsx`       | Triptych mode picker (reuses `ModeCard`)                    |
| `apps/web/src/app/record/_components/ModePicker.test.tsx`  |                                                             |
| `apps/web/src/app/record/_components/CapSelector.tsx`      | Cap + resolution + warning + cursor toggle                  |
| `apps/web/src/app/record/_components/CapSelector.test.tsx` |                                                             |
| `apps/web/src/app/record/_components/LivePreview.tsx`      | `<video srcObject>` composite mirror                        |
| `apps/web/src/app/record/_components/ReviewPane.tsx`       | `<video src controls>` review body                          |
| `apps/web/src/app/record/_components/ErrorState.tsx`       | Editorial error cards per kind                              |
| `apps/web/src/app/record/_components/UnsupportedState.tsx` | Browser-unsupported gate                                    |
| `apps/web/src/app/record/_components/Studio.tsx`           | `'use client'` orchestrator                                 |
| `apps/web/src/app/record/_components/Studio.test.tsx`      | Studio integration test (mocked engine)                     |
| `apps/web/src/app/record/layout.tsx`                       | Minimal studio chrome (WordMark + privacy note)             |
| `apps/web/tests/e2e/record.spec.ts`                        | E2E: Mode C live; A/B gated UI                              |

**Modified**

| File                                                        | Change                                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `packages/recorder/src/types.ts`                            | `+ PermissionSubject`, `+ subject` on `RecorderErrorLike`, `+ onResult`/`onPreviewReady` on `RecorderOptions` |
| `packages/recorder/src/errors.ts`                           | Import `PermissionSubject` from types; `+ subject` field + ctor option; set in `mapDomException`              |
| `packages/recorder/src/recorder.ts`                         | Fire `onResult` in `stop()`; fire `onPreviewReady` in `start()`                                               |
| `packages/recorder/src/index.ts`                            | Re-export `PermissionSubject` from `./types`                                                                  |
| `packages/recorder/src/recorder.test.ts`                    | `+` tests for `onResult`, `onPreviewReady`, `subject`                                                         |
| `apps/web/package.json`                                     | `+` RTL devDeps                                                                                               |
| `apps/web/vitest.config.ts`                                 | `+ setupFiles: ['./src/test/setup.ts']`                                                                       |
| `apps/web/src/app/record/page.tsx`                          | Replace placeholder: RSC metadata + `<Studio/>`                                                               |
| `docs/FRONTEND.md`, `docs/RECORDING.md`, `docs/PROGRESS.md` | Update on completion (Task 11)                                                                                |
| `README.md`, `.github/assets/readme/studio.png`             | Recapture from real `/record` (Task 11)                                                                       |

---

## Task 1: Engine consumer hooks (`onResult`, `onPreviewReady`, error `subject`)

**Owner:** staff · **Blocks:** Tasks 3, 8

**Files:**

- Modify: `packages/recorder/src/types.ts`
- Modify: `packages/recorder/src/errors.ts`
- Modify: `packages/recorder/src/recorder.ts`
- Modify: `packages/recorder/src/index.ts`
- Test: `packages/recorder/src/recorder.test.ts`, `packages/recorder/src/errors.test.ts`

- [ ] **Step 1: Write failing tests for the three additions**

Append to the `describe('createRecorder · auto-stop and error surfaces', ...)` block in `packages/recorder/src/recorder.test.ts` (it already sets fake timers + `setUserMediaResponse` in `beforeEach`). Add `setDisplayMediaResponse` to the existing import from `./test/mocks/media-devices`.

```ts
it('onResult fires with the result on a manual stop', async () => {
  const onResult = vi.fn();
  const handle = createRecorder({ mode: 'cam-only', onResult });
  await handle.start();
  MockMediaRecorder.instances[0]!._emitChunk(1024);
  const result = await handle.stop();
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult.mock.calls[0]![0]).toBe(result);
  await result.release();
  handle.dispose();
});

it('onResult fires on auto-stop even though stop()’s return is discarded', async () => {
  const onResult = vi.fn();
  const handle = createRecorder({ mode: 'cam-only', maxDurationMs: 5_000, onResult });
  await handle.start();
  MockMediaRecorder.instances[0]!._emitChunk(512);
  vi.advanceTimersByTime(4_900);
  await flushAsync();
  await flushAsync();
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult.mock.calls[0]![0]).toMatchObject({ bytes: 512 });
  handle.dispose();
});

it('onPreviewReady fires once after start with a video-only stream', async () => {
  const onPreviewReady = vi.fn();
  const handle = createRecorder({ mode: 'cam-only', onPreviewReady });
  await handle.start();
  expect(onPreviewReady).toHaveBeenCalledTimes(1);
  const stream = onPreviewReady.mock.calls[0]![0] as MediaStream;
  expect(stream.getVideoTracks().length).toBeGreaterThanOrEqual(1);
  expect(stream.getAudioTracks().length).toBe(0);
  handle.dispose();
});

it('camera permission denial carries subject "camera"', async () => {
  setUserMediaResponse({ kind: 'reject', error: new DOMException('denied', 'NotAllowedError') });
  const handle = createRecorder({ mode: 'cam-only' });
  await expect(handle.start()).rejects.toMatchObject({
    kind: 'permission-denied',
    subject: 'camera',
  });
  handle.dispose();
});

it('screen permission denial carries subject "screen"', async () => {
  setDisplayMediaResponse({ kind: 'reject', error: new DOMException('denied', 'NotAllowedError') });
  const handle = createRecorder({ mode: 'screen+cursor' });
  await expect(handle.start()).rejects.toMatchObject({
    kind: 'permission-denied',
    subject: 'screen',
  });
  handle.dispose();
});
```

- [ ] **Step 2: Run the tests — verify they fail**

Run: `pnpm --filter @record-me/recorder exec vitest run src/recorder.test.ts -t "onResult"`
Expected: FAIL — `onResult`/`onPreviewReady` are not in `RecorderOptions` (type error) and `subject` is undefined.

- [ ] **Step 3: Add the public types**

In `packages/recorder/src/types.ts`, add the `PermissionSubject` type near the top and extend the three interfaces:

```ts
export type PermissionSubject = 'screen' | 'camera' | 'mic';
```

Add to `RecorderOptions` (after `onError`):

```ts
  onResult?: (result: RecordingResult) => void;
  onPreviewReady?: (stream: MediaStream) => void;
```

Add to `RecorderErrorLike` (after `kind`):

```ts
  readonly subject?: PermissionSubject;
```

- [ ] **Step 4: Move `PermissionSubject` to types and set `subject` in errors**

In `packages/recorder/src/errors.ts`, replace the local type declaration and thread `subject` through:

```ts
import type { RecorderErrorKind, PermissionSubject } from './types';

export class RecorderError extends Error {
  public readonly kind: RecorderErrorKind;
  public readonly subject?: PermissionSubject;
  public override readonly cause?: unknown;

  constructor(
    kind: RecorderErrorKind,
    message: string,
    options?: { cause?: unknown; subject?: PermissionSubject },
  ) {
    super(message);
    this.name = 'RecorderError';
    this.kind = kind;
    if (options?.subject) this.subject = options.subject;
    if (options && 'cause' in options) this.cause = options.cause;
  }

  toJSON(): {
    name: string;
    kind: RecorderErrorKind;
    subject?: PermissionSubject;
    message: string;
  } {
    return { name: this.name, kind: this.kind, subject: this.subject, message: this.message };
  }
}

export function mapDomException(input: unknown, subject: PermissionSubject): RecorderError {
  if (input instanceof DOMException) {
    if (input.name === 'NotAllowedError') {
      return new RecorderError('permission-denied', `${subject} permission denied`, {
        cause: input,
        subject,
      });
    }
    return new RecorderError('track-failed', `${subject} track unavailable: ${input.message}`, {
      cause: input,
      subject,
    });
  }
  const message = input instanceof Error ? input.message : String(input);
  return new RecorderError('track-failed', `${subject} acquisition failed: ${message}`, {
    cause: input,
    subject,
  });
}
```

In `packages/recorder/src/index.ts`, change the `PermissionSubject` re-export source:

```ts
export type { PermissionSubject } from './types';
```

(Remove `PermissionSubject` from the `export type { ... } from './errors'` line if present; keep `export { RecorderError } from './errors';`.)

- [ ] **Step 5: Fire `onResult` in `stop()` and `onPreviewReady` in `start()`**

In `packages/recorder/src/recorder.ts`, inside `start()` immediately after `const videoStream = internal.composer.captureStream();`:

```ts
const videoStream = internal.composer.captureStream();
// Phase 4: expose a video-only composite stream for the live preview.
opts.onPreviewReady?.(new MediaStream(videoStream.getVideoTracks()));
```

In `stop()`, replace the inline `return { ... }` with a named result fired through `onResult`:

```ts
setState('ready');

let released = false;
const result: RecordingResult = {
  blob,
  url,
  mimeType,
  durationMs,
  bytes: blob.size,
  suggestedFilename: filename,
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
// Phase 4: deliver the result through one channel so user-stop AND
// auto-stop (which discards stop()’s return) both reach the consumer.
opts.onResult?.(result);
return result;
```

- [ ] **Step 6: Run the new tests — verify they pass**

Run: `pnpm --filter @record-me/recorder exec vitest run src/recorder.test.ts -t "onResult|onPreviewReady|subject"`
Expected: PASS (5 tests).

- [ ] **Step 7: Run the full recorder suite + coverage gate**

Run: `pnpm --filter @record-me/recorder test`
Expected: PASS, coverage ≥ 90% (the new branches are covered by Step 1’s tests).

- [ ] **Step 8: Commit**

```bash
git add packages/recorder/src
git commit -m "feat(recorder): onResult + onPreviewReady callbacks and error subject"
```

---

## Task 2: Web component-test harness (React Testing Library)

**Owner:** sr-frontend · **Blocks:** Tasks 3–8

**Files:**

- Modify: `apps/web/package.json`
- Modify: `apps/web/vitest.config.ts`
- Create: `apps/web/src/test/setup.ts`
- Test: `apps/web/src/test/harness.test.tsx`

- [ ] **Step 1: Add RTL devDependencies**

Run:

```bash
pnpm --filter @record-me/web add -D @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14 @testing-library/dom@^10
```

- [ ] **Step 2: Create the Vitest setup file**

`apps/web/src/test/setup.ts`:

```ts
// Registers jest-dom matchers (toBeInTheDocument, toBeDisabled, …) for Vitest.
// RTL auto-cleanup activates because vitest runs with globals: true.
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Wire setupFiles into the Vitest config**

`apps/web/vitest.config.ts` — add `setupFiles` to the `test` block:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', '.turbo', 'tests/e2e/**'],
  },
});
```

- [ ] **Step 4: Write the harness sanity test**

`apps/web/src/test/harness.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetaChip } from '@record-me/ui';

describe('test harness', () => {
  it('renders a primitive and matches jest-dom', () => {
    render(<MetaChip>live</MetaChip>);
    expect(screen.getByText('live')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the harness test — verify it passes**

Run: `pnpm --filter @record-me/web test`
Expected: PASS (1 test). Confirms RTL + jsdom + jest-dom resolve.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/src/test pnpm-lock.yaml
git commit -m "test(web): add React Testing Library harness"
```

---

## Task 3: `useRecorder` hook

**Owner:** sr-frontend · **Depends:** Tasks 1, 2 · **Blocks:** Task 8

**Files:**

- Create: `apps/web/src/hooks/use-recorder.ts`
- Test: `apps/web/src/hooks/use-recorder.test.ts`

- [ ] **Step 1: Write the failing hook tests (mocked engine)**

`apps/web/src/hooks/use-recorder.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Capture each created handle so tests can drive its callbacks.
const handles: any[] = [];
vi.mock('@record-me/recorder', () => ({
  createRecorder: (opts: any) => {
    const handle = {
      opts,
      start: vi.fn(async () => {
        opts.onStateChange?.('requesting-permissions');
        opts.onPreviewReady?.({ id: 'preview' });
        opts.onStateChange?.('recording');
      }),
      pause: vi.fn(() => opts.onStateChange?.('paused')),
      resume: vi.fn(() => opts.onStateChange?.('recording')),
      stop: vi.fn(async () => {
        opts.onStateChange?.('finalizing');
        const result = {
          blob: new Blob(['x']),
          url: 'blob:mock',
          mimeType: 'video/mp4',
          durationMs: 1234,
          bytes: 1,
          suggestedFilename: 'record-me.mp4',
          release: vi.fn(async () => {}),
        };
        opts.onStateChange?.('ready');
        opts.onResult?.(result);
        return result;
      }),
      dispose: vi.fn(),
    };
    handles.push(handle);
    return handle;
  },
}));

import { useRecorder } from './use-recorder';

beforeEach(() => {
  handles.length = 0;
});

describe('useRecorder', () => {
  it('starts in idle with zeroed counters', () => {
    const { result } = renderHook(() => useRecorder());
    expect(result.current.state).toBe('idle');
    expect(result.current.durationMs).toBe(0);
    expect(result.current.bytes).toBe(0);
    expect(result.current.result).toBeNull();
    expect(result.current.previewStream).toBeNull();
  });

  it('start() creates a recorder with the given mode and reaches recording', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    expect(handles[0].opts.mode).toBe('cam-only');
    expect(result.current.state).toBe('recording');
    expect(result.current.previewStream).toEqual({ id: 'preview' });
  });

  it('forwards duration and bytes ticks to state', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    act(() => {
      handles[0].opts.onDurationTick(2500);
      handles[0].opts.onBytesTick(4096);
    });
    expect(result.current.durationMs).toBe(2500);
    expect(result.current.bytes).toBe(4096);
  });

  it('stop() populates result via onResult and reaches ready', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    await act(async () => {
      result.current.stop();
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.result?.suggestedFilename).toBe('record-me.mp4');
  });

  it('onError populates the error state', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    act(() => {
      handles[0].opts.onError({
        name: 'RecorderError',
        kind: 'permission-denied',
        message: 'x',
        subject: 'camera',
      });
    });
    expect(result.current.error?.kind).toBe('permission-denied');
    expect(result.current.error?.subject).toBe('camera');
  });

  it('reset() releases the result and returns to idle', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    await act(async () => {
      result.current.stop();
    });
    const released = result.current.result!.release as ReturnType<typeof vi.fn>;
    await act(async () => {
      await result.current.reset();
    });
    expect(released).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('disposes the recorder on unmount', async () => {
    const { result, unmount } = renderHook(() => useRecorder());
    await act(async () => {
      await result.current.start({ mode: 'cam-only' });
    });
    unmount();
    expect(handles[0].dispose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests — verify they fail**

Run: `pnpm --filter @record-me/web exec vitest run src/hooks/use-recorder.test.ts`
Expected: FAIL — `./use-recorder` does not exist.

- [ ] **Step 3: Implement the hook**

`apps/web/src/hooks/use-recorder.ts`:

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createRecorder,
  type RecorderHandle,
  type RecorderOptions,
  type RecorderState,
  type RecordingResult,
  type RecorderErrorLike,
} from '@record-me/recorder';

/** Options the caller supplies at start() — the hook owns all engine callbacks. */
export type StartOptions = Omit<
  RecorderOptions,
  'onStateChange' | 'onDurationTick' | 'onBytesTick' | 'onError' | 'onResult' | 'onPreviewReady'
>;

export interface UseRecorderApi {
  state: RecorderState;
  durationMs: number;
  bytes: number;
  previewStream: MediaStream | null;
  result: RecordingResult | null;
  error: RecorderErrorLike | null;
  start: (opts: StartOptions) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => Promise<void>;
}

export function useRecorder(): UseRecorderApi {
  const [state, setState] = useState<RecorderState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState<RecorderErrorLike | null>(null);
  const handleRef = useRef<RecorderHandle | null>(null);

  const start = useCallback(async (opts: StartOptions) => {
    setDurationMs(0);
    setBytes(0);
    setResult(null);
    setError(null);
    const handle = createRecorder({
      ...opts,
      onStateChange: setState,
      onDurationTick: setDurationMs,
      onBytesTick: setBytes,
      onPreviewReady: setPreviewStream,
      onResult: setResult,
      onError: setError,
    });
    handleRef.current = handle;
    // Failures surface through onError → `error`; swallow the rejection so the
    // component tree never sees an unhandled promise.
    try {
      await handle.start();
    } catch {
      /* surfaced via onError */
    }
  }, []);

  const pause = useCallback(() => handleRef.current?.pause(), []);
  const resume = useCallback(() => handleRef.current?.resume(), []);

  const stop = useCallback(() => {
    // The result arrives via onResult — ignore stop()’s returned value.
    void handleRef.current?.stop().catch(() => {
      /* surfaced via onError */
    });
  }, []);

  const reset = useCallback(async () => {
    await result?.release();
    setPreviewStream(null);
    setResult(null);
    setError(null);
    setDurationMs(0);
    setBytes(0);
    setState('idle');
  }, [result]);

  // Stop tracks + wipe IDB if the user navigates away mid-session.
  useEffect(() => {
    return () => {
      handleRef.current?.dispose();
    };
  }, []);

  return {
    state,
    durationMs,
    bytes,
    previewStream,
    result,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
```

- [ ] **Step 4: Run the tests — verify they pass**

Run: `pnpm --filter @record-me/web exec vitest run src/hooks/use-recorder.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks
git commit -m "feat(web): useRecorder hook"
```

---

## Task 4: Studio libs — analytics, capabilities, format

**Owner:** sr-frontend · **Depends:** Task 2 · **Blocks:** Tasks 5, 7, 8

**Files:**

- Create: `apps/web/src/lib/analytics.ts`, `apps/web/src/lib/capabilities.ts`, `apps/web/src/lib/format.ts`
- Test: matching `*.test.ts`

- [ ] **Step 1: Write failing tests for `format.ts`**

`apps/web/src/lib/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatDuration, formatMegabytes, capMinutesToMs } from './format';

describe('format', () => {
  it('formats durations as mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(42_000)).toBe('00:42');
    expect(formatDuration(605_000)).toBe('10:05');
    expect(formatDuration(-100)).toBe('00:00');
  });
  it('formats megabytes to one decimal', () => {
    expect(formatMegabytes(12_400_000)).toBe('12.4 MB');
    expect(formatMegabytes(0)).toBe('0.0 MB');
  });
  it('converts cap minutes to ms', () => {
    expect(capMinutesToMs(10)).toBe(600_000);
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/format.test.ts`
Expected: FAIL — `./format` not found.

- [ ] **Step 3: Implement `format.ts`**

`apps/web/src/lib/format.ts`:

```ts
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatMegabytes(bytes: number): string {
  return `${(Math.max(0, bytes) / 1_000_000).toFixed(1)} MB`;
}

export function capMinutesToMs(minutes: number): number {
  return minutes * 60_000;
}
```

- [ ] **Step 4: Run — verify pass**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/format.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write failing tests for `capabilities.ts`**

`apps/web/src/lib/capabilities.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveStudioCapabilities, browserName } from './capabilities';
import type { CapabilityReport } from '@record-me/recorder';

const base: CapabilityReport = {
  hasMediaRecorder: true,
  hasGetDisplayMedia: true,
  hasGetUserMedia: true,
  supportedMimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  isSafari: false,
  isMobile: false,
};

describe('deriveStudioCapabilities', () => {
  it('desktop with full support offers all three modes', () => {
    const caps = deriveStudioCapabilities(base);
    expect(caps.supported).toBe(true);
    expect(caps.availableModes).toEqual(['screen+cam+cursor', 'screen+cursor', 'cam-only']);
  });
  it('mobile drops the screen modes', () => {
    const caps = deriveStudioCapabilities({ ...base, isMobile: true });
    expect(caps.availableModes).toEqual(['cam-only']);
  });
  it('no getDisplayMedia drops the screen modes', () => {
    const caps = deriveStudioCapabilities({ ...base, hasGetDisplayMedia: false });
    expect(caps.availableModes).toEqual(['cam-only']);
  });
  it('no MediaRecorder means unsupported', () => {
    const caps = deriveStudioCapabilities({ ...base, hasMediaRecorder: false });
    expect(caps.supported).toBe(false);
  });
  it('no supported MIME means unsupported', () => {
    const caps = deriveStudioCapabilities({ ...base, supportedMimeType: null });
    expect(caps.supported).toBe(false);
  });
});

describe('browserName', () => {
  it('detects common browsers', () => {
    expect(browserName('Mozilla/5.0 ... Chrome/120 Safari/537')).toBe('Chrome');
    expect(browserName('Mozilla/5.0 ... Firefox/121')).toBe('Firefox');
    expect(browserName('Mozilla/5.0 ... Version/17 Safari/605')).toBe('Safari');
    expect(browserName('Mozilla/5.0 ... Edg/120')).toBe('Edge');
    expect(browserName('something weird')).toBe('Unknown');
  });
});
```

- [ ] **Step 6: Run — verify fail**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/capabilities.test.ts`
Expected: FAIL — `./capabilities` not found.

- [ ] **Step 7: Implement `capabilities.ts`**

`apps/web/src/lib/capabilities.ts`:

```ts
import { probeCapabilities, type CapabilityReport, type RecordMode } from '@record-me/recorder';

export interface StudioCapabilities extends CapabilityReport {
  /** True if the browser can record at least one mode. */
  supported: boolean;
  /** Modes selectable on this device, in A → B → C order. */
  availableModes: RecordMode[];
}

export function deriveStudioCapabilities(report: CapabilityReport): StudioCapabilities {
  const supported =
    report.hasMediaRecorder && report.hasGetUserMedia && Boolean(report.supportedMimeType);
  const screenCapable = report.hasGetDisplayMedia && !report.isMobile;
  const availableModes: RecordMode[] = [];
  if (screenCapable) availableModes.push('screen+cam+cursor', 'screen+cursor');
  if (report.hasGetUserMedia) availableModes.push('cam-only');
  return { ...report, supported, availableModes };
}

export function browserName(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome|chromium|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Unknown';
}

/** Client-only. Call inside an effect — `probeCapabilities` reads `navigator`. */
export function getStudioCapabilities(): StudioCapabilities {
  return deriveStudioCapabilities(probeCapabilities());
}
```

- [ ] **Step 8: Run — verify pass**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/capabilities.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 9: Write failing tests for `analytics.ts`**

`apps/web/src/lib/analytics.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }));
import { track } from '@vercel/analytics';
import { analytics } from './analytics';

beforeEach(() => vi.clearAllMocks());

describe('analytics', () => {
  it('modeSelected', () => {
    analytics.modeSelected('cam-only');
    expect(track).toHaveBeenCalledWith('mode_selected', { mode: 'cam-only' });
  });
  it('recordingStarted', () => {
    analytics.recordingStarted({ mode: 'screen+cursor', resolution: '1080p', cap_minutes: 10 });
    expect(track).toHaveBeenCalledWith('recording_started', {
      mode: 'screen+cursor',
      resolution: '1080p',
      cap_minutes: 10,
    });
  });
  it('recordingStopped omits partial when undefined', () => {
    analytics.recordingStopped({
      mode: 'cam-only',
      duration_seconds: 42,
      bytes: 100,
      mime_type: 'video/mp4',
    });
    expect(track).toHaveBeenCalledWith('recording_stopped', {
      mode: 'cam-only',
      duration_seconds: 42,
      bytes: 100,
      mime_type: 'video/mp4',
    });
  });
  it('recordingDownloaded', () => {
    analytics.recordingDownloaded({
      mode: 'cam-only',
      duration_seconds: 42,
      bytes: 100,
      mime_type: 'video/mp4',
    });
    expect(track).toHaveBeenCalledWith(
      'recording_downloaded',
      expect.objectContaining({ mode: 'cam-only' }),
    );
  });
  it('permissionDenied', () => {
    analytics.permissionDenied('camera');
    expect(track).toHaveBeenCalledWith('permission_denied', { kind: 'camera' });
  });
  it('browserUnsupported', () => {
    analytics.browserUnsupported({ feature: 'MediaRecorder', ua_browser: 'Safari' });
    expect(track).toHaveBeenCalledWith('browser_unsupported', {
      feature: 'MediaRecorder',
      ua_browser: 'Safari',
    });
  });
  it('cursorHighlightDisabled', () => {
    analytics.cursorHighlightDisabled('opt-out');
    expect(track).toHaveBeenCalledWith('cursor_highlight_disabled', { reason: 'opt-out' });
  });
});
```

- [ ] **Step 10: Run — verify fail**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/analytics.test.ts`
Expected: FAIL — `./analytics` not found.

- [ ] **Step 11: Implement `analytics.ts`**

`apps/web/src/lib/analytics.ts`:

```ts
import { track } from '@vercel/analytics';
import type { RecordMode, RecordingResolution } from '@record-me/recorder';

export type PermissionDeviceKind = 'screen' | 'camera' | 'mic';
export type CursorDisabledReason = 'opt-out' | 'not-record-me-tab';

/**
 * Typed, zero-PII wrapper over Vercel Analytics (parent spec §10.2, §15).
 * The studio is the only emit site for these events.
 */
export const analytics = {
  modeSelected(mode: RecordMode): void {
    track('mode_selected', { mode });
  },
  recordingStarted(p: {
    mode: RecordMode;
    resolution: RecordingResolution;
    cap_minutes: number;
  }): void {
    track('recording_started', {
      mode: p.mode,
      resolution: p.resolution,
      cap_minutes: p.cap_minutes,
    });
  },
  recordingStopped(p: {
    mode: RecordMode;
    duration_seconds: number;
    bytes: number;
    mime_type: string;
    partial?: boolean;
  }): void {
    const props: Record<string, string | number | boolean> = {
      mode: p.mode,
      duration_seconds: p.duration_seconds,
      bytes: p.bytes,
      mime_type: p.mime_type,
    };
    if (p.partial !== undefined) props.partial = p.partial;
    track('recording_stopped', props);
  },
  recordingDownloaded(p: {
    mode: RecordMode;
    duration_seconds: number;
    bytes: number;
    mime_type: string;
  }): void {
    track('recording_downloaded', {
      mode: p.mode,
      duration_seconds: p.duration_seconds,
      bytes: p.bytes,
      mime_type: p.mime_type,
    });
  },
  permissionDenied(kind: PermissionDeviceKind): void {
    track('permission_denied', { kind });
  },
  browserUnsupported(p: { feature: string; ua_browser: string }): void {
    track('browser_unsupported', { feature: p.feature, ua_browser: p.ua_browser });
  },
  cursorHighlightDisabled(reason: CursorDisabledReason): void {
    track('cursor_highlight_disabled', { reason });
  },
};
```

- [ ] **Step 12: Run — verify pass**

Run: `pnpm --filter @record-me/web exec vitest run src/lib/analytics.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 13: Commit**

```bash
git add apps/web/src/lib
git commit -m "feat(web): studio analytics, capabilities, and format libs"
```

---

## Task 5: Setup components — `ModePicker` + `CapSelector`

**Owner:** sr-frontend · **Depends:** Tasks 2, 4 · **Blocks:** Task 8

> Run `frontend-design` before polishing visuals; the code below is a working, on-brand baseline whose **props and behavior are the contract** the tests pin. Refine styling without changing the prop API.

**Files:**

- Create: `apps/web/src/app/record/_components/ModePicker.tsx` (+ `.test.tsx`)
- Create: `apps/web/src/app/record/_components/CapSelector.tsx` (+ `.test.tsx`)

- [ ] **Step 1: Write failing `ModePicker` tests**

`apps/web/src/app/record/_components/ModePicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModePicker } from './ModePicker';

describe('ModePicker', () => {
  it('renders the three mode titles', () => {
    render(
      <ModePicker
        selected="screen+cursor"
        available={['screen+cam+cursor', 'screen+cursor', 'cam-only']}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Screen + Camera + Cursor')).toBeInTheDocument();
    expect(screen.getByText('Screen + Cursor')).toBeInTheDocument();
    expect(screen.getByText('Camera only')).toBeInTheDocument();
  });

  it('calls onSelect with the clicked mode', async () => {
    const onSelect = vi.fn();
    render(
      <ModePicker
        selected="screen+cursor"
        available={['screen+cam+cursor', 'screen+cursor', 'cam-only']}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole('radio', { name: /Camera only/ }));
    expect(onSelect).toHaveBeenCalledWith('cam-only');
  });

  it('disables modes not in `available` and does not select them', async () => {
    const onSelect = vi.fn();
    render(<ModePicker selected="cam-only" available={['cam-only']} onSelect={onSelect} />);
    const screenCard = screen.getByRole('radio', { name: /Screen \+ Camera \+ Cursor/ });
    expect(screenCard).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screenCard);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/ModePicker.test.tsx`
Expected: FAIL — `./ModePicker` not found.

- [ ] **Step 3: Implement `ModePicker`**

`apps/web/src/app/record/_components/ModePicker.tsx`:

```tsx
'use client';

import type { RecordMode } from '@record-me/recorder';
import { ModeCard, cn } from '@record-me/ui';

interface ModeMeta {
  mode: RecordMode;
  eyebrow: string;
  title: string;
  description: string;
}

const MODES: ModeMeta[] = [
  {
    mode: 'screen+cam+cursor',
    eyebrow: 'A · the full recital',
    title: 'Screen + Camera + Cursor',
    description: 'Picture-in-picture camera, click highlights, the whole show.',
  },
  {
    mode: 'screen+cursor',
    eyebrow: 'B · just the work',
    title: 'Screen + Cursor',
    description: 'Clean walk-throughs and demos. No camera, no distraction.',
  },
  {
    mode: 'cam-only',
    eyebrow: 'C · talking head',
    title: 'Camera only',
    description: 'Async updates, round-framed and centered.',
  },
];

export interface ModePickerProps {
  selected: RecordMode;
  available: RecordMode[];
  onSelect: (mode: RecordMode) => void;
}

// ModeCard renders an <article> (with an <h3>), so it cannot live inside a
// <button> (invalid HTML). Instead ModeCard itself becomes the radio via role
// + aria, with keyboard activation. aria-disabled (not the `disabled` attr,
// which <article> doesn't support) gates unavailable modes.
export function ModePicker({ selected, available, onSelect }: ModePickerProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-2xl leading-tight text-ivory sm:text-3xl">
        Choose your <em className="italic text-amber">composition</em>.
      </h2>
      <div
        role="radiogroup"
        aria-label="Recording mode"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {MODES.map((m) => {
          const disabled = !available.includes(m.mode);
          const isSelected = selected === m.mode;
          const select = () => {
            if (!disabled) onSelect(m.mode);
          };
          return (
            <ModeCard
              key={m.mode}
              eyebrow={m.eyebrow}
              title={m.title}
              description={m.description}
              accent={isSelected}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={disabled}
              aria-label={m.title}
              tabIndex={disabled ? -1 : 0}
              onClick={select}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  select();
                }
              }}
              className={cn(
                'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/50',
                disabled && 'cursor-not-allowed opacity-40',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — verify pass**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/ModePicker.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Write failing `CapSelector` tests**

`apps/web/src/app/record/_components/CapSelector.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CapSelector } from './CapSelector';

const defaults = {
  capMinutes: 10,
  resolution: '1080p' as const,
  cursorHighlights: true,
  showCursorToggle: true,
  onCapChange: () => {},
  onResolutionChange: () => {},
  onCursorHighlightsChange: () => {},
};

describe('CapSelector', () => {
  it('shows no warning at the 10-minute default', () => {
    render(<CapSelector {...defaults} />);
    expect(screen.queryByText(/depend on your machine/i)).not.toBeInTheDocument();
  });

  it('surfaces the long-recording warning above 10 minutes', () => {
    render(<CapSelector {...defaults} capMinutes={30} />);
    expect(screen.getByText(/depend on your machine/i)).toBeInTheDocument();
  });

  it('calls onCapChange with the selected minutes', async () => {
    const onCapChange = vi.fn();
    render(<CapSelector {...defaults} onCapChange={onCapChange} />);
    await userEvent.selectOptions(screen.getByLabelText(/recording cap/i), '20');
    expect(onCapChange).toHaveBeenCalledWith(20);
  });

  it('toggling the cursor checkbox reports the new value', async () => {
    const onCursorHighlightsChange = vi.fn();
    render(<CapSelector {...defaults} onCursorHighlightsChange={onCursorHighlightsChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /highlight my clicks/i }));
    expect(onCursorHighlightsChange).toHaveBeenCalledWith(false);
  });

  it('hides the cursor toggle when showCursorToggle is false', () => {
    render(<CapSelector {...defaults} showCursorToggle={false} />);
    expect(
      screen.queryByRole('checkbox', { name: /highlight my clicks/i }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run — verify fail**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/CapSelector.test.tsx`
Expected: FAIL — `./CapSelector` not found.

- [ ] **Step 7: Implement `CapSelector`**

`apps/web/src/app/record/_components/CapSelector.tsx`:

```tsx
'use client';

import type { RecordingResolution } from '@record-me/recorder';

const CAP_OPTIONS = [10, 20, 30, 45, 60] as const;
const LONG_WARNING =
  'Longer recordings depend on your machine. Download and processing may take a while. We recommend 10 minutes for the smoothest result.';

export interface CapSelectorProps {
  capMinutes: number;
  resolution: RecordingResolution;
  cursorHighlights: boolean;
  /** Show the click-highlight toggle (only meaningful for modes A/B). */
  showCursorToggle: boolean;
  onCapChange: (minutes: number) => void;
  onResolutionChange: (resolution: RecordingResolution) => void;
  onCursorHighlightsChange: (enabled: boolean) => void;
}

export function CapSelector({
  capMinutes,
  resolution,
  cursorHighlights,
  showCursorToggle,
  onCapChange,
  onResolutionChange,
  onCursorHighlightsChange,
}: CapSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 font-mono text-xs uppercase tracking-wider text-ivory-mut">
        <label className="flex items-center gap-2">
          <span>recording cap</span>
          <select
            aria-label="Recording cap"
            value={capMinutes}
            onChange={(e) => onCapChange(Number(e.target.value))}
            className="rounded-sm border border-line bg-surface px-2 py-1 text-ivory"
          >
            {CAP_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span>quality</span>
          <select
            aria-label="Resolution"
            value={resolution}
            onChange={(e) => onResolutionChange(e.target.value as RecordingResolution)}
            className="rounded-sm border border-line bg-surface px-2 py-1 text-ivory"
          >
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
          </select>
        </label>

        {showCursorToggle ? (
          <label className="flex items-center gap-2 normal-case">
            <input
              type="checkbox"
              checked={cursorHighlights}
              onChange={(e) => onCursorHighlightsChange(e.target.checked)}
              className="accent-amber"
            />
            <span>highlight my clicks</span>
          </label>
        ) : null}
      </div>

      {capMinutes > 10 ? (
        <p className="max-w-prose text-xs leading-relaxed text-ivory-dim">{LONG_WARNING}</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 8: Run — verify pass**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/CapSelector.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/app/record/_components/ModePicker.tsx apps/web/src/app/record/_components/ModePicker.test.tsx apps/web/src/app/record/_components/CapSelector.tsx apps/web/src/app/record/_components/CapSelector.test.tsx
git commit -m "feat(web): studio setup components (ModePicker, CapSelector)"
```

---

## Task 6: Live + review components — `LivePreview` + `ReviewPane`

**Owner:** sr-frontend · **Depends:** Task 2 · **Blocks:** Task 8

**Files:**

- Create: `apps/web/src/app/record/_components/LivePreview.tsx` (+ `.test.tsx`)
- Create: `apps/web/src/app/record/_components/ReviewPane.tsx` (+ `.test.tsx`)

- [ ] **Step 1: Write failing tests**

`apps/web/src/app/record/_components/LivePreview.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivePreview } from './LivePreview';

describe('LivePreview', () => {
  it('renders a muted, autoplaying preview video and binds the stream', () => {
    const fakeStream = { id: 'preview' } as unknown as MediaStream;
    render(<LivePreview stream={fakeStream} />);
    const video = screen.getByLabelText('Live recording preview') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.muted).toBe(true);
    // jsdom does not implement srcObject as a real setter, but the prop is applied via ref.
    expect(video).toHaveAttribute('playsinline');
  });
});
```

`apps/web/src/app/record/_components/ReviewPane.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReviewPane } from './ReviewPane';

describe('ReviewPane', () => {
  it('renders the recorded video with controls and the result URL', () => {
    render(<ReviewPane url="blob:abc" />);
    const video = screen.getByLabelText('Recorded video preview') as HTMLVideoElement;
    expect(video).toHaveAttribute('src', 'blob:abc');
    expect(video).toHaveAttribute('controls');
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/LivePreview.test.tsx src/app/record/_components/ReviewPane.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement both**

`apps/web/src/app/record/_components/LivePreview.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';

export interface LivePreviewProps {
  stream: MediaStream | null;
}

export function LivePreview({ stream }: LivePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.srcObject = stream;
    return () => {
      if (el) el.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      muted
      autoPlay
      playsInline
      aria-label="Live recording preview"
      className="h-full max-h-[70dvh] w-full bg-bg object-contain"
    />
  );
}
```

`apps/web/src/app/record/_components/ReviewPane.tsx`:

```tsx
'use client';

export interface ReviewPaneProps {
  url: string;
}

export function ReviewPane({ url }: ReviewPaneProps) {
  return (
    <video
      src={url}
      controls
      aria-label="Recorded video preview"
      className="h-full max-h-[70dvh] w-full bg-bg object-contain"
    />
  );
}
```

- [ ] **Step 4: Run — verify pass**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/LivePreview.test.tsx src/app/record/_components/ReviewPane.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/record/_components/LivePreview.tsx apps/web/src/app/record/_components/LivePreview.test.tsx apps/web/src/app/record/_components/ReviewPane.tsx apps/web/src/app/record/_components/ReviewPane.test.tsx
git commit -m "feat(web): studio live preview + review pane"
```

---

## Task 7: Error + unsupported states

**Owner:** sr-frontend · **Depends:** Tasks 2, 4 · **Blocks:** Task 8

**Files:**

- Create: `apps/web/src/app/record/_components/ErrorState.tsx` (+ `.test.tsx`)
- Create: `apps/web/src/app/record/_components/UnsupportedState.tsx` (+ `.test.tsx`)

- [ ] **Step 1: Write failing tests**

`apps/web/src/app/record/_components/ErrorState.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows a device-specific message for permission denial', () => {
    render(
      <ErrorState
        error={{
          name: 'RecorderError',
          kind: 'permission-denied',
          message: 'x',
          subject: 'camera',
        }}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(/need camera access/i)).toBeInTheDocument();
  });

  it('shows an interrupted message for a mid-recording track failure', () => {
    render(
      <ErrorState
        error={{ name: 'RecorderError', kind: 'track-failed', message: 'x' }}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(/interrupted/i)).toBeInTheDocument();
  });

  it('Try again calls onRetry', async () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        error={{ name: 'RecorderError', kind: 'permission-denied', message: 'x', subject: 'mic' }}
        onRetry={onRetry}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
```

`apps/web/src/app/record/_components/UnsupportedState.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnsupportedState } from './UnsupportedState';

describe('UnsupportedState', () => {
  it('lists supported browsers', () => {
    render(<UnsupportedState />);
    expect(screen.getByText(/doesn’t support/i)).toBeInTheDocument();
    expect(screen.getByText(/Chrome, Edge, Firefox, or Arc/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/ErrorState.test.tsx src/app/record/_components/UnsupportedState.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement both**

`apps/web/src/app/record/_components/ErrorState.tsx`:

```tsx
'use client';

import type { RecorderErrorLike } from '@record-me/recorder';
import { Button, MetaChip } from '@record-me/ui';

export interface ErrorStateProps {
  error: RecorderErrorLike;
  onRetry: () => void;
}

function messageFor(error: RecorderErrorLike): string {
  if (error.kind === 'permission-denied') {
    const subject = error.subject ?? 'device';
    return `We need ${subject} access to record this mode.`;
  }
  if (error.kind === 'track-failed') {
    return 'Your recording was interrupted — a screen, camera, or microphone source stopped.';
  }
  return 'Something interrupted the recording.';
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-start gap-4 p-10">
      <MetaChip tone="danger">recording error</MetaChip>
      <p className="max-w-prose font-serif text-2xl leading-snug text-ivory">{messageFor(error)}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
```

`apps/web/src/app/record/_components/UnsupportedState.tsx`:

```tsx
'use client';

import { MetaChip } from '@record-me/ui';

export function UnsupportedState() {
  return (
    <div className="flex flex-col items-start gap-4 p-10">
      <MetaChip tone="danger">unsupported browser</MetaChip>
      <p className="max-w-prose font-serif text-2xl leading-snug text-ivory">
        Your browser doesn’t support in-browser recording.
      </p>
      <p className="text-sm text-ivory-dim">Try Chrome, Edge, Firefox, or Arc on desktop.</p>
    </div>
  );
}
```

- [ ] **Step 4: Run — verify pass**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/ErrorState.test.tsx src/app/record/_components/UnsupportedState.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/record/_components/ErrorState.tsx apps/web/src/app/record/_components/ErrorState.test.tsx apps/web/src/app/record/_components/UnsupportedState.tsx apps/web/src/app/record/_components/UnsupportedState.test.tsx
git commit -m "feat(web): studio error + unsupported states"
```

---

## Task 8: `Studio` orchestrator (phase machine + wiring)

**Owner:** sr-frontend · **Depends:** Tasks 3, 4, 5, 6, 7 · **Blocks:** Task 9

**Files:**

- Create: `apps/web/src/app/record/_components/studio-phase.ts` (+ `.test.ts`)
- Create: `apps/web/src/app/record/_components/Studio.tsx` (+ `.test.tsx`)

- [ ] **Step 1: Write failing `derivePhase` tests**

`apps/web/src/app/record/_components/studio-phase.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { derivePhase } from './studio-phase';

describe('derivePhase', () => {
  it('reports unsupported regardless of engine state', () => {
    expect(derivePhase('idle', null, null, false)).toBe('unsupported');
  });
  it('maps idle → setup', () => {
    expect(derivePhase('idle', null, null, true)).toBe('setup');
  });
  it('maps requesting-permissions → requesting', () => {
    expect(derivePhase('requesting-permissions', null, null, true)).toBe('requesting');
  });
  it('maps recording → live and paused → paused', () => {
    expect(derivePhase('recording', null, null, true)).toBe('live');
    expect(derivePhase('paused', null, null, true)).toBe('paused');
  });
  it('maps ready → review only when a result exists', () => {
    expect(derivePhase('ready', { url: 'blob:x' } as never, null, true)).toBe('review');
    expect(derivePhase('ready', null, null, true)).toBe('finalizing');
  });
  it('any error wins over the engine state', () => {
    expect(
      derivePhase('recording', null, { name: 'e', kind: 'track-failed', message: 'x' }, true),
    ).toBe('error');
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/studio-phase.test.ts`
Expected: FAIL — `./studio-phase` not found.

- [ ] **Step 3: Implement `studio-phase.ts`**

`apps/web/src/app/record/_components/studio-phase.ts`:

```ts
import type { RecorderState, RecordingResult, RecorderErrorLike } from '@record-me/recorder';

export type StudioPhase =
  | 'unsupported'
  | 'setup'
  | 'requesting'
  | 'live'
  | 'paused'
  | 'finalizing'
  | 'review'
  | 'error';

export function derivePhase(
  state: RecorderState,
  result: RecordingResult | null,
  error: RecorderErrorLike | null,
  supported: boolean,
): StudioPhase {
  if (!supported) return 'unsupported';
  if (error) return 'error';
  switch (state) {
    case 'idle':
      return 'setup';
    case 'requesting-permissions':
      return 'requesting';
    case 'recording':
      return 'live';
    case 'paused':
      return 'paused';
    case 'finalizing':
      return 'finalizing';
    case 'ready':
      return result ? 'review' : 'finalizing';
    case 'error':
      return 'error';
  }
}
```

- [ ] **Step 4: Run — verify pass**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/studio-phase.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write failing `Studio` integration tests (mocked engine + analytics)**

`apps/web/src/app/record/_components/Studio.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const handles: any[] = [];
vi.mock('@record-me/recorder', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@record-me/recorder')>();
  return {
    ...actual,
    createRecorder: (opts: any) => {
      const handle = {
        opts,
        start: vi.fn(async () => {
          opts.onStateChange?.('requesting-permissions');
          opts.onPreviewReady?.({ id: 'preview' });
          opts.onStateChange?.('recording');
        }),
        pause: vi.fn(() => opts.onStateChange?.('paused')),
        resume: vi.fn(() => opts.onStateChange?.('recording')),
        stop: vi.fn(async () => {
          opts.onStateChange?.('finalizing');
          const result = {
            blob: new Blob(['x']),
            url: 'blob:mock',
            mimeType: 'video/mp4',
            durationMs: 5000,
            bytes: 9,
            suggestedFilename: 'record-me-2026-05-29-001.mp4',
            release: vi.fn(async () => {}),
          };
          opts.onStateChange?.('ready');
          opts.onResult?.(result);
          return result;
        }),
        dispose: vi.fn(),
      };
      handles.push(handle);
      return handle;
    },
    // Force a fully-supported desktop environment for the test.
    probeCapabilities: () => ({
      hasMediaRecorder: true,
      hasGetDisplayMedia: true,
      hasGetUserMedia: true,
      supportedMimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      isSafari: false,
      isMobile: false,
    }),
  };
});

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }));
import { track } from '@vercel/analytics';
import { Studio } from './Studio';

beforeEach(() => {
  handles.length = 0;
  vi.clearAllMocks();
});

describe('Studio', () => {
  it('renders the setup triptych and the Start button', async () => {
    render(<Studio />);
    expect(await screen.findByText('Screen + Cursor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('selecting a mode fires mode_selected', async () => {
    render(<Studio />);
    await userEvent.click(await screen.findByRole('radio', { name: /Camera only/ }));
    expect(track).toHaveBeenCalledWith('mode_selected', { mode: 'cam-only' });
  });

  it('Start → live shows the REC dot and fires recording_started', async () => {
    render(<Studio />);
    await userEvent.click(await screen.findByRole('button', { name: /start recording/i }));
    await waitFor(() =>
      expect(screen.getByRole('status', { name: /recording/i })).toBeInTheDocument(),
    );
    expect(track).toHaveBeenCalledWith(
      'recording_started',
      expect.objectContaining({ resolution: '1080p', cap_minutes: 10 }),
    );
  });

  it('Stop → review shows Download and fires recording_stopped', async () => {
    render(<Studio />);
    await userEvent.click(await screen.findByRole('button', { name: /start recording/i }));
    await userEvent.click(await screen.findByRole('button', { name: /stop/i }));
    expect(await screen.findByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(
      'recording_stopped',
      expect.objectContaining({ mime_type: 'video/mp4', duration_seconds: 5 }),
    );
  });
});
```

- [ ] **Step 6: Run — verify fail**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/Studio.test.tsx`
Expected: FAIL — `./Studio` not found.

- [ ] **Step 7: Implement `Studio`**

`apps/web/src/app/record/_components/Studio.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RecordMode, RecordingResolution } from '@record-me/recorder';
import { Button, MetaChip, RecDot, StudioShell } from '@record-me/ui';
import { useRecorder } from '../../../hooks/use-recorder';
import { analytics } from '../../../lib/analytics';
import {
  getStudioCapabilities,
  browserName,
  type StudioCapabilities,
} from '../../../lib/capabilities';
import { formatDuration, formatMegabytes, capMinutesToMs } from '../../../lib/format';
import { derivePhase } from './studio-phase';
import { ModePicker } from './ModePicker';
import { CapSelector } from './CapSelector';
import { LivePreview } from './LivePreview';
import { ReviewPane } from './ReviewPane';
import { ErrorState } from './ErrorState';
import { UnsupportedState } from './UnsupportedState';

const MODE_LABELS: Record<RecordMode, string> = {
  'screen+cam+cursor': 'screen + camera + cursor',
  'screen+cursor': 'screen + cursor',
  'cam-only': 'camera only',
};

export function Studio() {
  const recorder = useRecorder();
  const [caps, setCaps] = useState<StudioCapabilities | null>(null);

  // Setup selections (lifted, so the shell footer + body share them).
  const [mode, setMode] = useState<RecordMode>('screen+cursor');
  const [capMinutes, setCapMinutes] = useState(10);
  const [resolution, setResolution] = useState<RecordingResolution>('1080p');
  const [cursorHighlights, setCursorHighlights] = useState(true);
  const resolutionTouched = useRef(false);
  const prevState = useRef(recorder.state);
  const stoppedTracked = useRef(false);
  const unsupportedTracked = useRef(false);

  // Client-only capability probe; clamp the selected mode to what’s available.
  useEffect(() => {
    const c = getStudioCapabilities();
    setCaps(c);
    if (c.availableModes.length > 0 && !c.availableModes.includes('screen+cursor')) {
      setMode(c.availableModes[0]!);
    }
  }, []);

  const supported = caps ? caps.supported : true;
  const availableModes = caps?.availableModes ?? ['screen+cam+cursor', 'screen+cursor', 'cam-only'];
  const phase = derivePhase(recorder.state, recorder.result, recorder.error, supported);
  const showCursorToggle = mode === 'screen+cam+cursor' || mode === 'screen+cursor';

  // Resolution auto-step: cap ≥ 30 min defaults to 720p unless the user overrode.
  const onCapChange = useCallback((minutes: number) => {
    setCapMinutes(minutes);
    if (!resolutionTouched.current) setResolution(minutes >= 30 ? '720p' : '1080p');
  }, []);
  const onResolutionChange = useCallback((r: RecordingResolution) => {
    resolutionTouched.current = true;
    setResolution(r);
  }, []);

  const onSelectMode = useCallback((m: RecordMode) => {
    setMode(m);
    analytics.modeSelected(m);
  }, []);

  const onStart = useCallback(() => {
    void recorder.start({
      mode,
      maxDurationMs: capMinutesToMs(capMinutes),
      resolution,
      cursorHighlights,
    });
  }, [recorder, mode, capMinutes, resolution, cursorHighlights]);

  const onDownload = useCallback(() => {
    const result = recorder.result;
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.suggestedFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    analytics.recordingDownloaded({
      mode,
      duration_seconds: Math.round(result.durationMs / 1000),
      bytes: result.bytes,
      mime_type: result.mimeType,
    });
  }, [recorder.result, mode]);

  // recording_started on the idle/requesting → recording edge.
  useEffect(() => {
    if (prevState.current !== 'recording' && recorder.state === 'recording') {
      analytics.recordingStarted({ mode, resolution, cap_minutes: capMinutes });
    }
    prevState.current = recorder.state;
  }, [recorder.state, mode, resolution, capMinutes]);

  // recording_stopped once per session on the ready edge with a result.
  useEffect(() => {
    if (recorder.state === 'ready' && recorder.result && !stoppedTracked.current) {
      stoppedTracked.current = true;
      analytics.recordingStopped({
        mode,
        duration_seconds: Math.round(recorder.result.durationMs / 1000),
        bytes: recorder.result.bytes,
        mime_type: recorder.result.mimeType,
      });
    }
    if (recorder.state !== 'ready') stoppedTracked.current = false;
  }, [recorder.state, recorder.result, mode]);

  // permission_denied + browser_unsupported.
  useEffect(() => {
    if (recorder.error?.kind === 'permission-denied') {
      analytics.permissionDenied(recorder.error.subject ?? 'screen');
    }
  }, [recorder.error]);

  useEffect(() => {
    if (caps && !caps.supported && !unsupportedTracked.current) {
      unsupportedTracked.current = true;
      const feature = !caps.hasMediaRecorder
        ? 'MediaRecorder'
        : !caps.supportedMimeType
          ? 'mimeType'
          : 'getUserMedia';
      analytics.browserUnsupported({ feature, ua_browser: browserName(navigator.userAgent) });
    }
  }, [caps]);

  const onCursorHighlightsChange = useCallback((enabled: boolean) => {
    setCursorHighlights(enabled);
    if (!enabled) analytics.cursorHighlightDisabled('opt-out');
  }, []);

  // ----- Render: one persistent StudioShell, body + controls per phase -----
  const header = useMemo(() => {
    if (phase === 'live' || phase === 'paused' || phase === 'finalizing') {
      return (
        <>
          <div className="flex items-center gap-3">
            <RecDot active={phase === 'live'} />
            <span className="font-mono text-sm text-ivory">
              {formatDuration(recorder.durationMs)}
            </span>
            <span className="font-mono text-xs text-ivory-mut">
              · {formatMegabytes(recorder.bytes)}
            </span>
          </div>
          <MetaChip>{MODE_LABELS[mode]}</MetaChip>
        </>
      );
    }
    if (phase === 'review' && recorder.result) {
      return (
        <>
          <span className="font-mono text-sm text-ivory">
            ready · {formatDuration(recorder.result.durationMs)}
          </span>
          <MetaChip>{formatMegabytes(recorder.result.bytes)}</MetaChip>
        </>
      );
    }
    return (
      <>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ivory-mut">
          studio · ready
        </span>
        <MetaChip>{MODE_LABELS[mode]}</MetaChip>
      </>
    );
  }, [phase, recorder.durationMs, recorder.bytes, recorder.result, mode]);

  const footer = useMemo(() => {
    if (phase === 'setup') {
      return (
        <>
          <CapSelector
            capMinutes={capMinutes}
            resolution={resolution}
            cursorHighlights={cursorHighlights}
            showCursorToggle={showCursorToggle}
            onCapChange={onCapChange}
            onResolutionChange={onResolutionChange}
            onCursorHighlightsChange={onCursorHighlightsChange}
          />
          <Button onClick={onStart} disabled={availableModes.length === 0}>
            ▶ Start recording
          </Button>
        </>
      );
    }
    if (phase === 'live' || phase === 'paused') {
      return (
        <>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ivory-mut">
            live preview
          </span>
          <div className="flex items-center gap-3">
            {phase === 'live' ? (
              <Button variant="ghost" onClick={recorder.pause}>
                ⏸ Pause
              </Button>
            ) : (
              <Button variant="ghost" onClick={recorder.resume}>
                ▶ Resume
              </Button>
            )}
            <Button variant="secondary" onClick={recorder.stop}>
              ■ Stop
            </Button>
          </div>
        </>
      );
    }
    if (phase === 'review') {
      return (
        <>
          <Button variant="ghost" onClick={recorder.reset}>
            ↻ Re-record
          </Button>
          <Button onClick={onDownload}>⤓ Download</Button>
        </>
      );
    }
    return null;
  }, [
    phase,
    capMinutes,
    resolution,
    cursorHighlights,
    showCursorToggle,
    availableModes.length,
    onCapChange,
    onResolutionChange,
    onCursorHighlightsChange,
    onStart,
    onDownload,
    recorder.pause,
    recorder.resume,
    recorder.stop,
    recorder.reset,
  ]);

  const body = (() => {
    switch (phase) {
      case 'unsupported':
        return <UnsupportedState />;
      case 'error':
        return recorder.error ? (
          <ErrorState error={recorder.error} onRetry={recorder.reset} />
        ) : null;
      case 'setup':
        return (
          <div className="flex flex-col gap-6 p-6">
            <ModePicker selected={mode} available={availableModes} onSelect={onSelectMode} />
            {showCursorToggle ? (
              <p className="text-xs leading-relaxed text-ivory-mut">
                Click highlights work when you record this tab. For highlights in other apps,
                install the record-me extension (coming soon).
              </p>
            ) : null}
          </div>
        );
      case 'requesting':
        return (
          <div className="flex min-h-[40dvh] items-center justify-center p-10">
            <p className="font-mono text-xs uppercase tracking-widest text-ivory-mut">
              waiting for permission…
            </p>
          </div>
        );
      case 'live':
      case 'paused':
        return <LivePreview stream={recorder.previewStream} />;
      case 'finalizing':
        return (
          <div className="flex min-h-[40dvh] items-center justify-center p-10">
            <p className="font-mono text-xs uppercase tracking-widest text-ivory-mut">
              finalizing…
            </p>
          </div>
        );
      case 'review':
        return recorder.result ? <ReviewPane url={recorder.result.url} /> : null;
    }
  })();

  return (
    <StudioShell className="w-full max-w-5xl" header={header} footer={footer}>
      {body}
    </StudioShell>
  );
}
```

> **Imports are relative on purpose.** `apps/web/tsconfig.json` defines the `@/*` alias, but the web Vitest config has no path resolver, so `@/` imports break under Vitest. Relative paths resolve identically in Vitest and the Next build — keep them relative.

- [ ] **Step 8: Run the Studio tests — verify they pass**

Run: `pnpm --filter @record-me/web exec vitest run src/app/record/_components/Studio.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 9: Run the full web unit suite + typecheck**

Run: `pnpm --filter @record-me/web test && pnpm --filter @record-me/web typecheck`
Expected: PASS, no type errors.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/app/record/_components/studio-phase.ts apps/web/src/app/record/_components/studio-phase.test.ts apps/web/src/app/record/_components/Studio.tsx apps/web/src/app/record/_components/Studio.test.tsx
git commit -m "feat(web): Studio orchestrator + phase machine"
```

---

## Task 9: Wire the route — `page.tsx` (RSC) + `layout.tsx` + visual verification

**Owner:** sr-frontend · **Depends:** Task 8 · **Blocks:** Tasks 10, 11

**Files:**

- Modify: `apps/web/src/app/record/page.tsx`
- Create: `apps/web/src/app/record/layout.tsx`

- [ ] **Step 1: Replace the placeholder page (RSC + metadata)**

`apps/web/src/app/record/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { Studio } from './_components/Studio';

export const metadata: Metadata = {
  title: 'the studio — record me',
  description:
    'Record your screen, camera, and cursor. No accounts, no upload — everything stays in your browser.',
};

export default function RecordPage() {
  return <Studio />;
}
```

- [ ] **Step 2: Add the minimal studio layout**

`apps/web/src/app/record/layout.tsx`:

```tsx
import Link from 'next/link';
import { WordMark } from '@record-me/ui';

export default function RecordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ivory">
      <header className="flex items-center justify-between border-b border-line-soft px-6 py-4">
        <Link href="/" aria-label="record me — home">
          <WordMark />
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ivory-mut">
          stays in your browser
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm --filter @record-me/web typecheck && pnpm --filter @record-me/web build`
Expected: PASS. `/record` builds without errors.

- [ ] **Step 4: Visual verification with Playwright MCP (REQUIRED — quality standard)**

Start the dev server, then drive the browser via Playwright MCP:

```bash
pnpm --filter @record-me/web dev
```

Using Playwright MCP tools:

- `browser_navigate` → `http://localhost:3000/record`
- `browser_snapshot` — confirm the setup triptych renders inside the `StudioShell`, the cap selector + Start button are in the footer, and the WordMark header is present.
- `browser_console_messages` — confirm **zero** errors/warnings.
- `browser_take_screenshot` — capture the setup state for the record.
- Click a mode card → confirm the amber accent ring moves.
- (Manual, not MCP-automatable) optionally grant camera in a real browser to confirm Mode C live preview renders a real video frame.

Acceptance: setup renders correctly, console is clean, mode selection toggles the accent.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/record/page.tsx apps/web/src/app/record/layout.tsx
git commit -m "feat(web): wire /record studio route + minimal layout"
```

---

## Task 10: E2E — Mode C live; Modes A/B gated UI

**Owner:** record-me-e2e · **Depends:** Task 9 · **Blocks:** Task 11

**Files:**

- Create: `apps/web/tests/e2e/record.spec.ts`

The Playwright config already launches Chromium with `--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`, and pre-granted `camera`/`microphone` permissions — so `getUserMedia` (Mode C) auto-resolves. `getDisplayMedia` (Modes A/B) cannot be auto-granted headlessly, so those are verified at the **UI/gating** level only. This limit is stated in the spec (§11) and must not be faked.

- [ ] **Step 1: Write the E2E spec**

`apps/web/tests/e2e/record.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('studio /record', () => {
  test('setup renders the triptych and the studio chrome', async ({ page }) => {
    await page.goto('/record');
    await expect(page.getByLabel('record me — home')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Camera only/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /start recording/i })).toBeVisible();
    expect(await page.evaluate(() => document.title)).toMatch(/the studio/i);
  });

  test('Mode C records and produces a downloadable file', async ({ page }) => {
    await page.goto('/record');
    await page.getByRole('radio', { name: /Camera only/ }).click();
    await page.getByRole('button', { name: /start recording/i }).click();

    // Live state: REC dot appears.
    await expect(page.getByRole('status', { name: /recording/i })).toBeVisible({ timeout: 15_000 });

    // Let a couple of seconds of frames encode.
    await page.waitForTimeout(2_000);
    await page.getByRole('button', { name: /stop/i }).click();

    // Review: a download is offered.
    const downloadButton = page.getByRole('button', { name: /download/i });
    await expect(downloadButton).toBeVisible({ timeout: 15_000 });

    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^record-me-.*\.(mp4|webm)$/);
  });

  test('re-record returns to setup', async ({ page }) => {
    await page.goto('/record');
    await page.getByRole('radio', { name: /Camera only/ }).click();
    await page.getByRole('button', { name: /start recording/i }).click();
    await expect(page.getByRole('status', { name: /recording/i })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1_000);
    await page.getByRole('button', { name: /stop/i }).click();
    await expect(page.getByRole('button', { name: /download/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /re-record/i }).click();
    await expect(page.getByRole('button', { name: /start recording/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the E2E suite**

Run: `pnpm --filter @record-me/web test:e2e`
Expected: PASS (3 tests). If `waitForEvent('download')` is flaky in the sandbox, increase the live `waitForTimeout` to ensure chunks flush before stop. Do not weaken the filename assertion.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/e2e/record.spec.ts
git commit -m "test(web): e2e studio — Mode C live + setup smoke"
```

---

## Task 11: Recapture README screenshot + documentation

**Owner:** record-me-scribe (docs) / sr-frontend (capture) · **Depends:** Task 9

**Files:**

- Modify: `.github/assets/readme/studio.png`, `README.md`
- Modify: `docs/FRONTEND.md`, `docs/RECORDING.md`, `docs/PROGRESS.md`

- [ ] **Step 1: Recapture `studio.png` from the real `/record`**

Follow the existing capture pipeline (see commit `0b718f3` / the README-screenshots dispatch). Capture `/record` setup state (no longer `/dev/previews/studio`) at the established viewport, write to `.github/assets/readme/studio.png`.

- [ ] **Step 2: Update README**

In `README.md`, drop the "Preview · ships in Phase 4" prefix on the studio image and re-link the caption to `apps/web/src/app/record/page.tsx`.

- [ ] **Step 3: Update docs**

- `docs/FRONTEND.md`: flip the `/record` row to "Phase 4 · shipped"; add the `_components/*` inventory; mark `useRecorder()` as implemented (note the `previewStream`/`result`/`error` additions to the documented return shape).
- `docs/RECORDING.md`: document the new `onResult` + `onPreviewReady` callbacks and the error `subject` field in the Public API section.
- `docs/PROGRESS.md`: check off Phase 4 items; note the two deferred §14 items (memory-pressure banner, IDB-fallback toast) and the "save partial" deferral with their rationale.

- [ ] **Step 4: Commit**

```bash
git add README.md .github/assets/readme/studio.png docs/FRONTEND.md docs/RECORDING.md docs/PROGRESS.md
git commit -m "docs(phase-4): studio route, recorder callbacks, progress + README screenshot"
```

---

## Final verification (before PR)

- [ ] `pnpm typecheck` — all packages pass
- [ ] `pnpm test` — recorder + web unit suites green; recorder coverage ≥ 90%
- [ ] `pnpm --filter @record-me/web test:e2e` — studio E2E green
- [ ] `pnpm --filter @record-me/web build` — production build clean
- [ ] Playwright MCP: `/record` setup + Mode C live verified, console clean (Task 9 Step 4)
- [ ] Epic #4 acceptance items checked in `docs/PROGRESS.md`

## Self-review notes (spec coverage)

| Spec section                                                            | Covered by                                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| §3 persistent shell flow                                                | Task 8 (`Studio` header/body/footer per phase)                       |
| §4.1 onResult                                                           | Task 1                                                               |
| §4.2 onPreviewReady                                                     | Task 1 + Task 6 (`LivePreview`)                                      |
| §5 useRecorder                                                          | Task 3                                                               |
| §6 components + phase machine                                           | Tasks 5–8                                                            |
| §7 setup (modes, cap, resolution auto-step, device gating, cursor note) | Tasks 5, 8                                                           |
| §8 error surface + capability gating                                    | Tasks 7, 8 (track-failure scoped to "interrupted" — see deviation 2) |
| §9 analytics (7 events)                                                 | Task 4 + emit points in Task 8                                       |
| §10 privacy (unmount dispose)                                           | Task 3                                                               |
| §11 testing (unit/component/E2E)                                        | Tasks 1–8 (unit/component), Task 10 (E2E)                            |
| §12 task decomposition                                                  | Tasks 1–11                                                           |
| readme screenshot                                                       | Task 11                                                              |
