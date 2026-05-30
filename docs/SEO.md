# SEO

Authoritative reference for SEO discipline. Source of truth:
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 8.

## Metadata API (Phase 5A · shipped)

Every route exports `generateMetadata` (or static `metadata` object). No silent
inheritance. Title, description, OG image, Twitter card, canonical URL.

Built using `buildMetadata()` from `lib/seo/metadata.ts` + root layout exports
`metadataBase` + `title.template` for auto-suffixing child pages.

## OG images (Phase 5A · shipped)

Per-route `opengraph-image.tsx` rendered at the edge via `next/og` (built-in
`ImageResponse`). 1200×630. Twilight palette + Instrument Serif headline +
mono caption strip. Shared template in `app/_og/template.tsx`.

## Sitemap + robots (Phase 5A · shipped)

- `app/sitemap.ts` — dynamic; lists Phase 5A routes (/, /record, /privacy, /changelog) with priorities and changeFrequency.
- `app/robots.ts` — allow all crawlers + sitemap pointer; disallow `/api/*`, `/dev/*`.

## Web App Manifest (Phase 5A · shipped)

- `app/manifest.ts` — PWA metadata + brand icon reference.
- `app/icon.svg` — 64×64 brand icon (amber dot on Twilight).

## Structured data (JSON-LD) (Phase 5A · Foundation, Phase 5B · App schemas)

- `Organization` + `WebSite` on root layout (via `lib/seo/json-ld.ts`)
- `SoftwareApplication` + `WebApplication` on `/` (Phase 5B · shipped)
- `HowTo` on each `/features/[mode]` (Phase 5C · planned)
- `FAQPage` on `/docs` (Phase 5C · planned)

Injected via `<JsonLd>` server component from `lib/seo/JsonLd.tsx`.

## CWV contract

- LCP < 1.8s · INP < 200ms · CLS < 0.05 (Speed Insights p75)
- Lighthouse ≥ 95 on `/`, ≥ 90 elsewhere
- Enforced in CI by `lhci` (see `lighthouserc.json` and `.github/workflows/ci.yml`)

## Discipline rules

- `next/font` for all three typefaces. `font-display: swap`. Preconnect + preload
  Instrument Serif and Geist.
- `next/image` everywhere with explicit width/height.
- No JS-blocking embeds above the fold.
- i18n: routes will eventually wrap in `[locale]` segment — no migration risk noted.
