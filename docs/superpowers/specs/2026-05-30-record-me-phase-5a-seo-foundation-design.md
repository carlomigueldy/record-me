# record-me — Phase 5A · SEO foundation & thin pages — design spec

Status: **approved** (brainstormed 2026-05-30)
Source of truth: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 8, § 10, § 15
Epic: #5 (Phase 5 · Marketing surface)

---

## 1 · Summary

Phase 5 (Marketing surface) is decomposed into three sequenced sub-slices. This
spec covers **slice 5A** — the cross-cutting SEO foundation plus the two
low-motion content pages. 5A establishes the metadata / structured-data / OG /
sitemap machinery that every later page inherits, and ships `/privacy` and
`/changelog` as the first fully-indexed, production-quality public pages.

The editorial landing (`/`) is **slice 5B**; the MDX deep-content system
(`/features/[mode]`, `/docs`, `/docs/[...slug]`) is **slice 5C**. Each is its own
spec → plan → ship cycle. 5B and 5C both depend only on the foundation 5A lays.

## 2 · Phase 5 decomposition (context)

| Slice  | Surface                                                               | Depends on |
| ------ | --------------------------------------------------------------------- | ---------- |
| **5A** | SEO foundation + `/privacy` + `/changelog` ← _this spec_              | —          |
| 5B     | `/` editorial landing (motion, illustrations, signature moments)      | 5A         |
| 5C     | `/features/[mode]` + `/docs` + `/docs/[...slug]` (MDX content system) | 5A         |

The View-Transitions crossfade between `/` and `/features` is wired by whichever
of 5B / 5C ships second.

## 3 · Goals & non-goals

### 3.1 Goals

- A single, well-bounded `lib/seo/` module owning metadata, JSON-LD, and OG
  generation — so adding a route in 5B/5C is two thin files, not re-derived
  boilerplate.
- `/privacy` and `/changelog` ship as 10/10 editorial pages, fully indexed.
- `sitemap.ts`, `robots.ts`, `manifest.ts` live and correct.
- Content-Security-Policy header added (spec § 15 marks it "Phase 5"), without
  breaking Vercel Analytics / Speed Insights.
- Lighthouse ≥ 90 on the new routes; `lhci` extended to cover them.

### 3.2 Non-goals (deferred, with target slice)

- `/` rich content, motion, illustrations, and `SoftwareApplication` /
  `WebApplication` JSON-LD → **5B**. 5A leaves `/` as the Phase-2 placeholder and
  only adds site-wide default metadata.
- `/features/[mode]`, `/docs`, `/docs/[...slug]`, MDX pipeline, `HowTo` /
  `FAQPage` JSON-LD → **5C**.
- Per-page OG images for landing/features/docs → their slices (each reuses 5A's
  OG template).
- Nonce-based strict-CSP hardening → Phase 6 (5A ships a pragmatic header-based
  CSP allowing `self` + Vercel origins).
- Custom production domain → Phase 6 (5A is env-driven and correct-by-construction
  once the domain lands).

## 4 · Architecture — the `lib/seo/` module

Three small units plus a config object, each with one purpose and a typed
interface. Routes stay thin; the module is the single source of truth.

```
apps/web/src/lib/seo/
├── site-config.ts     # canonical base URL + brand strings
├── metadata.ts        # buildMetadata() → Next Metadata
├── json-ld.ts         # typed schema.org builders
└── json-ld.tsx        # <JsonLd> server component (script injector)

apps/web/src/app/_og/
├── template.tsx       # shared next/og ImageResponse template
└── fonts.ts           # font ArrayBuffer loader (Instrument Serif, Geist Mono)
```

### 4.1 `site-config.ts`

```ts
export const siteConfig = {
  name: 'record me',
  tagline: 'record your screen, beautifully',
  description: 'An editorial, privacy-first, browser-native video recording instrument. …',
  url: resolveSiteUrl(), // NEXT_PUBLIC_SITE_URL → VERCEL_PROJECT_PRODUCTION_URL → http://localhost:3000
} as const;
```

`resolveSiteUrl()` reads `NEXT_PUBLIC_SITE_URL`, falls back to
`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`, then `localhost:3000`.
The custom domain is set via env in Phase 6 — no code change. `metadataBase` in
the root layout is derived from `siteConfig.url`, so all canonical/OG URLs
resolve absolute.

### 4.2 `metadata.ts`

```ts
buildMetadata({ title, description, path, og? }): Metadata
```

- _Does:_ returns a Next `Metadata` with `title` (the root layout sets the
  `%s — record me` template; `/` uses an absolute title), `description`,
  `alternates.canonical` = `siteConfig.url + path`, `openGraph`, and
  `twitter` (`summary_large_image`). `og` optionally overrides the image
  (defaults to the route's `opengraph-image.tsx`).
- _Depends on:_ `siteConfig`.
- _Consumers:_ every route's `generateMetadata` / static `metadata`.

### 4.3 `json-ld.ts` + `<JsonLd>`

- Typed builders returning plain objects: `organizationLd()`, `webSiteLd()` in
  5A; `softwareApplicationLd()` / `webApplicationLd()` (5B), `howToLd()` /
  `faqLd()` (5C) added later in the same module.
- `<JsonLd data={…} />` — a server component rendering
  `<script type="application/ld+json">` with `JSON.stringify`. Root layout
  injects `Organization` + `WebSite`.

### 4.4 `_og/template.tsx`

- One `next/og` `ImageResponse` factory: 1200×630, Twilight background, Instrument
  Serif headline, Geist Mono caption strip at the bottom. Signature:
  `ogImage({ title, caption }): ImageResponse`.
- _Font loading:_ `_og/fonts.ts` loads Instrument Serif + Geist Mono as
  `ArrayBuffer` (read from bundled font assets) and passes them to
  `ImageResponse`'s `fonts` option. **Risk noted** (§ 9).
- _Consumers:_ `app/opengraph-image.tsx` (default), `app/privacy/opengraph-image.tsx`,
  `app/changelog/opengraph-image.tsx` — each ~5 lines.

## 5 · Routes & files shipped

### 5.1 Root layout (`app/layout.tsx`)

- Add `metadataBase` + default `metadata` (title template, description, default
  OG/Twitter) via `buildMetadata`.
- Inject `<JsonLd>` for `Organization` + `WebSite`.
- `<Analytics />` / `<SpeedInsights />` already mounted (Phase 1) — unchanged.

### 5.2 `/privacy` (`app/privacy/page.tsx`)

- RSC editorial page. Content drafted **from the privacy contract** (spec § 15 /
  `docs/SECURITY.md`): the 6-point contract, the canonical analytics sentence
  (spec § 10.3), "what we never do", and how to report a vulnerability.
- `generateMetadata` via `buildMetadata`. Sitemap priority 0.4.
- `app/privacy/opengraph-image.tsx` using the shared template.

### 5.3 `/changelog` (`app/changelog/page.tsx`)

- RSC page driven by a typed `app/changelog/changelog.ts` data array
  (**MDX-free** — editorial typed-data, the agreed approach). Entries double as a
  quiet build-story.
- Entry type:

```ts
type ChangelogEntry = {
  version: string; // '1.0.0'
  date: string; // ISO 'YYYY-MM-DD'
  title: string; // editorial headline
  summary: string; // 1–2 sentences
  highlights: string[]; // bullet notes
};
```

- v1.0.0 seed entry tells the launch story (three modes, privacy-first, no
  upload, browser-native). Entries are validated sorted-desc with unique
  versions (unit-tested).
- `generateMetadata` via `buildMetadata`. Sitemap priority 0.5.
  `app/changelog/opengraph-image.tsx` using the shared template.
- `sitemap.ts` iterates `changelog.ts` (foundation for future per-entry routes).

### 5.4 `sitemap.ts`, `robots.ts`, `manifest.ts`

- **`app/sitemap.ts`** — `MetadataRoute.Sitemap` listing routes that exist at 5A
  ship time: `/`, `/record`, `/privacy`, `/changelog`, with `lastModified`,
  `changeFrequency`, `priority` per spec § 8.2. Additive — each later slice adds
  its routes. Helper structured so 5B/5C append trivially.
- **`app/robots.ts`** — `MetadataRoute.Robots`: allow all; disallow `/api/`,
  `/dev/`; `sitemap` pointer to `siteConfig.url + '/sitemap.xml'`.
- **`app/manifest.ts`** — PWA-light: `name`, `short_name` ("record me"),
  `theme_color` / `background_color` (Twilight tokens), `display: 'standalone'`,
  `icons`. (Icon assets reused/added under `app/` per Next conventions.)

### 5.5 Security headers (`next.config.ts`)

- Add `Content-Security-Policy` to the existing `headers()` block. Pragmatic,
  header-based (no nonce in 5A):
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com`
  - `connect-src 'self' https://*.vercel-insights.com https://va.vercel-scripts.com`
  - `style-src 'self' 'unsafe-inline'`
  - `img-src 'self' data: blob:`
  - `font-src 'self'`
  - `media-src 'self' blob:`
  - `object-src 'none'`; `base-uri 'self'`; `frame-ancestors 'none'`
- **Must be verified** in-browser to not break Analytics / Speed Insights (no CSP
  violations in console). Exact Vercel origins confirmed against live network
  calls during verification. Nonce-based strict CSP → Phase 6.

## 6 · Data flow

```
siteConfig ──► buildMetadata() ──► route generateMetadata ──► <head>
            └► json-ld builders ─► <JsonLd> ──────────────► <head> script
            └► sitemap.ts / robots.ts ──────────────────► /sitemap.xml, /robots.txt
_og/template + _og/fonts ──► opengraph-image.tsx ───────► /…/opengraph-image (png)
changelog.ts ──► /changelog page  +  sitemap.ts iteration
SECURITY.md / spec §15 ──► /privacy page content
```

## 7 · Testing strategy

- **Unit (vitest):**
  - `buildMetadata` — title template, absolute canonical, OG/Twitter shape.
  - `json-ld` builders — valid `@context`/`@type`, required fields.
  - `changelog.ts` — entries sorted desc, unique versions, ISO dates.
  - `site-config` — `resolveSiteUrl()` precedence (env → vercel → localhost).
- **Component (Testing Library):** `/privacy` renders the 6 contract points;
  `/changelog` renders the seed entry.
- **E2E (Playwright):** `/privacy` + `/changelog` load 200; `<title>`, canonical
  `<link>`, `og:image` present; `/robots.txt` + `/sitemap.xml` respond 200 with
  expected entries; OG image routes return `image/png` 200.
- **Lighthouse (`lhci`):** extend config to `/privacy` + `/changelog`, budget ≥ 90.
- **Visual (Playwright MCP):** screenshot `/privacy` + `/changelog`; console clean
  (incl. **no CSP violations** with Analytics/Speed-Insights active).

## 8 · Definition of done (10/10)

- `pnpm build`, `typecheck`, `lint`, `test` all green.
- `lhci` green (≥ 90) on `/privacy` + `/changelog`.
- `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, and all three OG image
  routes return 200 with correct content-types.
- CSP present; Analytics + Speed Insights verified functional, zero CSP console
  violations.
- `/privacy` + `/changelog` visually verified via Playwright MCP, console clean.
- Docs updated: `docs/FRONTEND.md` (route table), `docs/SEO.md`,
  `docs/SECURITY.md` (CSP shipped), `docs/PROGRESS.md`, `docs/CODEBASE_MAP.md`.
- GH task issues closed; epic #5 reflects 5A complete.

## 9 · Open risks

- **OG fonts at the edge:** `next/og` needs fonts as `ArrayBuffer`. Bundling
  Instrument Serif + Geist Mono font files and loading them reliably (build-time
  read vs fetch) is the main implementation risk. Mitigation: read bundled font
  assets via `fs`/import; fall back to a system serif if load fails (OG still
  renders). Verify the rendered PNG visually.
- **CSP vs Vercel scripts:** the allow-list must match live Vercel Analytics /
  Speed-Insights origins exactly. Mitigation: confirm against the network panel
  during verification; keep `script-src 'unsafe-inline'` in 5A (nonce hardening
  deferred to Phase 6).
- **`metadataBase` in preview deploys:** `VERCEL_PROJECT_PRODUCTION_URL` is stable
  for prod; preview URLs differ. Canonicals should always point at the production
  URL — `resolveSiteUrl()` prefers `NEXT_PUBLIC_SITE_URL` / production URL, never
  the per-deployment URL.

## 10 · Dependencies & impact

- **New deps:** none required (`next/og` is built into Next 15; fonts bundled as
  assets). No `motion`, no MDX in 5A.
- **Touched files:** `app/layout.tsx` (metadata + JSON-LD), `next.config.ts`
  (CSP), `lighthouserc.json` (+routes). New: `lib/seo/*`, `app/_og/*`,
  `app/privacy/*`, `app/changelog/*`, `app/sitemap.ts`, `app/robots.ts`,
  `app/manifest.ts`.
- **Ownership:** sr-frontend (pages, lib/seo, OG), staff (next.config CSP,
  sitemap/robots/manifest, lhci wiring), e2e (Playwright smoke), scribe (docs),
  gatekeeper + principal (gates/review).
