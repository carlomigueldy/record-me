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
