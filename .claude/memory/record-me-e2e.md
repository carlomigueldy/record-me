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

## Phase 4 patterns

### macOS: getUserMedia({ audio: true }) hangs headlessly

`--use-fake-device-for-media-stream` provides a fake video device in Playwright
Chromium on macOS, but `getUserMedia({ video, audio: true })` hangs indefinitely
— there is no fake audio device sink available. On Linux CI both resolve.

Fix: use `page.addInitScript()` to intercept `getUserMedia` before the app JS
runs and force `audio: false`. The recording still produces a valid video blob
and the full user flow (setup → live → review → download) is exercised. The
intercept is a no-op in Linux CI where the full fake stream works.

```ts
// Drop audio so fake camera resolves on macOS headless Chromium.
const dropAudio = async (page: Page) => {
  await page.addInitScript(() => {
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (constraints?: MediaStreamConstraints) =>
      orig(constraints ? { ...constraints, audio: false } : constraints);
  });
};
```

Call `await dropAudio(page)` BEFORE `page.goto()` so the script runs before the
page JS hydrates.

### RecDot as the live-state sentinel

`RecDot` renders with `role="status"` and `aria-label="Recording"` (the default
`label` prop). Use `getByRole('status', { name: /recording/i })` to assert the
live phase is active — it's the most durable user-visible marker of the live state.

### download event timing

Trigger `page.waitForEvent('download')` BEFORE clicking the Download button, then
await the event after the click — `downloadPromise` pattern. The download happens
synchronously after click so no extra timeout is needed.

### Selector durability

- Mode cards: `getByRole('radio', { name: /Camera only/ })` — the `ModePicker`
  uses `role="radio"` on each `ModeCard` with `aria-label` matching the mode title.
- Start button: `getByRole('button', { name: /start recording/i })` — rendered
  with `▶` prefix in the text; the regex skips the emoji.
- Stop/Pause: `getByRole('button', { name: /stop/i })` — matches `■ Stop`.
- Download: `getByRole('button', { name: /download/i })` — matches `⤓ Download`.
- Re-record: `getByRole('button', { name: /re-record/i })` — matches `↻ Re-record`.
- Home link: `getByLabel('record me — home')` — em dash, not a regular hyphen.
