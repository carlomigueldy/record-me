import { expect, test } from '@playwright/test';

test.describe('landing page (/)', () => {
  test('loads 200 with landing title and h1 headline visible', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);

    // Page title includes the configured name + tagline.
    await expect(page).toHaveTitle(/record me — record your screen, beautifully/i);

    // LCP headline — h1 is always server-rendered, never JS-gated.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('"Start recording" link navigates to /record', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /start recording/i }).click();
    await expect(page).toHaveURL('/record');
  });

  test('#modes anchor is present and all three mode h3 titles are visible', async ({ page }) => {
    await page.goto('/');

    // The anchor target exists in the DOM.
    const modesSection = page.locator('#modes');
    await expect(modesSection).toBeAttached();

    // All three mode h3 card titles rendered by ModeTriptych.
    await expect(page.getByRole('heading', { level: 3, name: /Screen, camera/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: /Screen & cursor/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: /Camera only/i })).toBeVisible();
  });

  test('SoftwareApplication application/ld+json script is present', async ({ page }) => {
    await page.goto('/');

    // The JsonLd component writes one <script type="application/ld+json"> that
    // contains an array — one entry must be @type SoftwareApplication.
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    let found = false;
    for (const script of scripts) {
      const raw = await script.textContent();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as unknown;
        const items = Array.isArray(parsed) ? parsed : [parsed];
        if (
          items.some((item) => (item as Record<string, unknown>)['@type'] === 'SoftwareApplication')
        ) {
          found = true;
          break;
        }
      } catch {
        // malformed script — keep scanning
      }
    }
    expect(found, 'SoftwareApplication JSON-LD not found on /').toBe(true);
  });

  test('console has zero errors on /', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    // Allow time for any deferred hydration errors to surface.
    await page.waitForLoadState('networkidle');

    expect(errors, `Console errors: ${errors.join('; ')}`).toHaveLength(0);
  });

  test('reduced-motion: all content sections present (motion must not gate content)', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Hero headline — moment 1.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Modes section — moment 2.
    await expect(page.locator('#modes')).toBeAttached();
    await expect(page.getByRole('heading', { level: 3, name: /Camera only/i })).toBeVisible();

    // Studio section — moment 3.
    await expect(page.locator('#studio')).toBeAttached();
  });
});
