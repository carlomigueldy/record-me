import { expect, test } from '@playwright/test';

// NOTE: this suite runs against `pnpm dev` (the playwright.config.ts webServer).
// In dev, App Router compiles dynamic segments on demand and does NOT reliably
// hard-404 unknown params. The `dynamicParams=false → 404` assertion is verified
// against `next build && next start` in Task 10 Step 3, not here.

// Intercept Vercel analytics/speed-insights scripts that 404 in local dev — the
// proxy only resolves on Vercel's edge. Silences "Failed to load resource: 404"
// so the console-clean assertions remain strict for real app errors.
async function stubVercelScripts(page: Parameters<typeof test.beforeEach>[0]['page']) {
  await page.route('**/_vercel/insights/**', (route) => route.fulfill({ status: 200, body: '' }));
  await page.route('**/_vercel/speed-insights/**', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
}

// ────────────────────────────────────────────────────────────────────
// Helper: collect all JSON-LD objects from <script type="application/ld+json">
// elements on the current page. Returns a flat array of parsed objects.
// ────────────────────────────────────────────────────────────────────
async function collectJsonLd(
  page: Parameters<typeof test.beforeEach>[0]['page'],
): Promise<Record<string, unknown>[]> {
  const texts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
  const out: Record<string, unknown>[] = [];
  for (const raw of texts) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      out.push(...(items as Record<string, unknown>[]));
    } catch {
      // malformed — skip
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────
// Feature pages — /features/[mode]
// ────────────────────────────────────────────────────────────────────

test.describe('content system — /features/[mode]', () => {
  const FEATURE_ROUTES = [
    {
      path: '/features/screen-camera-cursor',
      // Exact § 8.2 segment + root template suffix
      title: 'Mode A — Screen, Camera & Cursor — record me',
    },
    {
      path: '/features/screen-cursor',
      title: 'Mode B — Screen & Cursor — record me',
    },
    {
      path: '/features/camera-only',
      title: 'Mode C — Camera Only — record me',
    },
  ];

  for (const { path, title } of FEATURE_ROUTES) {
    test(`${path} loads 200 with exact § 8.2 title`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `expected 200 for ${path}`).toBe(200);
      await expect(page).toHaveTitle(title);
    });

    test(`${path} has canonical link`, async ({ page }) => {
      await page.goto(path);
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);
      await expect(canonical).toHaveAttribute('href', new RegExp(path.replace(/\//g, '\\/')));
    });
  }

  test('each feature route has a unique <title> (no silent inheritance)', async ({ page }) => {
    const titles: string[] = [];
    for (const { path } of FEATURE_ROUTES) {
      await page.goto(path);
      titles.push(await page.title());
    }
    const unique = new Set(titles);
    expect(unique.size, `duplicate titles: ${titles.join(', ')}`).toBe(FEATURE_ROUTES.length);
  });

  test('HowTo JSON-LD is present on /features/screen-camera-cursor', async ({ page }) => {
    await page.goto('/features/screen-camera-cursor');
    const ld = await collectJsonLd(page);
    const howTo = ld.find((item) => item['@type'] === 'HowTo');
    expect(howTo, 'HowTo JSON-LD not found').toBeDefined();
    // At least one HowToStep must be present
    const steps = howTo?.['step'];
    expect(Array.isArray(steps) && steps.length > 0, 'HowTo has no steps').toBe(true);
  });

  test('BreadcrumbList JSON-LD is present on a feature page', async ({ page }) => {
    await page.goto('/features/camera-only');
    const ld = await collectJsonLd(page);
    const breadcrumb = ld.find((item) => item['@type'] === 'BreadcrumbList');
    expect(breadcrumb, 'BreadcrumbList JSON-LD not found').toBeDefined();
  });

  test('feature page h1 headline matches the § 8.2 title segment', async ({ page }) => {
    await page.goto('/features/screen-cursor');
    // The rendered <h1> carries the bare mode title (not the full document title).
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mode B');
  });

  test('console has zero errors on /features/screen-camera-cursor', async ({ page }) => {
    await stubVercelScripts(page);
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/features/screen-camera-cursor');
    await page.waitForLoadState('networkidle');

    expect(errors, `Console errors on feature page: ${errors.join('; ')}`).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────
// Docs index — /docs
// ────────────────────────────────────────────────────────────────────

test.describe('content system — /docs', () => {
  test('/docs loads 200 with expected title', async ({ page }) => {
    const res = await page.goto('/docs');
    expect(res?.status(), 'expected 200 for /docs').toBe(200);
    await expect(page).toHaveTitle(/Documentation — record me/);
  });

  test('/docs has canonical link', async ({ page }) => {
    await page.goto('/docs');
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute('href', /\/docs$/);
  });

  test('FAQPage JSON-LD is present on /docs', async ({ page }) => {
    await page.goto('/docs');
    const ld = await collectJsonLd(page);
    const faqPage = ld.find((item) => item['@type'] === 'FAQPage');
    expect(faqPage, 'FAQPage JSON-LD not found on /docs').toBeDefined();
    // mainEntity must be a non-empty array of Questions
    const entities = faqPage?.['mainEntity'];
    expect(Array.isArray(entities) && entities.length > 0, 'FAQPage has no questions').toBe(true);
  });

  test('visible FAQ block on /docs matches FAQPage JSON-LD questions (no duplicates)', async ({
    page,
  }) => {
    await page.goto('/docs');
    const ld = await collectJsonLd(page);
    const faqPage = ld.find((item) => item['@type'] === 'FAQPage');
    expect(faqPage, 'FAQPage JSON-LD not found').toBeDefined();

    const ldQuestions = (faqPage!['mainEntity'] as { '@type': string; name: string }[]).map(
      (q) => q.name,
    );

    // No duplicates in the JSON-LD question list
    const unique = new Set(ldQuestions);
    expect(unique.size, 'FAQPage contains duplicate questions').toBe(ldQuestions.length);

    // Every JSON-LD question text must appear visibly on the page
    const section = page.getByRole('region', { name: /frequently asked questions/i });
    await expect(section).toBeVisible();
    for (const q of ldQuestions) {
      await expect(section.getByText(q, { exact: false })).toBeVisible();
    }
  });

  test('/docs renders the section-grouped doc index', async ({ page }) => {
    await page.goto('/docs');
    // The DocsSidebar nav has aria-label="Documentation" and uses doc.title for
    // link text. Check that at least some doc links are rendered.
    const sidebar = page.getByRole('navigation', { name: /documentation/i });
    await expect(sidebar).toBeVisible();
    // The sidebar links use the doc title verbatim — "Permissions" and
    // "Codecs & Output Formats" (from the frontmatter title).
    await expect(sidebar.getByRole('link', { name: /Permissions/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Codecs/i })).toBeVisible();
  });

  test('console has zero errors on /docs', async ({ page }) => {
    await stubVercelScripts(page);
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/docs');
    await page.waitForLoadState('networkidle');

    expect(errors, `Console errors on /docs: ${errors.join('; ')}`).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────
// Doc detail pages — /docs/[...slug]
// ────────────────────────────────────────────────────────────────────

test.describe('content system — /docs/[slug]', () => {
  test('/docs/permissions loads 200 with title and canonical', async ({ page }) => {
    const res = await page.goto('/docs/permissions');
    expect(res?.status(), 'expected 200 for /docs/permissions').toBe(200);
    await expect(page).toHaveTitle(/Permissions — record me/);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute('href', /\/docs\/permissions$/);
  });

  test('/docs/permissions contains the MDX body prose', async ({ page }) => {
    await page.goto('/docs/permissions');
    // Assert on user-visible prose from permissions.mdx — not implementation details.
    await expect(page.getByRole('heading', { name: /How permissions work/i })).toBeVisible();
  });

  test('/docs/codecs loads 200 with title', async ({ page }) => {
    const res = await page.goto('/docs/codecs');
    expect(res?.status(), 'expected 200 for /docs/codecs').toBe(200);
    // The title is derived from the frontmatter title field.
    await expect(page).toHaveTitle(/Codecs & Output Formats — record me/);
  });

  test('/docs routes have unique titles (no silent inheritance from /docs or each other)', async ({
    page,
  }) => {
    const docRoutes = ['/docs/permissions', '/docs/codecs', '/docs/getting-started'];
    const titles: string[] = [];
    for (const route of docRoutes) {
      await page.goto(route);
      titles.push(await page.title());
    }
    const unique = new Set(titles);
    expect(unique.size, `duplicate titles: ${titles.join(', ')}`).toBe(docRoutes.length);
  });

  test('BreadcrumbList JSON-LD is present on /docs/permissions', async ({ page }) => {
    await page.goto('/docs/permissions');
    const ld = await collectJsonLd(page);
    const breadcrumb = ld.find((item) => item['@type'] === 'BreadcrumbList');
    expect(breadcrumb, 'BreadcrumbList JSON-LD not found on /docs/permissions').toBeDefined();
  });

  test('console has zero errors on /docs/permissions', async ({ page }) => {
    await stubVercelScripts(page);
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/docs/permissions');
    await page.waitForLoadState('networkidle');

    expect(errors, `Console errors on /docs/permissions: ${errors.join('; ')}`).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────
// Sitemap coverage — new 5C routes
// ────────────────────────────────────────────────────────────────────

test.describe('content system — sitemap', () => {
  test('sitemap.xml includes the 3 feature routes', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('/features/screen-camera-cursor');
    expect(body).toContain('/features/screen-cursor');
    expect(body).toContain('/features/camera-only');
  });

  test('sitemap.xml includes /docs and /docs/permissions', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('/docs');
    expect(body).toContain('/docs/permissions');
  });
});

// NOTE: OG image routes (/features/[mode]/opengraph-image, /docs/opengraph-image,
// /docs/[...slug]/opengraph-image) are NOT tested here. They are prerendered at
// build time and return 404 in `next dev`. OG route verification (200 + image/png
// + correct font/glyph rendering) is done in Task 10 Step 3 against the production
// build (`next build && next start`), per the plan.
