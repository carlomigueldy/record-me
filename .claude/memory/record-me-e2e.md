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

## Phase 5B patterns

### Filtering benign Vercel 404 console errors in local dev

`/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` 404 in
local dev (the proxy only resolves on Vercel's edge). Playwright's `msg.text()`
for network-failure console errors is generic ("Failed to load resource: 404")
with no URL included — you cannot filter by URL from the console event alone.

Fix: use `page.route` to intercept and fulfil those requests with an empty 200
BEFORE `page.goto()`. This prevents the 404 entirely, keeping the console-error
assertion strict for real app errors.

```ts
await page.route('**/_vercel/insights/**', (route) => route.fulfill({ status: 200, body: '' }));
await page.route('**/_vercel/speed-insights/**', (route) =>
  route.fulfill({ status: 200, body: '' }),
);
```

Call both routes before `page.goto()`. Text-filtering `msg.text()` alone will
NOT work because the generic "Failed to load resource" message contains no URL.

## Phase 6 patterns

### Screen+cursor mode stub for track-failure tests

To test the `track-failed` → "Save partial recording" / "Start over" flow in
`studio-resilience.spec.ts`, three patches are needed in one `addInitScript` call:

1. **getUserMedia({ video })**: drop audio (prevents macOS headless hang — same
   as Phase 4 pattern).
2. **getUserMedia({ audio: true, no video })** — mic-only call from
   `screen+cursor` acquireTracks: return `new MediaStream()` (empty). Do NOT
   pass `{ audio: false }` — Chrome rejects with `NotSupportedError` when both
   audio and video are absent/false. An empty stream yields `getAudioTracks()[0]
= undefined`, which acquireTracks treats as "no mic" and continues.
3. **getDisplayMedia**: return a fake video stream from `getUserMedia({ video:
true })` (no screen-share prompt). Stash on `window.__fakeDisplayStream`.

All three patches must be in one `addInitScript` call so execution order is
deterministic (getDisplayMedia calls the already-patched getUserMedia).

### headless Chromium: track.stop() does NOT fire the 'ended' event

In headless Chromium with `--use-fake-device-for-media-stream`, calling
`MediaStreamTrack.stop()` sets `readyState = 'ended'` but does NOT dispatch
the `'ended'` DOM event on the track. Since `handleTrackFailure()` is registered
via `track.addEventListener('ended', ...)`, the handler never runs.

Fix: call both `t.stop()` AND `t.dispatchEvent(new Event('ended'))` from
`page.evaluate()`. The synthetic event is received by the recorder's listener
identically to a native OS-level "Stop sharing" event.

```ts
const triggerTrackFailure = async (page: Page) => {
  await page.evaluate(() => {
    const stream = (window as Window & { __fakeDisplayStream?: MediaStream }).__fakeDisplayStream;
    if (!stream) throw new Error('__fakeDisplayStream not found');
    stream.getTracks().forEach((t) => {
      t.stop(); // sets readyState = 'ended'
      t.dispatchEvent(new Event('ended')); // fires addEventListener('ended') handlers
    });
  });
};
```

This is NOT a fake assertion — it exercises the exact same code path as
production by calling the event listener that the recorder registered. The
workaround is purely about the headless Chromium fake-device not emitting the
native event; the application logic is unchanged.

### track-failure tests: wait for the recording state before triggering failure

The `RecDot` (role="status" aria-label="Recording") must be visible before
calling `triggerTrackFailure()`. This confirms the recorder is in `recording`
state and the track-ended listeners are attached. Without this guard the
fake-device track is not yet managed by the recorder and the dispatch is a no-op.

### pageerror 'nothing to salvage' — acquireTracks mic failure clears store

If `getUserMedia({ audio: false })` is called (from a `dropAudio` patch) for a
mic-only request without a video constraint, Chrome throws `NotSupportedError`.
This causes the `acquireTracks` catch block to call `cleanupResources()`, which
sets `internal.store = undefined`. Then `toError('track-failed')` is called.
When the user clicks "Save partial recording", `salvage()` sees `!internal.store`
and throws "nothing to salvage" — surfaced as a `pageerror`.

Fix: intercept mic-only `getUserMedia` calls to return `new MediaStream()`
instead of delegating to the real API with an invalid constraint set.

## Phase 5C patterns

### OG image routes 404 in `next dev`

Next.js App Router OG image routes (`/opengraph-image`, `/[param]/opengraph-image`)
are prerendered at build time and are NOT served by `next dev`. They return 404 in
the dev server. Do NOT assert OG route 200/image-png in the dev-targeting E2E suite.
OG route verification (status 200, content-type image/png, no font tofu) belongs in
the production build verification step (`next build && next start`), not in e2e.

### Scoping role selectors into a landmark

When a page has two sets of navigation links (e.g. a `DocsSidebar` nav and a main
content body with the same doc titles), `page.getByRole('link', { name: /foo/i })`
may match multiple elements. Scope it to the specific landmark instead:

```ts
const sidebar = page.getByRole('navigation', { name: /documentation/i });
await expect(sidebar.getByRole('link', { name: /Permissions/i })).toBeVisible();
```

Use `aria-label` on the landmark (DocsSidebar already has `aria-label="Documentation"`)
as the stable selector anchor — far more durable than class names or DOM structure.

### Assert on actual frontmatter titles, not assumed names

Doc titles come from frontmatter and may include `&`, `,`, or multi-word strings
(e.g. `"Codecs & Output Formats"` not `"Codecs"`). Always check the MDX frontmatter
title field before writing the title assertion regex. A mismatch causes a false failure
with no helpful diagnostic — the pattern just never matches.
