import { expect, test } from '@playwright/test';

test.describe('SEO foundation', () => {
  test('/privacy has title, canonical, and og:image', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveTitle(/Privacy — record me/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/privacy$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });

  test('/changelog renders the seed release', async ({ page }) => {
    await page.goto('/changelog');
    await expect(page).toHaveTitle(/Changelog — record me/);
    await expect(page.getByText('record me, version one')).toBeVisible();
  });

  test('robots.txt allows crawl and points at sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('Sitemap:');
    expect(body).toContain('Disallow: /dev/');
  });

  test('sitemap.xml lists privacy + changelog', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('/privacy');
    expect(body).toContain('/changelog');
  });

  test('og image routes return png', async ({ request }) => {
    for (const path of [
      '/opengraph-image',
      '/privacy/opengraph-image',
      '/changelog/opengraph-image',
    ]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()['content-type'], path).toContain('image/png');
    }
  });
});
