import { expect, test, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// studio-resilience.spec.ts — Phase 6 resilience E2E smoke
//
// WHAT IS COVERED
//   1. /record loads with zero console errors (regression guard for the Phase 6
//      banner / toast / analytics-effect additions).
//   2. HEADLINE: track-failure → "Save partial recording" flow.
//      Start a screen+cursor recording; simulate the browser's native "Stop
//      sharing" by dispatching a synthetic 'ended' event on the live screen
//      track (page.evaluate). Assert the error pane shows BOTH "Save partial
//      recording" and "Start over". Then exercise each branch:
//        a. Click "Save partial recording" → review/download affordance appears.
//        b. Click "Start over" → returns to setup (Start recording button).
//   3. A brief no-regression check that a normal cam-only record → stop →
//      review still works. (The full cam-only flow lives in record.spec.ts —
//      this suite adds only a minimal sanity guard that Phase 6 Studio changes
//      didn't break the happy path.)
//
// WHAT IS UNIT-ONLY (not reachable in browser E2E)
//   - Memory-pressure banner: requires ~600 chunks at the 1-second timeslice
//     (≈10 min of recording). Artificially lowering the threshold in the page
//     would test the test harness, not the product. Covered by
//     MemoryPressureBanner.test.tsx + recorder.memory-pressure.test.ts.
//   - Storage-fallback toast: requires an IndexedDB write failure mid-recording.
//     IDB is healthy in every Playwright Chromium environment; making it fail
//     requires monkey-patching engine internals. Covered by
//     StorageFallbackToast.test.tsx + recorder.storage-fallback.test.ts.
//   - cursor_highlight_disabled('not-record-me-tab'): requires a displaySurface
//     that is not this browser tab. The fake-device displaySurface value is
//     indeterminate across Chrome versions. Covered by Studio.test.tsx and
//     the recorder unit tests.
//
// TRACK-FAILURE SIMULATION TECHNIQUE
//   headless Chromium's --use-fake-device-for-media-stream provides a fake
//   video track via getUserMedia(). Calling MediaStreamTrack.stop() on this
//   fake track sets readyState = 'ended' but does NOT fire the 'ended' DOM
//   event (a known headless-Chromium quirk with the fake-device source). To
//   reliably trigger handleTrackFailure() we therefore call both t.stop() AND
//   t.dispatchEvent(new Event('ended')) from page.evaluate(). This mirrors
//   exactly what happens when the browser fires a native 'ended' event —
//   the recorder's addEventListener('ended', …) handler is invoked identically.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Combined init-script for screen+cursor recording tests. Three patches in one
 * addInitScript call (execution order matters — see comments):
 *
 *   a. getUserMedia({ video }): drops audio to prevent the fake-audio-sink hang
 *      on macOS headless Chromium where --use-fake-device-for-media-stream has
 *      no audio device. On Linux CI (where both video+audio fakes are available)
 *      this intercept is a no-op.
 *
 *   b. getUserMedia({ audio: true }) — mic-only calls from the screen+cursor
 *      acquireTracks path: return an empty MediaStream so getAudioTracks()[0]
 *      yields undefined (treated as "no mic"). Calling getUserMedia({ audio:
 *      false }) with no video would fail with Chrome's NotSupportedError, so
 *      we return new MediaStream() instead to let recording continue with just
 *      the screen video track.
 *
 *   c. getDisplayMedia: return a fake video-only stream from getUserMedia (no
 *      screen-share prompt in headless Chromium). Stash the stream on
 *      window.__fakeDisplayStream so triggerTrackFailure() can stop + dispatch
 *      the 'ended' event to simulate "Stop sharing".
 */
const stubScreenAndDropAudio = async (page: Page) => {
  await page.addInitScript(() => {
    const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      if (!constraints) return origGetUserMedia(constraints);
      const hasVideo = !!(constraints.video && constraints.video !== false);
      const hasAudio = !!(constraints.audio && constraints.audio !== false);
      if (hasAudio && !hasVideo) {
        // Mic-only call: return empty stream — getAudioTracks()[0] = undefined.
        // acquireTracks treats an absent mic as "no mic" and continues.
        return new MediaStream();
      }
      // Video call: drop audio to avoid macOS headless hang.
      return origGetUserMedia({ ...constraints, audio: false });
    };

    navigator.mediaDevices.getDisplayMedia = async (_constraints?: DisplayMediaStreamOptions) => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      // Stash the live stream so triggerTrackFailure() can access it.
      (window as Window & { __fakeDisplayStream?: MediaStream }).__fakeDisplayStream = stream;
      return stream;
    };
  });
};

/**
 * Drop audio from getUserMedia to prevent hangs on macOS headless Chromium.
 * Used for cam-only tests that don't need the screen stub.
 */
const dropAudio = async (page: Page) => {
  await page.addInitScript(() => {
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (constraints?: MediaStreamConstraints) =>
      orig(constraints ? { ...constraints, audio: false } : constraints);
  });
};

/**
 * Silence Vercel analytics/speed-insights 404s in local dev. These scripts
 * only resolve on Vercel's edge network; in local dev they 404 and produce
 * generic "Failed to load resource" console errors that are indistinguishable
 * by URL from the console listener. Route-intercept before goto.
 */
const stubVercelScripts = async (page: Page) => {
  await page.route('**/_vercel/insights/**', (route) => route.fulfill({ status: 200, body: '' }));
  await page.route('**/_vercel/speed-insights/**', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
};

/**
 * Simulate the browser's "Stop sharing" button: stop all tracks on
 * window.__fakeDisplayStream AND dispatch a synthetic 'ended' event.
 *
 * WHY dispatchEvent IS NEEDED: In headless Chromium with
 * --use-fake-device-for-media-stream, calling MediaStreamTrack.stop() sets
 * readyState = 'ended' but does NOT fire the 'ended' DOM event on the track.
 * The recorder's handleTrackFailure() handler is registered via
 * track.addEventListener('ended', …) and will only run when that event fires.
 * Dispatching the event manually is the correct cross-browser idiom for
 * testing this path — it is equivalent to the native OS-level stop that the
 * real browser fires on "Stop sharing". This technique does NOT modify any
 * application source; it exercises the exact same event-listener path that
 * production code relies on.
 */
const triggerTrackFailure = async (page: Page) => {
  await page.evaluate(() => {
    const stream = (window as Window & { __fakeDisplayStream?: MediaStream }).__fakeDisplayStream;
    if (!stream) throw new Error('__fakeDisplayStream not found — getDisplayMedia stub failed');
    stream.getTracks().forEach((t) => {
      t.stop(); // sets readyState = 'ended'
      t.dispatchEvent(new Event('ended')); // fires the 'ended' listener
    });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: /record loads clean (regression guard for Phase 6 additions)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('studio-resilience: /record loads with zero console errors', () => {
  test('console has zero errors after Phase 6 changes', async ({ page }) => {
    await stubVercelScripts(page);

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/record');
    await page.waitForLoadState('networkidle');

    expect(errors, `Console errors on /record: ${errors.join('; ')}`).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: track-failure → "Save partial recording" / "Start over" flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('studio-resilience: track-failure resilience UI', () => {
  test('track failure shows "Save partial recording" and "Start over" buttons', async ({
    page,
  }) => {
    await stubScreenAndDropAudio(page);
    await page.goto('/record');

    // Default mode is screen+cursor. Click Start.
    await page.getByRole('button', { name: /start recording/i }).click();

    // Wait for live state — the RecDot (role="status" aria-label="Recording")
    // is the durable live-phase sentinel (see record-me-e2e.md §Phase 4).
    await expect(page.getByRole('status', { name: /recording/i })).toBeVisible({
      timeout: 15_000,
    });

    // Let some chunks buffer before triggering failure.
    await page.waitForTimeout(2_000);

    // Simulate the user clicking the browser's "Stop sharing" pill.
    await triggerTrackFailure(page);

    // The error pane must show BOTH Phase 6 actions.
    await expect(page.getByRole('button', { name: /save partial recording/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('button', { name: /start over/i })).toBeVisible();
  });

  test('"Save partial recording" leads to the review/download affordance', async ({ page }) => {
    await stubScreenAndDropAudio(page);
    await page.goto('/record');

    await page.getByRole('button', { name: /start recording/i }).click();
    await expect(page.getByRole('status', { name: /recording/i })).toBeVisible({
      timeout: 15_000,
    });

    // Buffer a couple of seconds of fake video chunks before triggering failure.
    await page.waitForTimeout(2_000);
    await triggerTrackFailure(page);

    // Error pane appears.
    const savePartialButton = page.getByRole('button', { name: /save partial recording/i });
    await expect(savePartialButton).toBeVisible({ timeout: 10_000 });

    // Click "Save partial recording" — salvages buffered chunks → review phase.
    await savePartialButton.click();

    // Review phase: download button appears. This confirms spec § 14's partial-
    // save path is wired end-to-end (engine salvage → hook → Studio → ReviewPane).
    const downloadButton = page.getByRole('button', { name: /download/i });
    await expect(downloadButton).toBeVisible({ timeout: 15_000 });

    // Trigger the download and verify the filename.
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const dl = await downloadPromise;
    expect(dl.suggestedFilename()).toMatch(/^record-me-.*\.(mp4|webm)$/);
  });

  test('"Start over" after track failure returns to setup', async ({ page }) => {
    await stubScreenAndDropAudio(page);
    await page.goto('/record');

    await page.getByRole('button', { name: /start recording/i }).click();
    await expect(page.getByRole('status', { name: /recording/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.waitForTimeout(1_000);
    await triggerTrackFailure(page);

    const startOverButton = page.getByRole('button', { name: /start over/i });
    await expect(startOverButton).toBeVisible({ timeout: 10_000 });

    await startOverButton.click();

    // Back at setup: Start recording button and mode picker must be visible.
    // Confirms reset() ran cleanly and the studio returned to idle.
    await expect(page.getByRole('button', { name: /start recording/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('radio', { name: /Camera only/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: cam-only happy-path no-regression
//
// record.spec.ts covers the full cam-only flow (download + re-record). This
// minimal check guards only that the Phase 6 Studio changes (banner/toast
// rendering, savePartial wiring, new analytics effects) did not break the
// happy path for a mode that never touches getDisplayMedia.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('studio-resilience: cam-only happy-path no-regression', () => {
  test('cam-only record → stop → review still works after Phase 6 Studio changes', async ({
    page,
  }) => {
    await dropAudio(page);
    await page.goto('/record');

    await page.getByRole('radio', { name: /Camera only/i }).click();
    await page.getByRole('button', { name: /start recording/i }).click();

    await expect(page.getByRole('status', { name: /recording/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.waitForTimeout(1_500);
    await page.getByRole('button', { name: /stop/i }).click();

    await expect(page.getByRole('button', { name: /download/i })).toBeVisible({ timeout: 15_000 });
  });
});
