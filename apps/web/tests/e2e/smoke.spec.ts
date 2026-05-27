import { expect, test } from '@playwright/test';

test('landing page renders the wordmark and metadata chips', async ({ page }) => {
  await page.goto('/');
  // WordMark exposes its brand name via aria-label; the rendered <em> for "me"
  // is hidden from AT, so accessible name is "record me" on the wrapping span.
  await expect(page.getByLabel('record me')).toBeVisible();
  await expect(page.getByText('phase 2 live')).toBeVisible();
  await expect(page).toHaveTitle(/record me/);
});
