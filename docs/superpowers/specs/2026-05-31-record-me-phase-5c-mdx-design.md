# record-me — Phase 5C · MDX content system (`/features` + `/docs`) — design spec

Status: **approved** (brainstormed 2026-05-31 via an autonomous planning workflow; downstream decisions self-made and recorded here)
Source of truth: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 8.1–8.7, § 9
Continuity: `docs/superpowers/specs/2026-05-30-record-me-phase-5a-seo-foundation-design.md` (extend, do not fork) · `docs/superpowers/specs/2026-05-30-record-me-phase-5b-landing-design.md` (lands the deferred `/`↔`/features` View-Transition)
Epic: #5 (Phase 5 · Marketing surface)

---

## 1 · Summary

Phase 5C ships the **MDX content system** — the deep editorial surface that the
landing page (`/`, 5B) and the SEO foundation (5A) were built to feed. It adds
two statically-generated content surfaces to the App Router tree:

- **`/features/[mode]`** — three fixed deep pages (`screen-camera-cursor`,
  `screen-cursor`, `camera-only`) authored as colocated `_content/*.mdx`
  fragments, each carrying `HowTo` JSON-LD and a per-mode OG card.
- **`/docs`** + **`/docs/[...slug]`** — a six-page documentation set
  (getting-started · permissions · codecs · safari · browser-support ·
  troubleshooting) under a catch-all, with `FAQPage` JSON-LD on the index and a
  static on-page TOC + section sidebar on each doc.

This is **slice 5C** of Phase 5. 5A (foundation) and 5B (landing) shipped. 5C
also lands the 5B-deferred **`/`↔`/features` View-Transition** by wiring a
"Learn more →" `TransitionLink` into each `ModeTriptych` card — pure wiring,
reusing the existing `TransitionLink` + `::view-transition` CSS, no new motion
infrastructure.

The architecture rests on one separation of concerns: the **body** is compiled
by first-party **`@next/mdx`** at build time (no runtime eval → passes the
strict no-`unsafe-eval` production CSP; prerendered static HTML → Lighthouse
≥ 90), while **everything structured** (routing params, per-route metadata,
sitemap entries, breadcrumbs, the docs index/sidebar, and HowTo/FAQ/Breadcrumb
JSON-LD) is driven by a single **zod-validated typed content registry** under
`lib/content/`. All SEO surface reuses the 5A `lib/seo` helpers — extended, never
forked.

## 2 · Decisions (self-decided, recorded)

| #                      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MDX compiler           | First-party `@next/mdx` (`createMDX`), **100% build-time / static** compilation. `.mdx` authored, statically imported via fixed slug→module maps — `FEATURE_BODY` (features) and `DOC_BODY` in `doc-bodies.ts` (docs), both keyed by slug; the docs `[...slug]` route does an allow-list check (validate vs `getAllDocSlugs()` → `notFound()`) then reads the static `DOC_BODY` map — **no dynamic `import()`** of param-shaped input. Every route: `generateStaticParams()` + `export const dynamicParams = false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Only option satisfying all four hard constraints at once — first-party (versions with Next 15.1 + React 19, no third-party scaffold to lag a Next major), zero MDX runtime to the client, never evals (passes strict production `script-src`, no header change, verified `next.config.ts` L29–31), prerenders to static HTML (surest path to Lighthouse ≥ 90 / LCP < 1.8s). `next-mdx-remote` collides with the CSP; contentlayer is unmaintained on Next 15; fumadocs fights the bespoke Twilight design system. `createMDX` is ESM-imported and composes as `export default withMDX(config)` over the existing tuned `type:module` config.                                                                                                                                                                                       |
| Typed registry         | Body renderer (`@next/mdx`) kept **separate** from a typed content layer at `lib/content/`: `schema.ts` (zod), `loader.ts` (gray-matter read + parse), `registry.ts` (`allFeatures`, `allDocs`, `docsBySection`, `routeList`, `getBySlug`, prev/next, `dedupeFaq`). The registry — not the MDX bodies — drives routing/metadata/sitemap/nav/JSON-LD.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Resolves the cross-dimension conflict (first-party static body **and** one zod-validated source feeding routing/metadata/sitemap/nav/JSON-LD), eliminating the drift `sitemap.ts`'s "additive" comment warns about. zod parse at module load fails the build on malformed/incomplete frontmatter. The explicit FAQ dedupe is required because two docs can legitimately repeat a question; emitting duplicates is an invalid `FAQPage` Google can penalize.                                                                                                                                                                                                                                                                                                                                                                        |
| Frontmatter parse      | `gray-matter` parses YAML at build; a zod `frontmatterSchema` validates + types it. Validated frontmatter is the **only** metadata source — MDX bodies never export `metadata`/`frontmatter` consts (review rule). Test fixtures live under `lib/content/__fixtures__/` (src-anchored for cwd-safe vitest reads).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Single typed source feeds `generateMetadata` and the HowTo/FAQPage builders so JSON-LD cannot drift from copy (the mismatch Google demotes). Build-time zod parse is fail-fast, matches the 10/10 bar; the loader is a pure function carrying the new surface's coverage; the slug-guard + `getAllDocSlugs` branch (the security-relevant catch-all import path) is explicitly covered. `draft` dropped in prod. Anchoring fixtures under `src` avoids cwd-relative read flakiness in jsdom.                                                                                                                                                                                                                                                                                                                                       |
| Syntax highlighting    | `rehype-pretty-code` (Shiki) at **build time**, `keepBackground:false`, **single dark theme** `theme: 'github-dark-default'` (string, not the dual-theme object). The app is **dark-only** — no theme toggle, no `data-theme`/class on `<html>`, no `ThemeProvider` (verified: `layout.tsx` sets only font-variable classes; `globals.css` uses fixed `var(--bg)`/`var(--ivory)`; grep for `data-theme`/`prefers-color-scheme`/`ThemeProvider` in `apps/web/src` is empty). Single-theme mode emits a **resolved inline `style="color:#…"` per token** (NO `--shiki-light`/`--shiki-dark` var pair, NO multi-value `data-theme`, NO variant selector needed). `globals.css` tokens only the **wrapper** (pre/figure bg, border, radius, padding).                                                                                                                                                                                                                                                                                                                   | Highlighting runs at build → nothing ships a client highlighter, nothing evals. **CSP-safe with no header change**: production `style-src` already allows `'unsafe-inline'` (verified `next.config.ts` L49), which is exactly what permits Shiki's resolved inline `color` style. Single-theme is the correct choice on a dark-only app: dual-theme would make the **light** GitHub token colors the un-selected base (light-on-dark on the Twilight surface), inverting intent and risking the global 0.95-a11y AA-contrast gate. The per-token github-dark hexes ship inside Shiki-emitted inline styles — a documented build-time boundary (like the next/og template hex), not a raw-hex-in-TSX violation. Dual-theme would be reconsidered only if a real `data-theme='dark'` were first added on `<html>` (out of 5C scope). |
| remark/rehype set      | `remark-gfm`, `rehype-slug`, `rehype-autolink-headings` (`behavior:'wrap'`), `rehype-pretty-code`. Wired via `createMDX({ options:{ remarkPlugins, rehypePlugins } })`, leaving `outputFileTracingRoot/Includes` and `headers()` untouched. NO KaTeX, NO mdx-rs. Dev stays plain `next dev` (webpack) — **never** `--turbopack`; an inline comment beside `createMDX` records this.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Minimal set covering authoring + on-page TOC + CSP-safe highlighting. Both `next dev` and Vercel `next build` are webpack here (neither script passes `--turbopack`, verified `package.json`), so function-form plugins are safe; Turbopack can't pass them to Rust and `rehype-pretty-code` options aren't fully serializable, so `--turbopack` would silently break highlighting. The inline comment makes the caveat enforce itself at the edit site.                                                                                                                                                                                                                                                                                                                                                                           |
| Content file layout    | Feature fragments colocated at `app/features/[mode]/_content/{slug}.mdx` (matches master-spec § 8.1; underscore keeps them out of routing) via a fixed 3-key static import map. Docs at `src/content/docs/**/*.mdx` rendered by `[...slug]` via the static `DOC_BODY` import map (`doc-bodies.ts`), the slug first validated against `getAllDocSlugs()` (`notFound()` on miss) — **no dynamic `import()`** (an aliased `import(\`@/…\`)` template is a webpack dynamic-context footgun; the static map is fully analyzable). **v1 ships only flat single-segment slugs mapped to flat files** (`DOC_BODY`keyed by`slug.join('-')`). The `[...slug]` route segment can already capture nested URLs, but the flat-file loader does **not** resolve directory nesting (`['recording','codecs']`would map to the flat file`recording-codecs.mdx`, with a collision risk against a flat doc of that name) — so nested URLs are **low-effort but not zero-rework**: they require a slug→file convention change (deferred). PINNED slug↔mode map in `content/features.ts`. | Honors the spec's `_content/` literalism while keeping the 3 fixed fragments statically analyzable and giving docs a flat, scalable dir. Slug-guard + `dynamicParams=false` makes the catch-all safe over param-shaped input (unknown slugs `notFound()` before any import). The three slug↔mode pairs are pinned verbatim to prevent the off-by-one: `camera-only`→`cam-only`, not `camera-only`→`camera-only`.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| JSON-LD                | **Extend** `lib/seo/json-ld.ts` (do not fork) with three pure builders returning the existing `Ld` type, injected via `<JsonLd>`: `howToLd()` → HowTo+HowToStep on each `/features/[mode]`; `faqPageLd()` → FAQPage+Question on `/docs` from the registry's **deduped** doc FAQ set; `breadcrumbLd()` → BreadcrumbList (absolute URLs) on every deep page. All frontmatter-sourced.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Maximal 5A reuse, matching the brief + the builder-test convention. Frontmatter-sourced HowTo/FAQ structurally prevents the content-vs-markup mismatch Google penalizes; FAQPage uses the deduped question set so it stays valid and matches visible Q&A. `breadcrumbLd`/`BreadcrumbList` is **NOT** in spec § 8.4 (which lists only HowTo on features + FAQPage on `/docs`) — it is an **intentional additive** enhancement for the new deep-page IA, flagged so gatekeeper/scribe don't treat it as scope creep; each crumb carries a resolvable absolute URL or Google ignores the markup.                                                                                                                                                                                                                                      |
| Per-route metadata     | Every `/features/[mode]`, `/docs`, `/docs/[...slug]` exports `generateMetadata()` calling 5A `buildMetadata({ title, description, path })` with the **bare** § 8.2 title segment (root `title.template '%s — record me'` appends the brand — no pre-suffixing). `buildMetadata` gains one additive optional `robots` field. No silent inheritance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Reuses the correct 5A helper unchanged in behavior; the additive `robots` field is a minor test-covered extension (5C routes are all indexed, so they won't set it). Bare segments + the existing `title.template` (verified `app/layout.tsx`) yield exact titles. The § 8.2 segment "Mode A — Screen, Camera & Cursor" already contains an em dash, so the rendered title is a double em-dash — a conscious copy decision reviewed for readability at authoring, not patched in the template.                                                                                                                                                                                                                                                                                                                                     |
| Per-route OG + tracing | Add `app/features/[mode]/opengraph-image.tsx` + `app/docs/[...slug]/opengraph-image.tsx` + a static docs-index OG, all reusing `_og/template.tsx`'s `ogImage()` + SIZE/contentType/alt (default Node runtime). **Mandatory:** register both new route globs in `next.config.ts` `outputFileTracingIncludes` → `['src/app/_og/fonts/**']`, keys `/features/[mode]/opengraph-image` and `/docs/[...slug]/opengraph-image`. Verify the keys against the `.next` build manifest.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Reuses the 5A OG template (hex stays in `template.tsx`, the documented next/og boundary). The tracing-includes extension is non-negotiable: the OG routes read `.ttf` via computed `process.cwd` paths invisible to `@vercel/nft`, so without the include they render tofu on Vercel — exactly the failure recorded in 5A learnings (faa8d01). A mismatched key silently no-ops, so verify it against the manifest rather than trusting the string.                                                                                                                                                                                                                                                                                                                                                                                |
| Sitemap, robots, lhci  | Append to `sitemap.ts` ROUTES (driven by `registry.routeList`): 3× `/features/*` @ 0.8, `/docs` @ 0.6, each `/docs/[...slug]` @ 0.6, `changeFrequency:'monthly'`. `robots.ts` **unchanged**. Extend `lighthouserc.json` `url` with one `/features/<slug>` + one `/docs/<slug>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Single registry feeds both sitemap and `generateStaticParams` so they can't diverge; priorities match § 8.2. `robots.ts` needs no change (already `allow:'/'`, disallow `/api` `/dev`; new public routes inherit `allow`, its test stays green). Without the lhci URL additions the ≥ 90 requirement on the new routes is unenforced (false-green); the additions run the full global budget — including the strict 0.95 a11y/bp/seo assertions — against the new content surface.                                                                                                                                                                                                                                                                                                                                                 |
| MDX rendering & VT     | Root `mdx-components.tsx` (`useMDXComponents` via the App Router file convention — no `@mdx-js/react`/`MDXProvider`) maps `h1–h6/p/a/ul/ol/blockquote/code/pre/img/hr` → `@record-me/ui` primitives + Twilight token classes (no raw hex), `next/image` (explicit dims), `TransitionLink` for internal links. A new token-based `Prose` wrapper wraps the body; static server-rendered TOC + docs sidebar (no scroll-spy JS). The 5B-deferred View-Transition lands via a "Learn more →" `TransitionLink` per `ModeTriptych` card → `/features/<slug>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | One brand seam (`mdx-components.tsx`) to audit for raw-hex; token-only mapping reuses `@record-me/ui` and preserves Twilight + Instrument Serif/Geist. The code map styles only the wrapper in tokens (foreground = the documented Shiki-inline boundary), so the no-raw-hex audit has a single honest scope. Static TOC/sidebar add zero JS and no CLS, protecting Lighthouse ≥ 90 + the 0.95 a11y gate. `TransitionLink` + the existing crossfade CSS mean the 5B-deferred crossfade is a wiring task; the app-scoped `ModeTriptych` path is pinned to avoid the prose-path ambiguity.                                                                                                                                                                                                                                           |

## 3 · Goals & non-goals

### 3.1 Goals

- Three 10/10 `/features/[mode]` deep pages authored as colocated `_content/*.mdx`, each with `HowTo` JSON-LD and a per-mode OG card.
- A `/docs` index + six `/docs/[...slug]` docs (getting-started · permissions · codecs · safari · browser-support · troubleshooting), `FAQPage` JSON-LD on the index, static TOC + sidebar.
- One zod-validated typed registry (`lib/content/`) as the single source of truth for params, metadata, sitemap, nav, and JSON-LD.
- All content statically prerendered (build-time MDX, `dynamicParams=false`); zero MDX runtime to the client; no CSP header change.
- 5A `lib/seo` reuse — `buildMetadata`, `<JsonLd>`, OG template — extended with `howToLd`/`faqPageLd`/`breadcrumbLd` + an optional `robots` field.
- The 5B-deferred `/`↔`/features` View-Transition wired (Learn more → `TransitionLink` per `ModeTriptych` card).
- Lighthouse ≥ 90 on `/features/<slug>` and `/docs/<slug>` — and, because the lhci assertions are global, ≥ 0.95 accessibility / best-practices / SEO, CLS ≤ 0.05, LCP ≤ 1800 ms.
- Copy/codec accuracy: **MP4 · H.264 (AAC), WebM/VP9 fallback** — never "VP9-first"; Free · MIT; client-side, no upload, no accounts.

### 3.2 Non-goals (deferred)

- Analytics/event instrumentation on the new feature/docs pages → **Phase 6** (taxonomy exists; per-page events are Phase 6 polish).
- Custom domain / production-host SEO → **Phase 6** (canonicals already derive from `siteConfig`/Vercel URL).
- Client-side docs **search** and **scroll-spy** TOC highlighting → post-v1 (v1 ships static server-rendered TOC + sidebar to protect CWV).
- Runtime/CMS-driven MDX (`next-mdx-remote`, DB/CMS source) → rejected outright on the CSP collision + LCP budget; content is fixed and in-repo.
- `fumadocs` / `contentlayer` / `velite` content frameworks → rejected as over-engineered + design-system-conflicting for ~9 pages.
- Nested `/docs/<section>/<slug>` URLs → v1 ships flat `/docs/<slug>` (loader maps `slug.join('-')` → flat file). The `[...slug]` route segment captures nesting, but supporting nested **files** needs a slug→file convention change (low effort, deferred — not zero-rework).
- Math/KaTeX rendering and dynamic per-changelog-entry OG (`api/og/route.ts`) → not needed for this slice.
- Forcing classed (non-inline) Shiki output or a custom CSP that drops `style-src 'unsafe-inline'` → explicitly **not** pursued; the inline `--shiki-*` var output is the intended, CSP-safe design.
- `i18n`/`[locale]` segment → future wrapper, not in 5C.
- Per-doc "last updated" automation from git history → the optional `updated` frontmatter field exists, but auto-population is out of scope.

## 4 · Architecture

**Shape.** Phase 5C adds two statically-generated content surfaces to the
existing App Router tree: `/features/[mode]` (3 fixed modes) and `/docs` +
`/docs/[...slug]` (catch-all). The decision that ties the dimensions together is
a **separation of concerns**: the _body_ is compiled by first-party
**`@next/mdx`** at build time (no runtime eval → passes the strict
no-`unsafe-eval` production CSP, verified in `next.config.ts` L29–31; prerendered
static HTML → Lighthouse ≥ 90), while _everything structured_ (routing params,
per-route metadata, sitemap entries, breadcrumbs, the docs index/sidebar, and
HowTo/FAQ/Breadcrumb JSON-LD) is driven by a single **zod-validated typed content
registry** under `lib/content/`.

**Build-time, static, CSP-safe.** `next.config.ts` is wrapped with
`createMDX({ options: { remarkPlugins, rehypePlugins } })` (ESM-imported,
composing over the existing `type:module` config) and `pageExtensions` gains
`md`/`mdx`; `outputFileTracingRoot`, the existing `outputFileTracingIncludes`,
and `headers()` are left intact (only two new OG-route globs appended to
includes). Both routes export `generateStaticParams()` +
`export const dynamicParams = false`, so every page is prerendered and unknown
slugs 404. An inline comment beside `createMDX` records the no-`--turbopack`
constraint at the edit site.

**Syntax highlighting (single dark theme — dark-only app).** Highlighting is
**`rehype-pretty-code` (Shiki) at build time**, `keepBackground:false`,
**single theme `theme: 'github-dark-default'`** (a string, not the dual-theme
`{ dark, light }` object). This app is **dark-only**: there is no theme toggle,
no `data-theme`/class on `<html>`, and no `ThemeProvider` (verified —
`layout.tsx` sets only font-variable classes; `globals.css` uses fixed
`var(--bg)`/`var(--ivory)`; grep for `data-theme`/`prefers-color-scheme`/
`ThemeProvider` in `apps/web/src` is empty). Under single-theme mode
`rehype-pretty-code` emits a **resolved inline `style="color:#…"` per token**
(NO `--shiki-light`/`--shiki-dark` var pair, NO multi-value `data-theme`, and so
NO variant selector is needed or written) — it does NOT emit classed token
colors. This is **CSP-safe with no header change** because production
`style-src` already allows `'unsafe-inline'` (verified `next.config.ts` L49),
which is exactly what permits the inline `color`. Consumer CSS in `globals.css`
maps the **wrapper only** (pre/figure background, border, radius, padding) to
Twilight tokens (`--color-surface`/`--color-line`, validated as `@theme` aliases
over `--surface`/`--line`); it does **not** recolor per-token foreground (Shiki
already resolved it for the dark theme). The per-token github-dark foreground
hexes ship inside the Shiki-emitted inline styles — a documented build-time
boundary like the next/og template hex, NOT a raw-hex-in-TSX violation. Dual-theme
is deliberately rejected here: it would default to the **light** token colors
(light-on-dark on the Twilight surface), inverting intent and endangering the
global 0.95 a11y AA-contrast gate; it would be reconsidered only if a real
`data-theme='dark'` were first added on `<html>` (out of 5C scope). Nothing ships
a client highlighter and nothing evals.

**Reuse, not duplication.** `lib/seo/json-ld.ts` gains
`howToLd`/`faqPageLd`/`breadcrumbLd` (same `Ld` type, injected via the existing
`<JsonLd>`); `faqPageLd` consumes the registry's **deduped** doc FAQ set;
`breadcrumbLd`/`BreadcrumbList` is an intentional additive extension beyond spec
§ 8.4, with absolute crumb URLs. `buildMetadata` gains one additive optional
`robots` field; OG routes reuse `_og/template.tsx`'s `ogImage()`. The
`/`↔`/features` View-Transition reuses the existing `TransitionLink` +
`::view-transition` CSS already in `globals.css`. `RecordMode` engine values
(`screen+cam+cursor` | `screen+cursor` | `cam-only`, verified
`packages/recorder/src/types.ts` L4) ≠ URL slugs, so an explicit, **pinned**
slug↔mode map lives in `content/features.ts`:
`screen-camera-cursor → screen+cam+cursor`, `screen-cursor → screen+cursor`,
`camera-only → cam-only`.

**Lighthouse gating.** `lighthouserc.json` adds one `/features/<slug>` + one
`/docs/<slug>` URL. The assertions are **global**, so the new routes must clear
**0.95 accessibility / 0.95 best-practices / 0.95 SEO** as well as 0.90
performance, CLS ≤ 0.05, LCP ≤ 1800 ms — the AA-contrast code wrapper, reserved
code/TOC/img dimensions, and per-route `generateMetadata` feed those gates.

**v1 docs set (6 pages, 4 sections):** getting-started · permissions, codecs
(section: recording) · safari, browser-support (section: browser-support) ·
troubleshooting. Flat single-segment URLs/files in v1; nested URLs are low-effort-but-not-zero-rework (the `[...slug]` segment captures them, but the flat-file loader convention would need a change — deferred).

### 4.1 New / changed files under `apps/web/src`

```
apps/web/src/
├── app/
│   ├── features/
│   │   ├── layout.tsx                         # NEW · shared deep-page chrome (masthead + footer, 1280 shell)
│   │   └── [mode]/
│   │       ├── page.tsx                       # NEW · RSC; generateStaticParams (3 slugs) + dynamicParams=false; generateMetadata; HowTo + Breadcrumb JSON-LD; renders _content body via Prose
│   │       ├── opengraph-image.tsx            # NEW · per-mode OG (reuses _og/template ogImage; Node runtime)
│   │       └── _content/
│   │           ├── screen-camera-cursor.mdx   # NEW · Mode A body (slug→screen+cam+cursor)
│   │           ├── screen-cursor.mdx          # NEW · Mode B body (slug→screen+cursor)
│   │           └── camera-only.mdx            # NEW · Mode C body (slug→cam-only)
│   ├── docs/
│   │   ├── layout.tsx                         # NEW · docs chrome + static sidebar (docsBySection)
│   │   ├── page.tsx                           # NEW · docs index; FAQPage JSON-LD from registry DEDUPED faq[]; visible matching Q&A; grouped list
│   │   ├── opengraph-image.tsx                # NEW · static docs OG card
│   │   └── [...slug]/
│   │       ├── page.tsx                       # NEW · RSC; generateStaticParams from registry + dynamicParams=false; static DOC_BODY map (slug validated vs getAllDocSlugs() → notFound(); no dynamic import); generateMetadata; Breadcrumb JSON-LD; static TOC aside; prev/next
│   │       └── opengraph-image.tsx            # NEW · per-doc OG
│   ├── _components/
│   │   ├── content/
│   │   │   ├── Prose.tsx                      # NEW · token-based MDX body wrapper (Instrument Serif / Geist / Geist Mono); code WRAPPER tokens (foreground = Shiki resolved-inline, single dark theme)
│   │   │   ├── Prose.test.tsx                 # NEW
│   │   │   ├── Toc.tsx                        # NEW · static server-rendered on-page TOC (rehype-slug anchors); reserved dims
│   │   │   ├── Breadcrumbs.tsx                # NEW · RSC breadcrumb trail (absolute URLs)
│   │   │   ├── DocsSidebar.tsx                # NEW · static section-grouped sidebar
│   │   │   └── *.test.tsx                     # NEW · smoke + a11y tests
│   │   └── landing/
│   │       └── ModeTriptych.tsx               # CHANGED · add "Learn more →" TransitionLink per card → /features/<slug> (lands deferred crossfade)
│   ├── sitemap.ts                             # CHANGED · ROUTES driven by registry.routeList (+3 features 0.8, +docs index 0.6, +each doc 0.6)
│   ├── sitemap.test.ts                        # CHANGED · assert new routes + priorities
│   └── globals.css                            # CHANGED · code-block WRAPPER → Twilight token mapping (AA-contrast); single dark Shiki theme → resolved inline per-token color, no --shiki-* var selector
├── mdx-components.tsx                          # NEW · root useMDXComponents() — element→@record-me/ui + token classes, next/image, TransitionLink (sole brand seam)
├── mdx-components.test.tsx                     # NEW
├── lib/
│   ├── content/
│   │   ├── schema.ts                          # NEW · zod FeatureFrontmatter + DocFrontmatter
│   │   ├── schema.test.ts                     # NEW
│   │   ├── loader.ts                          # NEW · gray-matter read + zod parse; getModeFrontmatter, getDocFrontmatter, getAllDocSlugs; drops drafts in prod
│   │   ├── loader.test.ts                     # NEW · fixture-based
│   │   ├── __fixtures__/                       # NEW · src-anchored .mdx fixtures for cwd-safe loader/registry tests
│   │   ├── features.ts                        # NEW · typed FeatureEntry[] + PINNED slug↔RecordMode map (3 pairs) + FEATURE_BODY import map
│   │   ├── doc-bodies.ts                       # NEW · static DOC_BODY import map (6 docs, keyed by slug.join('-')) — mirrors FEATURE_BODY; no dynamic import
│   │   ├── registry.ts                        # NEW · allFeatures/allDocs/docsBySection/routeList/getBySlug/prevNext + dedupeFaq (unique-question aggregation)
│   │   └── registry.test.ts                   # NEW · covers slug-guard/getAllDocSlugs branch + FAQ dedupe
│   └── seo/
│       ├── json-ld.ts                         # CHANGED · + howToLd, faqPageLd, breadcrumbLd
│       ├── json-ld.test.ts                    # CHANGED · + cases mirroring existing style
│       ├── metadata.ts                        # CHANGED · + optional robots on BuildMetadataInput
│       └── metadata.test.ts                   # CHANGED · robots coverage
└── content/
    └── docs/
        ├── getting-started.mdx                # NEW
        ├── permissions.mdx                    # NEW (spec-named)
        ├── codecs.mdx                         # NEW (spec-named; MP4·H.264(AAC), WebM/VP9 fallback)
        ├── safari.mdx                         # NEW (spec-named)
        ├── browser-support.mdx                # NEW
        └── troubleshooting.mdx                # NEW

apps/web/next.config.ts                         # CHANGED · createMDX wrap + pageExtensions + 2 new OG globs in outputFileTracingIncludes + inline no--turbopack comment
apps/web/package.json                           # CHANGED · new MDX/zod deps
apps/web/tests/e2e/content.spec.ts              # NEW · features + docs smoke (dev server), JSON-LD present, console clean (unknown-slug 404 verified vs prod build, not here)
lighthouserc.json                               # CHANGED · + one /features/<slug> + one /docs/<slug> url (global 0.95 a11y/bp/seo apply)
```

### 4.2 Unit responsibilities

- **`lib/content/schema.ts`** — zod `FeatureFrontmatter` `{ slug, mode (RecordMode), title, deck, eyebrow, order, howToSteps:{name,text}[], faq:{question,answer}[], related:string[] }` and `DocFrontmatter` `{ title, description (≤160), slug:string[], section, order, faq?:{question,answer}[], draft (default false), updated? }`.
- **`lib/content/loader.ts`** — pure functions: `gray-matter` read + zod parse (fail-fast), `getModeFrontmatter` / `getDocFrontmatter` / `getAllDocSlugs`; drops drafts in production. Carries the new surface's coverage; the `getAllDocSlugs`/slug-guard branch is explicitly covered.
- **`lib/content/features.ts`** — typed `FeatureEntry[]` (3 entries) + the **pinned** slug↔`RecordMode` map + the fixed 3-key `_content/*.mdx` body import map.
- **`lib/content/registry.ts`** — `allFeatures` / `allDocs` / `docsBySection` / `routeList` / `getBySlug` / `prevNext` + `dedupeFaq` (unique-question aggregation across all doc `faq[]`). The sole driver for params, metadata, sitemap, nav, and JSON-LD.
- **`mdx-components.tsx`** — root `useMDXComponents()`; the sole brand seam mapping elements → `@record-me/ui` primitives + Twilight token classes, `next/image` (explicit dims), `TransitionLink` for internal links.
- **`_components/content/*`** — presentational RSC (`Prose`, `Toc`, `Breadcrumbs`, `DocsSidebar`); static server-rendered, no scroll-spy/client JS, reserved dimensions for CLS.
- **Route `page.tsx` files** — RSC; own `generateStaticParams` + `dynamicParams=false`, `generateMetadata` via 5A `buildMetadata`, JSON-LD injection via `<JsonLd>`, and body rendering through `Prose` + the root MDX component map.

## 5 · Routes & content detail

### 5.1 `/features/[mode]` (3 fixed modes)

- **Params.** `generateStaticParams()` returns the 3 pinned slugs from the registry; `export const dynamicParams = false` 404s anything else. The body is pulled via a fixed 3-key static import map in `content/features.ts` (no globbing — statically analyzable).
- **Slug↔mode (pinned).** `screen-camera-cursor → screen+cam+cursor`, `screen-cursor → screen+cursor`, `camera-only → cam-only` (engine values verified `packages/recorder/src/types.ts` L4). The URL slug `camera-only` maps to engine `cam-only` — the off-by-one the map exists to prevent.
- **Content.** Editorial deep page per mode: eyebrow + serif headline + deck, the use-case narrative, a "How it works" sequence (sourced from `howToSteps[]`), and cross-links to `/record` + related `/docs`. Codec copy is **MP4 · H.264 (AAC), WebM/VP9 fallback** — never VP9-first.
- **JSON-LD.** `howToLd({ name, description?, step:{name,text}[] })` → `HowTo` + `HowToStep` (per spec § 8.4) and `breadcrumbLd(items[])` → `BreadcrumbList` (additive), both from validated frontmatter, injected via `<JsonLd>`.
- **Title.** Bare § 8.2 segment via `buildMetadata` ("Mode A — Screen, Camera & Cursor", etc.); the root `template '%s — record me'` appends the brand → a double em-dash, reviewed for readability at authoring (shorten the segment, not the template, if it reads poorly).
- **OG.** Per-mode `opengraph-image.tsx` reusing `_og/template.tsx`'s `ogImage({ title, caption })` (Node runtime, fonts via `fs`+`process.cwd`).

### 5.2 `/docs` index + `/docs/[...slug]`

- **Index (`/docs/page.tsx`).** Section-grouped list of all docs (from `docsBySection`), plus a visible FAQ block whose Q&A exactly mirrors `faqPageLd`'s deduped set, and the `FAQPage` JSON-LD (per spec § 8.4) + a `BreadcrumbList`. Static docs OG card.
- **Catch-all (`/docs/[...slug]/page.tsx`).** `generateStaticParams()` from the registry + `dynamicParams=false`; the body is rendered from the static **`DOC_BODY`** import map (`doc-bodies.ts`), the slug first validated against `getAllDocSlugs()` (`notFound()` on miss — the security-relevant branch) and a `DOC_BODY` parity guard (`notFound()` if on disk but absent from the map). **No dynamic `import()`** of param-shaped input. `generateMetadata` via `buildMetadata`; a static `Toc` aside (from `rehype-slug` heading ids); `breadcrumbLd`; prev/next from `registry.prevNext`.
- **Docs set (6 pages, 4 sections).** getting-started · permissions, codecs (recording) · safari, browser-support (browser-support) · troubleshooting. `codecs.mdx` carries the codec contract verbatim: MP4 · H.264 (AAC), WebM/VP9 fallback.
- **URLs.** Flat single-segment in v1 (`/docs/permissions`), mapped to flat files via `slug.join('-')`. The `[...slug]` segment can capture a nested URL (`/docs/recording/codecs`), but the flat-file loader would map it to `recording-codecs.mdx`, not a nested dir — so nested **files** are a low-effort-but-not-zero-rework future change (slug→file convention change; collision risk against a flat `recording-codecs`). Deferred.

### 5.3 Content model + MDX mapping

- **Frontmatter is the only metadata source.** `gray-matter` reads YAML; zod validates + types it; MDX bodies never export `metadata`/`frontmatter` consts (review rule). Build fails fast on malformed/incomplete frontmatter (HowTo steps, FAQ pairs, `description ≤ 160`).
- **One brand seam.** The root `mdx-components.tsx` maps every element through `@record-me/ui` primitives + Twilight token classes — token-only, no raw hex. Internal links render through `TransitionLink`; images through `next/image` with explicit dims (CLS-safe).
- **Prose wrapper.** A new token-based `Prose` (Instrument Serif headings / Geist body / Geist Mono code) wraps the MDX body. The code-block **wrapper** is styled with Twilight tokens; per-token foreground stays Shiki-inline (the documented boundary).
- **Static IA chrome.** On-page TOC (`Toc`) and the docs `DocsSidebar` are static server-rendered (rehype-slug anchors, sticky aside) — no scroll-spy client JS in v1.

### 5.4 The `/`↔`/features` View-Transition (5B-deferred, lands here)

Add a "Learn more →" `TransitionLink` to each `ModeTriptych` card
(`apps/web/src/app/_components/landing/ModeTriptych.tsx`) → `/features/<slug>`,
reusing the existing `TransitionLink` + `::view-transition` CSS already in
`globals.css` — no new motion infrastructure, plain `<a>` fallback preserved,
reduced-motion instant. This is the wiring task the 5B spec § 3.2 / § 6 deferred
to 5C ("infra lands here; the feature route doesn't exist yet").

## 6 · SEO & performance

- **Metadata.** Every new route exports `generateMetadata()` calling 5A `buildMetadata({ title, description, path })` with the **bare** § 8.2 title segment (no pre-suffixing; the root `title.template` appends the brand). `buildMetadata` gains one additive optional `robots` field on `BuildMetadataInput` (5C routes are all indexed → unset; the field completes the helper, covered by `metadata.test.ts`). No silent inheritance.
- **JSON-LD (extend 5A, frontmatter-sourced).** `lib/seo/json-ld.ts` gains three pure builders on the existing `Ld` type, injected via the existing `<JsonLd>`:
  - `howToLd()` → `HowTo` + `HowToStep` on each `/features/[mode]` (spec § 8.4).
  - `faqPageLd()` → `FAQPage` + `Question`/`acceptedAnswer` on `/docs`, from the registry's **deduped** doc `faq[]` (spec § 8.4); matches the visible on-page Q&A.
  - `breadcrumbLd()` → `BreadcrumbList` on every deep page — **additive beyond § 8.4**, each crumb a resolvable absolute URL (built from `siteConfig`) or Google ignores the markup.
- **OG.** Per-mode + per-doc + static docs-index `opengraph-image.tsx` reusing `_og/template.tsx`'s `ogImage()` (the github/Twilight hex stays in `template.tsx`, the documented next/og boundary). **Mandatory:** both new route globs registered in `next.config.ts` `outputFileTracingIncludes` (keys `/features/[mode]/opengraph-image`, `/docs/[...slug]/opengraph-image` → `['src/app/_og/fonts/**']`), with the keys verified against the `.next` build manifest on a preview deploy — a mismatched key silently no-ops and reproduces the 5A tofu failure (faa8d01).
- **Sitemap.** `sitemap.ts` ROUTES driven by `registry.routeList`: +3 `/features/*` (0.8), +`/docs` (0.6), +each `/docs/[...slug]` (0.6), `changeFrequency:'monthly'`. Single registry feeds both sitemap and `generateStaticParams` so they can't diverge. `robots.ts` unchanged (its test stays green).
- **CWV / Lighthouse ≥ 90.** All pages prerendered to static HTML (build-time MDX, no client highlighter, no eval). LCP = server-rendered serif headline (not gated by JS). CLS ≤ 0.05 via reserved code/TOC/img dimensions + `next/image` explicit dims + static (no scroll-spy) TOC. The lhci assertions are **global**: the new routes (one `/features/<slug>` + one `/docs/<slug>` added to `lighthouserc.json` `url`) must clear **0.95 accessibility / 0.95 best-practices / 0.95 SEO** in addition to 0.90 performance, CLS ≤ 0.05, LCP ≤ 1800 ms — the AA-contrast code-block wrapper, reserved dimensions, and per-route `generateMetadata` all feed those gates, not just performance.

## 7 · Dependencies & impact

### 7.1 New dependencies

| Package                    | Kind       | Why                                                                                                                                                                                                                                                                           |
| -------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@next/mdx`                | dev        | First-party MDX loader; compiles `.mdx` → RSC at build time (no runtime eval → strict-CSP-safe; static HTML → Lighthouse ≥ 90).                                                                                                                                               |
| `@types/mdx`               | dev        | Types for `.mdx` module imports under `typedRoutes`/strict TS.                                                                                                                                                                                                                |
| `gray-matter`              | dev        | Parse YAML frontmatter at build, feeding the zod schema (single metadata source, separate from the MDX body).                                                                                                                                                                 |
| `zod`                      | dependency | Validate + type frontmatter (confirmed **not** yet in the lockfile). Fail-fast build on malformed HowTo/FAQ frontmatter; powers the typed registry.                                                                                                                           |
| `rehype-pretty-code`       | dev        | Build-time Shiki highlighting. **Single dark theme** (`github-dark-default`) → per-token **resolved inline** `style="color:#…"` (CSP-safe: `style-src` already allows `'unsafe-inline'`; no eval, no client highlighter). Dark-only app → no dual-theme, no `--shiki-*` vars. |
| `shiki`                    | dev        | Highlighter engine behind `rehype-pretty-code`; build-only, ships zero client JS.                                                                                                                                                                                             |
| `remark-gfm`               | dev        | GFM tables / strikethrough / task lists in docs content.                                                                                                                                                                                                                      |
| `rehype-slug`              | dev        | Stable heading ids for the static TOC + anchor links.                                                                                                                                                                                                                         |
| `rehype-autolink-headings` | dev        | Wrap headings as anchor targets (`behavior:'wrap'`) for the TOC.                                                                                                                                                                                                              |

### 7.2 Touched / new (existing files)

- **`next.config.ts`** — `createMDX` wrap + `pageExtensions` + 2 new OG globs in `outputFileTracingIncludes` + inline no-`--turbopack` comment. `outputFileTracingRoot`, the existing includes, and `headers()` untouched (no CSP change).
- **`package.json`** — the 9 deps above. (No `@mdx-js/react`: the App Router applies the component map through the root `mdx-components.tsx` file convention at compile time — there is no `MDXProvider` in the App Router path, so the package would be dead weight.)
- **`lib/seo/json-ld.ts`** (+3 builders) + `json-ld.test.ts`; **`lib/seo/metadata.ts`** (+ optional `robots`) + `metadata.test.ts`.
- **`app/sitemap.ts`** (registry-driven) + `sitemap.test.ts`.
- **`app/globals.css`** (code-block WRAPPER Twilight token mapping; single dark Shiki theme → per-token resolved-inline color, no `--shiki-*` var selector).
- **`app/_components/landing/ModeTriptych.tsx`** (+ "Learn more →" `TransitionLink`) + its test.
- **`lighthouserc.json`** (+1 features + 1 docs URL).
- **New:** `lib/content/*`, `mdx-components.tsx`, `_components/content/*`, `app/features/*`, `app/docs/*`, `content/docs/*`, `tests/e2e/content.spec.ts`.

## 8 · Testing

- **Unit (Vitest + jsdom):** `schema.ts` (zod accept/reject of valid/invalid frontmatter; `description ≤ 160`; HowTo/FAQ shapes); `loader.ts` (fixture-based read + parse, drafts dropped in prod, **explicit** `getAllDocSlugs`/slug-guard coverage); `registry.ts` (`routeList`, `docsBySection`, `prevNext`, and the **`dedupeFaq`** unique-question aggregation). Fixtures under src-anchored `lib/content/__fixtures__/`.
- **JSON-LD builders:** `howToLd`/`faqPageLd`/`breadcrumbLd` produce valid `@type`s, frontmatter-sourced steps/questions, deduped FAQ, and **absolute** crumb URLs — mirroring `json-ld.test.ts` style.
- **Metadata:** `buildMetadata` `robots` field coverage in `metadata.test.ts`; per-route titles are bare segments (template appends brand).
- **Component (Testing Library):** `mdx-components` element map (headings/links/code render through the brand seam, internal links via `TransitionLink`, images via `next/image` with dims); `Prose`/`Toc`/`Breadcrumbs`/`DocsSidebar` smoke + a11y; `ModeTriptych` renders the "Learn more →" link to the correct `/features/<slug>`.
- **E2E (Playwright) — `tests/e2e/content.spec.ts`:** features + docs load 200; unique titles + canonicals; `HowTo` present on a feature page; `FAQPage` present on `/docs`; console zero errors. The `dynamicParams=false` → 404 on an unknown `/features/*` + `/docs/*` slug is verified against the **production** build (`next build && next start`), **not** this dev-server suite — `pnpm dev` compiles dynamic segments on demand and won't reliably hard-404 unknown params.
- **Visual (Playwright MCP):** a `/features/<slug>` and a `/docs/<slug>` at 1440×900 + mobile 390 — on-brand (Twilight, Instrument Serif/Geist), a rendered code block carries Shiki-emitted **resolved inline** per-token `style="color:#…"` at **AA contrast** against the Twilight wrapper (`--color-surface`), console clean, OG cards render. Acceptance must **not** assert the presence of `--shiki-light`/`--shiki-dark` vars or a multi-value `data-theme` — those are dual-theme artifacts, absent under the single `github-dark-default` theme. Verify instead (a) production CSP needs no `'unsafe-eval'` and none is present, (b) no client highlighter JS chunk ships.
- **Lighthouse (`lhci`):** the added `/features/<slug>` + `/docs/<slug>` URLs clear the **global** budget — 0.90 performance, 0.95 accessibility, 0.95 best-practices, 0.95 SEO, CLS ≤ 0.05, LCP ≤ 1800 ms.
- **OG tracing:** verify the `outputFileTracingIncludes` keys against the `.next` build manifest on a preview deploy (mismatched key silently no-ops → tofu).

## 9 · Definition of done (10/10)

- Build, typecheck, lint, unit/component, e2e all green; `pnpm format:check` clean (prettier blocks CI — format all new `.mdx`/`.ts`/`.tsx` before pushing).
- `next build` emits **static HTML** for every `/features/[mode]` + `/docs/[...slug]`; production CSP/header output byte-identical to today (no new eval, no header change).
- No client highlighter JS ships; Shiki runs build-only; a rendered code block has Shiki's **resolved inline** per-token `style="color:#…"` (single dark theme — no `--shiki-*` vars, no multi-value `data-theme`) at AA contrast against the Twilight wrapper.
- `lhci` ≥ 90 performance **and** ≥ 0.95 a11y/bp/seo, CLS ≤ 0.05, LCP ≤ 1800 ms on the new `/features/<slug>` + `/docs/<slug>` URLs.
- Copy accurate to the engine: MP4 · H.264 (AAC), WebM/VP9 fallback (never VP9-first); Free · MIT; client-side, no upload, no accounts.
- `HowTo` JSON-LD on each `/features/[mode]`; `FAQPage` JSON-LD on `/docs` (deduped, matching visible Q&A); `BreadcrumbList` (absolute URLs) on every deep page.
- Per-mode + per-doc + docs-index OG render 200 at 1200×630 on a preview deploy (tracing-include keys verified against the build manifest — no tofu).
- `/`↔`/features` View-Transition wired (Learn more → `TransitionLink`); crossfade where supported, clean navigation otherwise, reduced-motion instant, plain `<a>` fallback preserved, console clean.
- Sitemap carries the 3 features (0.8) + docs index (0.6) + each doc (0.6), registry-driven; `robots.ts` test still green.
- Visual verification via Playwright MCP; console clean; CLS < 0.05.
- Docs updated (FRONTEND route table + component inventory, SEO, ARCHITECTURE if data flow changed, PROGRESS Slice 5C, CODEBASE_MAP) and the MDX pipeline + content-authoring workflow recorded.
- GH task issues closed; epic #5 reflects 5C complete.

## 10 · Open risks

- **OG font tofu on Vercel.** The new `features/[mode]` + `docs/[...slug]` `opengraph-image` routes read `.ttf` via computed `process.cwd` paths invisible to `@vercel/nft`. **Must** add both globs to `outputFileTracingIncludes` **and** verify the keys exactly match Next's traced route ids against the `.next` build manifest on a preview deploy — a mismatched key silently no-ops and reproduces the 5A tofu failure (faa8d01).
- **Turbopack dev caveat.** `@next/mdx` can't pass function-form remark/rehype plugins to Turbopack and `rehype-pretty-code` options aren't fully serializable. Low impact now (dev + Vercel build are both webpack) but adding `--turbopack` to dev would silently break highlighting. Mitigated by an **inline comment** beside `createMDX` in `next.config.ts`, not just plan prose.
- **Highlighting output is inline-style, not classed (single dark theme).** `rehype-pretty-code` with `theme: 'github-dark-default'` emits a per-token **resolved inline** `style="color:#…"` (no `--shiki-*` vars, no multi-value `data-theme`, no variant selector). CSP-safe **only** because production `style-src` allows `'unsafe-inline'` (verified `next.config.ts` L49). Risk if an implementer/gatekeeper (a) reverts to dual-theme `{ dark, light }` — which on this dark-only app would render the **light** token colors light-on-dark, the inverse of intent; (b) writes a `[data-theme='dark']` / `--shiki-*` selector that never matches (dead CSS); (c) forces classed output; (d) removes `'unsafe-inline'` and breaks all token coloring; or (e) flags the legitimate Shiki inline github-dark hexes as a raw-hex/CSP violation. Mitigated: the single-theme decision + Task-4 acceptance state the resolved-inline reality, document the hex as a build-time boundary (like next/og), and scope `globals.css` to the wrapper only.
- **Code-block AA contrast.** `github-dark-default` token foregrounds against a Twilight-token wrapper (`keepBackground:false`) may be marginal, and the lhci assertions are global (0.95 a11y). Single dark theme already renders the dark-tuned token colors on the dark surface (the correct path); if still marginal, tune the wrapper background or swap to another Twilight-tuned dark Shiki theme, re-evaluated against Lighthouse a11y.
- **Dual-read drift.** `gray-matter` reads frontmatter while `@next/mdx` compiles the body. Mitigation — zod-validated frontmatter is the only metadata source; MDX bodies never export `metadata`/`frontmatter` consts (review rule).
- **Catch-all body safety.** The `[...slug]` body is read from a static `DOC_BODY` map (`doc-bodies.ts`) — **no dynamic `import()`** of params, which is both a webpack dynamic-context footgun (an aliased `@/…` template can fail to generate the context → build error / runtime `MODULE_NOT_FOUND`) and a code-injection seam. It sits behind `dynamicParams=false` + an allow-list check against `getAllDocSlugs()` + a `DOC_BODY` parity guard, so unknown slugs `notFound()` and the fs slug-list can't drift from the static map (a parity test asserts every `getAllDocSlugs()` entry has a `DOC_BODY` body). The unknown-slug **404 is enforced by the production prerender** (`dynamicParams=false`) and verified against `next build && next start`, not the dev server. The guard branch is unit-tested.
- **CLS on code blocks / TOC / images.** Large prerendered code blocks, the TOC aside, and MDX images can shift layout. Reserve min-height/aspect-ratio in the pre/code/img maps, keep TOC static (no scroll-spy), use `next/image` explicit dims — hold CLS < 0.05 (lhci asserts ≤ 0.05).
- **Slug↔RecordMode mismatch.** URL slugs differ from engine `RecordMode` values (verified `types.ts` L4). The pinned map in `content/features.ts` is fixed to the three exact pairs; a wrong map (esp. `camera-only → cam-only`) breaks HowTo/feature↔engine alignment.
- **FAQPage validity.** The `/docs` `FAQPage` JSON-LD must match visible on-page Q&A and contain no duplicate questions. Mitigated by the explicit `dedupeFaq` step in `registry.ts`.
- **Test fixtures + cwd reads.** `loader`/`registry` do `process.cwd`-relative reads; vitest/jsdom cwd differs from the real content dir. Fixtures live under src-anchored `lib/content/__fixtures__/` with a base-path-anchored read.
- **CI prettier (`format:check`)** blocks merge and the pre-commit hook doesn't fully match it — all new `.mdx` and `.ts`/`.tsx` must be prettier-formatted before pushing (bit a prior plan per memory). Run `pnpm format:check` in the gate task.
- **Breadcrumb JSON-LD scope.** `BreadcrumbList` is **not** in spec § 8.4; it is an intentional additive enhancement, flagged so gatekeeper/scribe don't treat it as scope creep; each crumb carries an absolute URL or Google ignores the markup.
- **Lighthouse CI false-green.** `lighthouserc.json` currently audits only `/`, `/record`, `/privacy`, `/changelog`. Without adding a `/features` + a `/docs` URL the ≥ 90 requirement on the new routes is unenforced.
  </content>
  </invoke>
