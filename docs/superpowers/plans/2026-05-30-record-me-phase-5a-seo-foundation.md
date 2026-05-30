# Phase 5A · SEO Foundation & Thin Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the cross-cutting SEO foundation (`lib/seo/` module, OG image template, sitemap/robots/manifest, CSP) plus the `/privacy` and `/changelog` pages as fully-indexed, 10/10 editorial pages.

**Architecture:** One well-bounded `lib/seo/` module owns metadata, JSON-LD, and OG generation; routes stay thin and call into it. A shared `next/og` template renders all OG cards. `/privacy` is drafted from the privacy contract; `/changelog` is an MDX-free typed-data array. Security headers gain a pragmatic CSP. The editorial landing (5B) and MDX content system (5C) inherit this foundation untouched.

**Tech Stack:** Next.js 15 (App Router, RSC), TypeScript, `next/og` (built-in `ImageResponse`), Vitest, Testing Library, Playwright, Tailwind v4, Vercel Analytics/Speed Insights.

**Spec:** `docs/superpowers/specs/2026-05-30-record-me-phase-5a-seo-foundation-design.md`

---

## File structure

**Create:**

- `apps/web/src/lib/seo/site-config.ts` — canonical base URL + brand strings
- `apps/web/src/lib/seo/site-config.test.ts`
- `apps/web/src/lib/seo/metadata.ts` — `buildMetadata()`
- `apps/web/src/lib/seo/metadata.test.ts`
- `apps/web/src/lib/seo/json-ld.ts` — typed schema.org builders
- `apps/web/src/lib/seo/json-ld.test.ts`
- `apps/web/src/lib/seo/JsonLd.tsx` — script-injector server component
- `apps/web/src/app/_og/fonts.ts` — font ArrayBuffer loader
- `apps/web/src/app/_og/fonts/InstrumentSerif-Regular.ttf` (asset)
- `apps/web/src/app/_og/fonts/GeistMono-Regular.ttf` (asset)
- `apps/web/src/app/_og/template.tsx` — shared OG `ImageResponse` factory
- `apps/web/src/app/opengraph-image.tsx` — default OG
- `apps/web/src/app/privacy/page.tsx`
- `apps/web/src/app/privacy/page.test.tsx`
- `apps/web/src/app/privacy/opengraph-image.tsx`
- `apps/web/src/app/changelog/changelog.ts` — typed entries
- `apps/web/src/app/changelog/changelog.test.ts`
- `apps/web/src/app/changelog/page.tsx`
- `apps/web/src/app/changelog/page.test.tsx`
- `apps/web/src/app/changelog/opengraph-image.tsx`
- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/sitemap.test.ts`
- `apps/web/src/app/robots.ts`
- `apps/web/src/app/robots.test.ts`
- `apps/web/src/app/manifest.ts`
- `apps/web/tests/e2e/seo.spec.ts`

**Modify:**

- `apps/web/src/app/layout.tsx` — metadataBase + default metadata + root JSON-LD
- `apps/web/next.config.ts` — CSP header
- `lighthouserc.json` — add `/privacy`, `/changelog`
- `docs/FRONTEND.md`, `docs/SEO.md`, `docs/SECURITY.md`, `docs/PROGRESS.md`, `docs/CODEBASE_MAP.md`

---

### Task 1: `site-config.ts` — canonical base URL resolution

**Files:**

- Create: `apps/web/src/lib/seo/site-config.ts`
- Test: `apps/web/src/lib/seo/site-config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/seo/site-config.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveSiteUrl } from './site-config';

describe('resolveSiteUrl', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('prefers NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://record.me');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'rec.vercel.app');
    expect(resolveSiteUrl()).toBe('https://record.me');
  });

  it('falls back to VERCEL_PROJECT_PRODUCTION_URL with https', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'rec.vercel.app');
    expect(resolveSiteUrl()).toBe('https://rec.vercel.app');
  });

  it('falls back to localhost in dev', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    expect(resolveSiteUrl()).toBe('http://localhost:3000');
  });

  it('strips a trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://record.me/');
    expect(resolveSiteUrl()).toBe('https://record.me');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @record-me/web test src/lib/seo/site-config.test.ts`
Expected: FAIL — cannot find module `./site-config`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/lib/seo/site-config.ts
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`.replace(/\/$/, '');

  return 'http://localhost:3000';
}

export { resolveSiteUrl };

export const siteConfig = {
  name: 'record me',
  tagline: 'record your screen, beautifully',
  description:
    'An editorial, privacy-first, browser-native video recording instrument. Screen, camera, cursor — composed in the browser, downloaded to disk. No accounts, no upload.',
  url: resolveSiteUrl(),
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @record-me/web test src/lib/seo/site-config.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/seo/site-config.ts apps/web/src/lib/seo/site-config.test.ts
git commit -m "feat(seo): site-config with canonical url resolution"
```

---

### Task 2: `metadata.ts` — `buildMetadata()`

**Files:**

- Create: `apps/web/src/lib/seo/metadata.ts`
- Test: `apps/web/src/lib/seo/metadata.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/seo/metadata.test.ts
import { describe, expect, it } from 'vitest';
import { buildMetadata } from './metadata';
import { siteConfig } from './site-config';

describe('buildMetadata', () => {
  it('builds an absolute canonical from path', () => {
    const m = buildMetadata({
      title: 'Privacy',
      description: 'How we treat your data.',
      path: '/privacy',
    });
    expect(m.alternates?.canonical).toBe(`${siteConfig.url}/privacy`);
  });

  it('sets title, description, and og/twitter', () => {
    const m = buildMetadata({
      title: 'Changelog',
      description: 'What shipped.',
      path: '/changelog',
    });
    expect(m.title).toBe('Changelog');
    expect(m.description).toBe('What shipped.');
    expect(m.openGraph?.url).toBe(`${siteConfig.url}/changelog`);
    expect(m.openGraph?.title).toBe('Changelog');
    expect(m.twitter?.card).toBe('summary_large_image');
  });

  it('normalizes the root path to no trailing slash', () => {
    const m = buildMetadata({ title: 'Home', description: 'x', path: '/' });
    expect(m.alternates?.canonical).toBe(`${siteConfig.url}/`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @record-me/web test src/lib/seo/metadata.test.ts`
Expected: FAIL — cannot find module `./metadata`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/lib/seo/metadata.ts
import type { Metadata } from 'next';
import { siteConfig } from './site-config';

type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
  /** Optional OG image override (absolute or root-relative). Defaults to the route's opengraph-image. */
  og?: string;
};

function buildMetadata({ title, description, path, og }: BuildMetadataInput): Metadata {
  const url = new URL(path, siteConfig.url).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      title,
      description,
      url,
      ...(og ? { images: [{ url: og, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(og ? { images: [og] } : {}),
    },
  };
}

export { buildMetadata };
export type { BuildMetadataInput };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @record-me/web test src/lib/seo/metadata.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/seo/metadata.ts apps/web/src/lib/seo/metadata.test.ts
git commit -m "feat(seo): buildMetadata helper"
```

---

### Task 3: `json-ld.ts` builders + `<JsonLd>` component

**Files:**

- Create: `apps/web/src/lib/seo/json-ld.ts`, `apps/web/src/lib/seo/JsonLd.tsx`
- Test: `apps/web/src/lib/seo/json-ld.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/seo/json-ld.test.ts
import { describe, expect, it } from 'vitest';
import { organizationLd, webSiteLd } from './json-ld';
import { siteConfig } from './site-config';

describe('json-ld builders', () => {
  it('organizationLd has required schema.org fields', () => {
    const ld = organizationLd();
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('Organization');
    expect(ld.name).toBe(siteConfig.name);
    expect(ld.url).toBe(siteConfig.url);
  });

  it('webSiteLd has required schema.org fields', () => {
    const ld = webSiteLd();
    expect(ld['@type']).toBe('WebSite');
    expect(ld.name).toBe(siteConfig.name);
    expect(ld.url).toBe(siteConfig.url);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @record-me/web test src/lib/seo/json-ld.test.ts`
Expected: FAIL — cannot find module `./json-ld`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/lib/seo/json-ld.ts
import { siteConfig } from './site-config';

type Ld = Record<string, unknown> & { '@context': 'https://schema.org'; '@type': string };

function organizationLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

function webSiteLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

export { organizationLd, webSiteLd };
export type { Ld };
```

```tsx
// apps/web/src/lib/seo/JsonLd.tsx
import type { Ld } from './json-ld';

function JsonLd({ data }: { data: Ld | Ld[] }) {
  return (
    <script
      type="application/ld+json"
      // schema.org payload is static + trusted (no user input)
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export { JsonLd };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @record-me/web test src/lib/seo/json-ld.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/seo/json-ld.ts apps/web/src/lib/seo/JsonLd.tsx apps/web/src/lib/seo/json-ld.test.ts
git commit -m "feat(seo): json-ld builders + JsonLd component"
```

---

### Task 4: Root layout — metadataBase, default metadata, root JSON-LD

**Files:**

- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Read the current layout**

Run: `cat apps/web/src/app/layout.tsx`
Note the existing `metadata` export, font setup, and `<Analytics />` / `<SpeedInsights />` placement — preserve all of it.

- [ ] **Step 2: Add metadataBase + title template + default metadata**

Replace the existing `export const metadata` with a `metadataBase`-aware version. Merge — do not drop existing font/analytics wiring. Spread the base first, then override `metadataBase` and `title` (no duplicate literal keys):

```tsx
import type { Metadata } from 'next';
import { siteConfig } from '@/lib/seo/site-config';
import { buildMetadata } from '@/lib/seo/metadata';

const base = buildMetadata({
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  path: '/',
});

export const metadata: Metadata = {
  ...base,
  metadataBase: new URL(siteConfig.url),
  // override the string title from `base` with the default+template object so
  // child pages with a string title render as "<Page> — record me"
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
};
```

> Why this works: Next applies a parent's `title.template` to any child page that sets a _string_ `title` (e.g. `/privacy` → "Privacy — record me"). The spread-then-override avoids the `no-dupe-keys` lint error.

- [ ] **Step 3: Inject root JSON-LD in the `<body>`**

Add inside the rendered tree (e.g., just before `{children}`):

```tsx
import { JsonLd } from '@/lib/seo/JsonLd';
import { organizationLd, webSiteLd } from '@/lib/seo/json-ld';
// ...
<JsonLd data={[organizationLd(), webSiteLd()]} />;
```

- [ ] **Step 4: Verify build + typecheck**

Run: `pnpm --filter @record-me/web typecheck && pnpm --filter @record-me/web build`
Expected: PASS. Build output lists `/` with metadata.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(seo): wire metadataBase, default metadata, root json-ld"
```

---

### Task 5: OG template + font loader + default `opengraph-image.tsx`

**Files:**

- Create: `apps/web/src/app/_og/fonts.ts`, `apps/web/src/app/_og/fonts/InstrumentSerif-Regular.ttf`, `apps/web/src/app/_og/fonts/GeistMono-Regular.ttf`, `apps/web/src/app/_og/template.tsx`, `apps/web/src/app/opengraph-image.tsx`

- [ ] **Step 1: Source the two font files**

Download the regular weights into `apps/web/src/app/_og/fonts/` (these mirror the brand typefaces; bundling avoids a runtime network dependency):

```bash
mkdir -p apps/web/src/app/_og/fonts
curl -fsSL -o apps/web/src/app/_og/fonts/InstrumentSerif-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/instrumentserif/InstrumentSerif-Regular.ttf
curl -fsSL -o apps/web/src/app/_og/fonts/GeistMono-Regular.ttf \
  https://github.com/vercel/geist-font/raw/main/packages/next/dist/fonts/geist-mono/GeistMono-Regular.ttf
# Verify both are non-empty TTFs:
file apps/web/src/app/_og/fonts/*.ttf && ls -l apps/web/src/app/_og/fonts/*.ttf
```

Expected: both files report "TrueType Font" and are > 10 KB. If a URL 404s, source the same family's Regular `.ttf` from the official repo and update the path.

> **Geist Mono fallback (important):** `next/og` (satori) only accepts **static** TTF/OTF — it does **not** support variable or `woff2` fonts. Geist Mono frequently ships only as variable `woff2`. If a static Geist Mono `.ttf`/`.otf` cannot be sourced, **drop the mono font** and render the OG caption strip in Instrument Serif instead: remove the Geist Mono entry from `loadOgFonts` (Step 2) and change `fontFamily: 'Geist Mono'` → `fontFamily: 'Instrument Serif'` in `template.tsx` (Step 3). The card still renders fully on-brand with one font. Do not block the task on sourcing Geist Mono.

- [ ] **Step 2: Write the font loader**

```ts
// apps/web/src/app/_og/fonts.ts
async function loadOgFonts() {
  const [serif, mono] = await Promise.all([
    fetch(new URL('./fonts/InstrumentSerif-Regular.ttf', import.meta.url)).then((r) =>
      r.arrayBuffer(),
    ),
    fetch(new URL('./fonts/GeistMono-Regular.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
  ]);
  return [
    { name: 'Instrument Serif', data: serif, weight: 400 as const, style: 'normal' as const },
    { name: 'Geist Mono', data: mono, weight: 400 as const, style: 'normal' as const },
  ];
}

export { loadOgFonts };
```

- [ ] **Step 3: Write the shared OG template**

```tsx
// apps/web/src/app/_og/template.tsx
import { ImageResponse } from 'next/og';
import { loadOgFonts } from './fonts';

const SIZE = { width: 1200, height: 630 };

// Twilight tokens (kept literal — next/og can't read CSS variables)
const BG = '#0d0b14';
const IVORY = '#ece7de';
const IVORY_DIM = '#b9b3a8';
const AMBER = '#e0a04d';
const LINE = '#2a2735';

async function ogImage({
  title,
  caption,
}: {
  title: string;
  caption: string;
}): Promise<ImageResponse> {
  const fonts = await loadOgFonts();
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BG,
        padding: '72px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 1, background: AMBER }} />
        <span
          style={{
            fontFamily: 'Geist Mono',
            fontSize: 22,
            letterSpacing: 4,
            color: IVORY_DIM,
            textTransform: 'uppercase',
          }}
        >
          record me
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          fontFamily: 'Instrument Serif',
          fontSize: 88,
          lineHeight: 1.05,
          color: IVORY,
          maxWidth: 980,
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `1px solid ${LINE}`,
          paddingTop: 24,
        }}
      >
        <span style={{ fontFamily: 'Geist Mono', fontSize: 20, color: AMBER, letterSpacing: 2 }}>
          {caption}
        </span>
        <span style={{ fontFamily: 'Geist Mono', fontSize: 18, color: IVORY_DIM }}>
          browser-native · no upload
        </span>
      </div>
    </div>,
    { ...SIZE, fonts },
  );
}

export { ogImage, SIZE };
```

- [ ] **Step 4: Write the default OG route**

```tsx
// apps/web/src/app/opengraph-image.tsx
import { ogImage, SIZE } from './_og/template';
import { siteConfig } from '@/lib/seo/site-config';

export const size = SIZE;
export const contentType = 'image/png';
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;

export default function OgImage() {
  return ogImage({ title: 'Record your screen, beautifully.', caption: 'privacy-first' });
}
```

- [ ] **Step 5: Verify the image renders**

Run: `pnpm --filter @record-me/web build` then `pnpm --filter @record-me/web start &` and:
`curl -sS -o /tmp/og-default.png -w "%{http_code} %{content_type}\n" http://localhost:3000/opengraph-image`
Expected: `200 image/png`; `file /tmp/og-default.png` reports a PNG ~1200×630. Open it and confirm the serif headline renders (not tofu). Stop the server.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/_og apps/web/src/app/opengraph-image.tsx
git commit -m "feat(seo): shared next/og template + default og image"
```

---

### Task 6: `/privacy` page + metadata + OG

**Files:**

- Create: `apps/web/src/app/privacy/page.tsx`, `apps/web/src/app/privacy/page.test.tsx`, `apps/web/src/app/privacy/opengraph-image.tsx`

- [ ] **Step 1: Write the failing component test**

```tsx
// apps/web/src/app/privacy/page.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PrivacyPage from './page';

describe('PrivacyPage', () => {
  it('renders the core privacy promise', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: /privacy/i })).toBeInTheDocument();
    expect(screen.getByText(/never leave/i)).toBeInTheDocument();
    expect(screen.getByText(/no accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/cookieless/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @record-me/web test src/app/privacy/page.test.tsx`
Expected: FAIL — cannot find module `./page`.

- [ ] **Step 3: Write the page (real copy drawn from the privacy contract — `docs/SECURITY.md` / spec §15, §10.3)**

```tsx
// apps/web/src/app/privacy/page.tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy',
  description:
    'Recording bytes never leave your browser. No accounts, no upload, cookieless analytics.',
  path: '/privacy',
});

const PROMISES = [
  [
    'Recording bytes never leave your browser.',
    'Encoded chunks live in memory or IndexedDB and are offered for direct download. No upload endpoint exists.',
  ],
  [
    'No accounts, no auth cookies.',
    'record me sets zero cookies for authentication or session tracking.',
  ],
  [
    'Analytics are cookieless and anonymous.',
    'Vercel Analytics and Speed Insights aggregate page views and Core Web Vitals only — never your content.',
  ],
  [
    'Custom events carry no PII.',
    'Only mode, duration, byte size, mime type, and error kind are recorded.',
  ],
  [
    'Nothing persists between sessions.',
    'IndexedDB stores are wiped on stop and on the next session start. No recording artifacts linger.',
  ],
  [
    'Locked down by headers.',
    'A Content-Security-Policy blocks third-party scripts beyond Vercel itself.',
  ],
] as const;

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-24">
      <header className="flex flex-col gap-4">
        <div className="h-px w-16 bg-line" aria-hidden="true" />
        <h1 className="m-0 font-serif text-5xl text-ivory">Privacy</h1>
        <p className="max-w-prose text-lg leading-relaxed text-ivory-dim">
          record me is built so your recordings are yours alone. The whole pipeline runs in your
          browser — there is no server to send anything to.
        </p>
      </header>

      <ol className="m-0 flex list-none flex-col gap-6 p-0">
        {PROMISES.map(([title, body]) => (
          <li key={title} className="flex flex-col gap-1">
            <h2 className="m-0 text-base font-medium text-ivory">{title}</h2>
            <p className="m-0 max-w-prose text-sm leading-relaxed text-ivory-dim">{body}</p>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 className="m-0 text-base font-medium text-ivory">Reporting a vulnerability</h2>
        <p className="m-0 max-w-prose text-sm leading-relaxed text-ivory-dim">
          Open a private security advisory on the GitHub repository. Please do not file a public
          issue.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @record-me/web test src/app/privacy/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the OG route**

```tsx
// apps/web/src/app/privacy/opengraph-image.tsx
import { ogImage, SIZE } from '../_og/template';

export const size = SIZE;
export const contentType = 'image/png';
export const alt = 'record me — Privacy';

export default function OgImage() {
  return ogImage({ title: 'Your recordings never leave your browser.', caption: 'privacy' });
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/privacy
git commit -m "feat(privacy): editorial /privacy page + metadata + og"
```

---

### Task 7: `changelog.ts` typed data + validation test

**Files:**

- Create: `apps/web/src/app/changelog/changelog.ts`, `apps/web/src/app/changelog/changelog.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/app/changelog/changelog.test.ts
import { describe, expect, it } from 'vitest';
import { changelog } from './changelog';

describe('changelog data', () => {
  it('has at least one entry', () => {
    expect(changelog.length).toBeGreaterThan(0);
  });

  it('entries are sorted newest-first by date', () => {
    const dates = changelog.map((e) => e.date);
    const sorted = [...dates].sort((a, b) => (a < b ? 1 : -1));
    expect(dates).toEqual(sorted);
  });

  it('versions are unique and dates are ISO yyyy-mm-dd', () => {
    const versions = changelog.map((e) => e.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const e of changelog) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.highlights.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @record-me/web test src/app/changelog/changelog.test.ts`
Expected: FAIL — cannot find module `./changelog`.

- [ ] **Step 3: Write the data**

```ts
// apps/web/src/app/changelog/changelog.ts
type ChangelogEntry = {
  version: string;
  date: string; // ISO yyyy-mm-dd
  title: string;
  summary: string;
  highlights: string[];
};

const changelog: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '2026-05-30',
    title: 'record me, version one',
    summary:
      'A browser-native recording instrument with three modes, composed locally and downloaded to disk. No accounts. No upload.',
    highlights: [
      'Three modes — Screen + Camera + Cursor, Screen + Cursor, and Camera only.',
      'Everything runs in the browser; recordings never touch a server.',
      'Live composite preview, stop-and-review, and direct download.',
      'Cookieless, anonymous analytics — your content is never measured.',
    ],
  },
];

export { changelog };
export type { ChangelogEntry };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @record-me/web test src/app/changelog/changelog.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/changelog/changelog.ts apps/web/src/app/changelog/changelog.test.ts
git commit -m "feat(changelog): typed changelog data + invariants"
```

---

### Task 8: `/changelog` page + metadata + OG

**Files:**

- Create: `apps/web/src/app/changelog/page.tsx`, `apps/web/src/app/changelog/page.test.tsx`, `apps/web/src/app/changelog/opengraph-image.tsx`

- [ ] **Step 1: Write the failing component test**

```tsx
// apps/web/src/app/changelog/page.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChangelogPage from './page';

describe('ChangelogPage', () => {
  it('renders the seed release', () => {
    render(<ChangelogPage />);
    expect(screen.getByRole('heading', { level: 1, name: /changelog/i })).toBeInTheDocument();
    expect(screen.getByText(/record me, version one/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @record-me/web test src/app/changelog/page.test.tsx`
Expected: FAIL — cannot find module `./page`.

- [ ] **Step 3: Write the page**

```tsx
// apps/web/src/app/changelog/page.tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { changelog } from './changelog';

export const metadata: Metadata = buildMetadata({
  title: 'Changelog',
  description: 'What shipped in record me, version by version.',
  path: '/changelog',
});

export default function ChangelogPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-12 px-6 py-24">
      <header className="flex flex-col gap-4">
        <div className="h-px w-16 bg-line" aria-hidden="true" />
        <h1 className="m-0 font-serif text-5xl text-ivory">Changelog</h1>
        <p className="max-w-prose text-lg leading-relaxed text-ivory-dim">
          The story of record me, one release at a time.
        </p>
      </header>

      <ol className="m-0 flex list-none flex-col gap-12 p-0">
        {changelog.map((entry) => (
          <li key={entry.version} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-amber">
                v{entry.version}
              </span>
              <time className="font-mono text-xs text-ivory-mut" dateTime={entry.date}>
                {entry.date}
              </time>
            </div>
            <h2 className="m-0 font-serif text-2xl text-ivory">{entry.title}</h2>
            <p className="m-0 max-w-prose text-sm leading-relaxed text-ivory-dim">
              {entry.summary}
            </p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {entry.highlights.map((h) => (
                <li key={h} className="flex gap-2 text-sm leading-relaxed text-ivory-dim">
                  <span aria-hidden="true" className="text-amber">
                    ·
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @record-me/web test src/app/changelog/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the OG route**

```tsx
// apps/web/src/app/changelog/opengraph-image.tsx
import { ogImage, SIZE } from '../_og/template';

export const size = SIZE;
export const contentType = 'image/png';
export const alt = 'record me — Changelog';

export default function OgImage() {
  return ogImage({ title: 'What shipped, version by version.', caption: 'changelog' });
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/changelog/page.tsx apps/web/src/app/changelog/page.test.tsx apps/web/src/app/changelog/opengraph-image.tsx
git commit -m "feat(changelog): /changelog page + metadata + og"
```

---

### Task 9: `sitemap.ts`

**Files:**

- Create: `apps/web/src/app/sitemap.ts`, `apps/web/src/app/sitemap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/app/sitemap.test.ts
import { describe, expect, it } from 'vitest';
import sitemap from './sitemap';
import { siteConfig } from '@/lib/seo/site-config';

describe('sitemap', () => {
  it('lists the live 5A routes with absolute urls', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain(`${siteConfig.url}/`);
    expect(urls).toContain(`${siteConfig.url}/record`);
    expect(urls).toContain(`${siteConfig.url}/privacy`);
    expect(urls).toContain(`${siteConfig.url}/changelog`);
  });

  it('does not list dev-only routes', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.includes('/dev'))).toBe(false);
  });

  it('assigns the homepage the highest priority', () => {
    const home = sitemap().find((e) => e.url === `${siteConfig.url}/`);
    expect(home?.priority).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @record-me/web test src/app/sitemap.test.ts`
Expected: FAIL — cannot find module `./sitemap`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo/site-config';

// Additive: each later slice (5B/5C) appends its routes here.
const ROUTES: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}[] = [
  { path: '/', priority: 1.0, changeFrequency: 'monthly' },
  { path: '/record', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/changelog', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified,
    changeFrequency,
    priority,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @record-me/web test src/app/sitemap.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/sitemap.ts apps/web/src/app/sitemap.test.ts
git commit -m "feat(seo): dynamic sitemap"
```

---

### Task 10: `robots.ts`

**Files:**

- Create: `apps/web/src/app/robots.ts`, `apps/web/src/app/robots.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/app/robots.test.ts
import { describe, expect, it } from 'vitest';
import robots from './robots';
import { siteConfig } from '@/lib/seo/site-config';

describe('robots', () => {
  it('allows all and disallows api + dev', () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule?.allow).toBe('/');
    expect(rule?.disallow).toEqual(expect.arrayContaining(['/api/', '/dev/']));
  });

  it('points at the sitemap', () => {
    expect(robots().sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @record-me/web test src/app/robots.test.ts`
Expected: FAIL — cannot find module `./robots`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/src/app/robots.ts
import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/dev/'] }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @record-me/web test src/app/robots.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/robots.ts apps/web/src/app/robots.test.ts
git commit -m "feat(seo): robots.txt"
```

---

### Task 11: `manifest.ts`

**Files:**

- Create: `apps/web/src/app/manifest.ts`

- [ ] **Step 1: Write the implementation**

```ts
// apps/web/src/app/manifest.ts
import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo/site-config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0b14',
    theme_color: '#0d0b14',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
```

- [ ] **Step 2: Ensure a referenced icon exists**

Confirm `apps/web/src/app/icon.svg` (or `icon.png`) exists; if not, add a minimal brand `icon.svg` (amber dot on Twilight). Run: `ls apps/web/src/app/icon.*`. If absent, create `apps/web/src/app/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0d0b14"/><circle cx="32" cy="32" r="11" fill="#e0a04d"/></svg>
```

Update `manifest.ts` `icons.src` to the resolved path (Next serves `app/icon.svg` at `/icon.svg`).

- [ ] **Step 3: Verify build + manifest route**

Run: `pnpm --filter @record-me/web build && pnpm --filter @record-me/web start &`
`curl -sS -w "%{http_code} %{content_type}\n" -o /dev/null http://localhost:3000/manifest.webmanifest`
Expected: `200 application/manifest+json`. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/manifest.ts apps/web/src/app/icon.svg
git commit -m "feat(seo): web app manifest + brand icon"
```

---

### Task 12: CSP + security headers in `next.config.ts`

**Files:**

- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Add the CSP header to the existing `headers()` block**

Append to the existing `headers` array for `source: '/(.*)'` (keep the four existing headers):

```ts
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
},
```

- [ ] **Step 2: Build + run + verify analytics is not blocked**

Run: `pnpm --filter @record-me/web build && pnpm --filter @record-me/web start &`
Then with Playwright MCP: `browser_navigate http://localhost:3000/record`, `browser_console_messages`.
Expected: page loads; **no `Content-Security-Policy` violation messages** in the console. If Vercel Analytics/Speed-Insights report a blocked origin, add the exact origin shown in the console/network panel to `script-src`/`connect-src` and re-verify. Stop the server.

- [ ] **Step 3: Verify the header is present**

Run: `curl -sS -D - -o /dev/null http://localhost:3000/ | grep -i content-security-policy`
Expected: the CSP header value prints.

- [ ] **Step 4: Commit**

```bash
git add apps/web/next.config.ts
git commit -m "feat(security): content-security-policy header"
```

---

### Task 13: E2E smoke — metadata, robots, sitemap, OG

**Files:**

- Create: `apps/web/tests/e2e/seo.spec.ts`

- [ ] **Step 1: Inspect the existing E2E setup**

Run: `ls apps/web/tests/e2e && cat apps/web/playwright.config.ts`
Note the `baseURL` and webServer config; reuse them (do not hardcode ports).

- [ ] **Step 2: Write the smoke test**

```ts
// apps/web/tests/e2e/seo.spec.ts
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
```

- [ ] **Step 3: Run the E2E suite**

Run: `pnpm --filter @record-me/web test:e2e seo.spec.ts`
Expected: all specs PASS (Playwright boots the web server per `playwright.config.ts`).

- [ ] **Step 4: Commit**

```bash
git add apps/web/tests/e2e/seo.spec.ts
git commit -m "test(seo): e2e smoke for metadata, robots, sitemap, og"
```

---

### Task 14: Extend Lighthouse CI to the new routes

**Files:**

- Modify: `lighthouserc.json`

- [ ] **Step 1: Inspect the current config**

Run: `cat lighthouserc.json`
Note the `collect.url` array and the assertion thresholds.

- [ ] **Step 2: Add the two routes**

Add `http://localhost:3000/privacy` and `http://localhost:3000/changelog` to `ci.collect.url` (match the existing host/port pattern). Keep the existing `/` and `/record` entries and the ≥ 90 category assertions.

- [ ] **Step 3: Run Lighthouse locally**

Run: `pnpm --filter @record-me/web build && pnpm lhci autorun` (or the repo's documented lhci command from `docs/COMMANDS.md`).
Expected: performance / SEO / best-practices / a11y ≥ 90 on `/privacy` and `/changelog`. Fix any flagged issue (e.g., missing `lang`, contrast, unsized media) before continuing.

- [ ] **Step 4: Commit**

```bash
git add lighthouserc.json
git commit -m "ci(seo): lighthouse budgets for /privacy + /changelog"
```

---

### Task 15: Visual verification + docs + full gate

**Files:**

- Modify: `docs/FRONTEND.md`, `docs/SEO.md`, `docs/SECURITY.md`, `docs/PROGRESS.md`, `docs/CODEBASE_MAP.md`

- [ ] **Step 1: Visual verification (Playwright MCP)**

Build + start the app. For `/privacy` and `/changelog`: `browser_navigate`, `browser_resize { width: 1440, height: 900 }`, `browser_evaluate document.fonts.ready`, `browser_take_screenshot`, `browser_console_messages`.
Expected: both pages render on-brand (Twilight, Instrument Serif headings), console clean, **zero CSP violations** with Analytics active. Capture the OG PNGs (`/privacy/opengraph-image`, `/changelog/opengraph-image`) and confirm the serif headline + mono caption render correctly.

- [ ] **Step 2: Update docs**

- `docs/FRONTEND.md` — set `/privacy` and `/changelog` rows to "Phase 5A · shipped"; note the `lib/seo/` module + `_og/` template in the inventory.
- `docs/SEO.md` — mark metadata helper, OG template, sitemap/robots/manifest as shipped; reference `lib/seo/`.
- `docs/SECURITY.md` — change the "(Phase 5)" CSP line to shipped; record the exact policy string.
- `docs/PROGRESS.md` — under Phase 5, add a "Slice 5A · complete" block checking off the foundation + thin pages; note 5B/5C still planned.
- `docs/CODEBASE_MAP.md` — add the new files under their owners.

- [ ] **Step 3: Full gate**

Run: `pnpm -w typecheck && pnpm -w lint && pnpm -w test && pnpm --filter @record-me/web build && pnpm --filter @record-me/web test:e2e seo.spec.ts`
Expected: all green. (Use the repo's actual root scripts from `docs/COMMANDS.md` if names differ.)

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs(phase-5a): mark SEO foundation + thin pages shipped"
```

---

## Self-review notes (coverage check)

- **Spec §4 `lib/seo/`** → Tasks 1–3 (site-config, metadata, json-ld + JsonLd). ✓
- **Spec §4.4 OG template + fonts** → Task 5. ✓
- **Spec §5.1 root layout** → Task 4. ✓
- **Spec §5.2 /privacy** → Task 6. ✓
- **Spec §5.3 /changelog (typed data)** → Tasks 7–8. ✓
- **Spec §5.4 sitemap/robots/manifest** → Tasks 9–11. ✓
- **Spec §5.5 CSP** → Task 12. ✓
- **Spec §7 testing (unit/component/e2e/lhci/visual)** → unit+component inline per task; Task 13 (e2e), Task 14 (lhci), Task 15 (visual). ✓
- **Spec §8 DoD (docs, gate)** → Task 15. ✓
- **Type consistency:** `buildMetadata`/`siteConfig`/`ogImage({title,caption})`/`ChangelogEntry`/`organizationLd`/`webSiteLd`/`loadOgFonts` used consistently across tasks. ✓
- **Deferred (not in this plan, by design):** `/` rich content + SoftwareApplication JSON-LD (5B); features/docs/MDX + HowTo/FAQ (5C); nonce CSP + domain (Phase 6).
