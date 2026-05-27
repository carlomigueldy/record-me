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

## Future entries

(Append below.)
