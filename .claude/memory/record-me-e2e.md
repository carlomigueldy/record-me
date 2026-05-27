---
name: record-me-e2e
description: Per-agent memory for e2e. Playwright patterns + brittle selector fixes.
metadata:
  type: pattern
  owner: record-me-e2e
---

# record-me-e2e memory

## Phase 1 baseline

- Chromium launch args for media: `--use-fake-device-for-media-stream` and
  `--use-fake-ui-for-media-stream` (already in `apps/web/playwright.config.ts`).
- Permissions auto-granted in the projects config: `camera`, `microphone`.
- For screen capture in tests, fake the `getDisplayMedia` return value via
  `page.addInitScript` — actual screen capture won't work in headless Chromium.
- Run every new spec 3× before claiming done.

## Future entries

(Append below.)
