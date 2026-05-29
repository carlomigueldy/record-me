---
name: record-me-staff
description: Per-agent memory for staff. Recording engine + workspace plumbing learnings.
metadata:
  type: pattern
  owner: record-me-staff
---

# record-me-staff memory

## Phase 1 baseline

- `@record-me/recorder` has no React import. Hooks live in `apps/web`.
- Vitest's jsdom env doesn't ship `MediaRecorder`/`getDisplayMedia` — tests
  must mock them on `globalThis`.
- Codec preference order is frozen by spec § 7.4. If a new format is needed,
  update the spec first, then the code.

## Phase 4 (2026-05-29) — recorder consumer hooks

- **`exactOptionalPropertyTypes: true` is on.** An optional field typed
  `subject?: PermissionSubject` does NOT accept `undefined` as a value. If you
  assign a `PermissionSubject | undefined` expression to it (e.g. in a
  `toJSON()` return shape that reads `this.subject`), tsc errors with TS2375.
  Fix: type the field `subject: PermissionSubject | undefined` (explicit
  union), not `subject?`. Unit tests pass regardless — this only surfaces under
  `pnpm typecheck`. Lesson: ALWAYS run workspace typecheck after recorder
  changes; Vitest green is not sufficient.
- **Vitest `toEqual` treats `{ x: undefined }` as equal to `{}`** (unlike
  `toStrictEqual`). So adding an always-present `subject` key to `toJSON()`
  output did NOT break the existing `errors.test.ts` `toEqual` assertion.
- **One result channel for stop().** `onResult` fires inside `stop()` right
  before the return, so manual-stop AND auto-stop (whose `stop()` return value
  is discarded by the auto-stop timer) both deliver the result to the consumer.
  Don't try to deliver it only via the return value.
- **`onPreviewReady` gets a video-ONLY stream:** wrap
  `new MediaStream(composer.captureStream().getVideoTracks())` — never include
  the mic track in the preview (echo + privacy).
- `PermissionSubject` canonical home is now `types.ts` (was `errors.ts`),
  re-exported from the package root. `errors.ts` imports it as a type.

## Future entries

(Append below.)
