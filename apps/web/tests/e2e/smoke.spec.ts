import { expect, test } from '@playwright/test';

test('landing page renders the placeholder', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'record me' })).toBeVisible();
  await expect(page).toHaveTitle(/record me/);
});
