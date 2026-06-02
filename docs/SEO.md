# SEO

Authoritative reference for SEO discipline. Source of truth:
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 8.

## Metadata API (Phase 5A · shipped)

Every route exports `generateMetadata` (or static `metadata` object). No silent
inheritance. Title, description, OG image, Twitter card, canonical URL.

Built using `buildMetadata()` from `lib/seo/metadata.ts` + root layout exports
`metadataBase` + `title.template` for auto-suffixing child pages.

## OG images (Phase 5A · shipped, Phase 6 · /record added)

Per-route `opengraph-image.tsx` rendered at the edge via `next/og` (built-in
`ImageResponse`). 1200×630. Twilight palette + Instrument Serif headline +
mono caption strip. Shared template in `app/_og/template.tsx`.

Phase 6 adds `/record/opengraph-image.tsx` for the studio route.

## Sitemap + robots (Phase 5A · shipped, Phase 5C · content routes)

- `app/sitemap.ts` — dynamic. Static 5A/5B routes (/, /record, /privacy, /changelog) plus the 5C content surface driven by `registry.routeList()`: +3 `/features/*` @ 0.8, `/docs` @ 0.6, each `/docs/<slug>` @ 0.6, all `changeFrequency: 'monthly'`. The single registry feeds both the sitemap and `generateStaticParams`, so they can't diverge.
- `app/robots.ts` — **unchanged** in 5C; new public routes inherit `allow: '/'`. Disallows `/api/*`, `/dev/*`.

## Web App Manifest (Phase 5A · shipped)

- `app/manifest.ts` — PWA metadata + brand icon reference.
- `app/icon.svg` — 64×64 brand icon (amber dot on Twilight).

## Structured data (JSON-LD) (Phase 5A · Foundation, Phase 5B · App schemas, Phase 5C · content, Phase 6 · /record)

- `Organization` + `WebSite` on root layout (via `lib/seo/json-ld.ts`)
- `SoftwareApplication` + `WebApplication` on `/` (Phase 5B · shipped)
- `WebApplication` + `BreadcrumbList` on `/record` (Phase 6 · shipped)
- `HowTo` (+ `HowToStep`) on each `/features/[mode]` (Phase 5C · shipped) — `howToLd()`, sourced from frontmatter `howToSteps[]`
- `FAQPage` (+ `Question`/`acceptedAnswer`) on `/docs` (Phase 5C · shipped) — `faqPageLd()`, from the registry's **deduped** doc `faq[]`, mirroring the visible on-page Q&A
- `BreadcrumbList` on every deep page (`/record`, `/features/[mode]`, `/docs/[...slug]`) — `breadcrumbLd()`, **additive beyond spec § 8.4** (not in the spec's JSON-LD list; supports the new deep-page IA). Each crumb carries a resolvable **absolute** URL (`new URL(path, siteConfig.url)`) — Google ignores relative item URLs.

All three 5C builders return the existing `Ld` type from `lib/seo/json-ld.ts`
(extended, not forked) and are injected via the `<JsonLd>` server component.
Frontmatter-sourced HowTo/FAQ structurally prevents the content-vs-markup
mismatch Google penalizes.

## OG images (Phase 5C content routes)

- `/features/[mode]/opengraph-image.tsx` — per-mode OG card (headline + deck), reusing `app/_og/template.tsx`'s `ogImage()`. Node runtime (default), fonts read via `fs` + `process.cwd()`.
- `/docs/opengraph-image.tsx` — a **single shared** docs OG card serving all `/docs/*`. There is intentionally **no per-doc OG**: Next 15 cannot place an `opengraph-image` inside a `[...slug]` catch-all (startup crash), so the per-doc OG was dropped in favor of one shared card at the `/docs` segment.
- Font tracing: both 5C OG routes have `outputFileTracingIncludes` keys in `next.config.ts` (`/features/[mode]/opengraph-image`, `/docs/opengraph-image`) forcing the `.ttf` fonts into the bundle (the paths are computed, invisible to `@vercel/nft`, so without the keys they render tofu on Vercel). A **dynamic** OG route's nft trace nests under an extra `[__metadata_id__]` segment — verify recursively, not at a flat path.

## CWV contract

- LCP < 1.8s · INP < 200ms · CLS < 0.05 (Speed Insights p75)
- Lighthouse per-route budgets (Phase 6 · in `lighthouserc.json`):
  - `/` (home): perf ≥ 0.95, a11y/bp/seo ≥ 0.95, LCP ≤ 1800, CLS ≤ 0.05
  - All others (`/record`, `/privacy`, `/changelog`, `/features/*`, `/docs*`): perf ≥ 0.90, a11y/bp/seo ≥ 0.95, LCP ≤ 1800, CLS ≤ 0.05
- Enforced in CI by `lhci` (see `lighthouserc.json` and `.github/workflows/ci.yml`)
- Phase 5C added 2 representative urls for spot-check coverage: `/features/screen-camera-cursor` + `/docs/getting-started` (verified passing: perf = 1.00, a11y = 1.00, bp = 0.96, seo = 1.00)
- Phase 6 expanded Lighthouse CI to all six routes (`/`, `/record`, `/privacy`, `/changelog`, `/features/[mode]`, `/docs/[...slug]`)

## Discipline rules

- `next/font` for all three typefaces. `font-display: swap`. Preconnect + preload
  Instrument Serif and Geist.
- `next/image` everywhere with explicit width/height.
- No JS-blocking embeds above the fold.
- i18n: routes will eventually wrap in `[locale]` segment — no migration risk noted.
