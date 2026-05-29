import { expect, test, type Page } from '@playwright/test';

// On macOS, headless Chromium's --use-fake-device-for-media-stream provides a
// fake video device but getUserMedia({ audio: true }) hangs indefinitely —
// the fake audio sink is not available in this environment. The initScript
// below intercepts getUserMedia before the page JS runs and forces audio: false
// so the fake camera resolves immediately. The recording still produces a valid
// video blob and exercises the full setup → live → review user flow.
//
// In CI (Linux), --use-fake-device-for-media-stream covers both video and audio
// so this intercept is a no-op (the audio: false override is idempotent).
const dropAudio = async (page: Page) => {
  await page.addInitScript(() => {
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (constraints?: MediaStreamConstraints) =>
      orig(constraints ? { ...constraints, audio: false } : constraints);
  });
};

test.describe('studio /record', () => {
  test('setup renders the triptych and the studio chrome', async ({ page }) => {
    await page.goto('/record');
    await expect(page.getByLabel('record me — home')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Camera only/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /start recording/i })).toBeVisible();
    expect(await page.evaluate(() => document.title)).toMatch(/the studio/i);
  });

  test('Mode C records and produces a downloadable file', async ({ page }) => {
    await dropAudio(page);
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
    await dropAudio(page);
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
