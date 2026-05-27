# SEO

Authoritative reference for SEO discipline. Source of truth:
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 8.

## Metadata API

Every route exports `generateMetadata` (or static `metadata` object). No silent
inheritance. Title, description, OG image, Twitter card, canonical URL.

## OG images

Per-route `opengraph-image.tsx` rendered at the edge via `@vercel/og`. 1200×630.
Twilight palette + Instrument Serif headline + mono caption strip.

## Sitemap + robots

- `app/sitemap.ts` — dynamic; static routes + iterates over MDX changelog entries.
- `app/robots.ts` — allow all crawlers + sitemap pointer; disallow `/api/*`.

## Structured data (JSON-LD)

- `SoftwareApplication` + `WebApplication` on `/`
- `HowTo` on each `/features/[mode]`
- `FAQPage` on `/docs`

Injected via `<script type="application/ld+json">` per route.

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
