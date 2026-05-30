# record-me — Phase 5B · Editorial landing (`/`) — design spec

Status: **approved** (brainstormed 2026-05-30; all downstream decisions delegated to and made by the implementer, recorded here)
Source of truth: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 8.7, § 9
Visual baseline: `.superpowers/brainstorm/48274-1779894063/content/preview-hifi-pairing-a.html`
Epic: #5 (Phase 5 · Marketing surface)

---

## 1 · Summary

Phase 5B ships the **editorial landing page** at `/` — the showpiece that replaces
the Phase-2 placeholder. It builds the approved hi-fi baseline as real React,
**elevated** with the `motion` library, four signature motion moments, custom
illustration components, View-Transitions infrastructure, and full
`prefers-reduced-motion` support — all on the 5A SEO foundation, holding
Lighthouse ≥ 95.

This is **slice 5B** of Phase 5. 5A (foundation) shipped; 5C (MDX
`/features` + `/docs`) is separate. 5B completes the `/`-specific SEO that 5A
deferred (`SoftwareApplication` + `WebApplication` JSON-LD, `/` OG image).

## 2 · Decisions (self-decided, recorded)

| #                  | Decision                                                                   | Choice                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Structure          | Ship the hi-fi baseline structure, elevated (not trimmed/rethought)        | nav · hero · §01 modes · §02 studio + field-notes · caption strip · footer                                                    |
| Animation lib      | `motion` (Framer Motion successor, small bundle) + CSS scroll-driven       | install `motion`; CSS `animation-timeline: view()` where supported, `motion` `useScroll`/`whileInView` fallback               |
| Reduced motion     | Full support — entrances become instant, ticker + boot freeze              | gated on `prefers-reduced-motion: reduce`                                                                                     |
| Illustrations      | Bespoke React illustration components (no stock icon packs above the fold) | the 3 mode "stages" + the studio "surface" as crafted SVG/CSS components in `components/illustrations/`                       |
| Copy accuracy      | Correct the baseline's claims against the engine                           | **MP4-first** (H.264/AAC, WebM fallback) — not "VP9"; MIT/open-source claim kept (LICENSE verified); no fake "40-second demo" |
| Outbound links     | Deep links to `/features`/`/docs` ship in 5C                               | 5B links only to existing routes (`/record`, `/privacy`, `/changelog`); `/`↔`/features` View-Transition wired in 5C           |
| `/` SEO completion | Add the deferred `/` structured data + OG                                  | `softwareApplicationLd()` + `webApplicationLd()` builders (extend 5A `lib/seo/json-ld.ts`) + `/` `opengraph-image`            |
| README             | Recapture hero from the real `/`                                           | recapture `.github/assets/readme/hero.png` from `/`, drop the "Preview · ships in Phase 5" prefix, re-link to `page.tsx`      |

## 3 · Goals & non-goals

### 3.1 Goals

- A 10/10 editorial `/` faithful to the baseline, elevated with motion + illustrations.
- Four signature moments (§ 5.3), all transform/opacity-only, all reduced-motion-aware.
- LCP element (hero headline) renders in RSC without waiting on JS.
- Lighthouse ≥ 95 on `/` (CI `lhci` already covers `/`).
- Motion bundle < 50 KB gzipped.

### 3.2 Non-goals (deferred)

- `/features/[mode]`, `/docs`, MDX pipeline, `HowTo`/`FAQ` JSON-LD → **5C**.
- `/`↔`/features` View-Transition crossfade → **5C** (infra lands here; the feature route doesn't exist yet).
- Analytics event wiring on landing CTAs → **Phase 6** (the `analytics.ts` taxonomy exists; landing-specific events are Phase 6 polish).
- Custom domain / canonical host → **Phase 6** (5A's env-driven base resolves it).

## 4 · Architecture

The `/` route is an **RSC** for fast LCP + SEO; motion opts in at `'use client'`
leaf components. Landing-specific sections live page-local under
`apps/web/src/app/_components/landing/`; reusable illustration primitives live in
`apps/web/src/components/illustrations/`. Existing `@record-me/ui` primitives
(`WordMark`, `Button`, `MetaChip`, `RecDot`, `ModeCard`) are reused.

```
apps/web/src/
├── app/
│   ├── page.tsx                      # / — RSC: metadata + JSON-LD + composes sections (static hero copy = LCP)
│   ├── opengraph-image.tsx           # (5A default) — 5B adds a /-specific variant if distinct
│   └── _components/landing/
│       ├── LandingNav.tsx            # RSC — masthead (WordMark + edition + anchor links)
│       ├── Hero.tsx                  # RSC shell (headline = LCP) wrapping <HeroReveal> client motion
│       ├── HeroReveal.tsx            # 'use client' — stagger reveal (moment 1), reduced-motion aware
│       ├── ModesSection.tsx          # RSC — section head + <ModeTriptych>
│       ├── ModeTriptych.tsx          # 'use client' — 3 cards, lift-on-enter (moment 2)
│       ├── StudioSection.tsx         # RSC — section head + <StudioSurface> + field notes
│       ├── StudioSurface.tsx         # 'use client' — boot-up + timer tick (moment 3)
│       ├── FieldNotesTicker.tsx      # 'use client' — marquee (moment 4)
│       └── LandingFooter.tsx         # RSC — colophon
├── components/illustrations/
│   ├── ModeStageA.tsx                # screen + camera + cursor preview (bespoke SVG/CSS)
│   ├── ModeStageB.tsx                # screen + cursor preview
│   ├── ModeStageC.tsx                # camera-only preview
│   └── StudioSurfaceArt.tsx          # the recording-surface illustration (window, cursor ring, PiP)
├── lib/
│   └── motion/
│       ├── useReducedMotion.ts       # wrapper (re-export motion's + SSR-safe default)
│       └── variants.ts               # shared motion variants (stagger, lift, fade)
└── lib/seo/json-ld.ts                # + softwareApplicationLd(), webApplicationLd()
```

### 4.1 Unit responsibilities

- **`page.tsx`** — RSC. Exports `metadata` via `buildMetadata({ path: '/' })`; injects `SoftwareApplication` + `WebApplication` JSON-LD via `<JsonLd>`; composes the section components. Hero headline text is rendered server-side (LCP, no JS dependency).
- **Each `*Section.tsx`** — RSC wrappers owning static copy + structure; delegate animation to a single client leaf.
- **Client leaves** (`HeroReveal`, `ModeTriptych`, `StudioSurface`, `FieldNotesTicker`) — own exactly one signature moment; accept their content as children/props so the RSC supplies the markup and the leaf only animates it.
- **Illustration components** — pure presentational SVG/CSS, no client JS unless they animate (the mode stages have idle ambient animation via CSS; the studio surface's tick is driven by `StudioSurface`).

## 5 · Sections & motion

### 5.1 Nav (RSC)

Masthead: `<WordMark>` center, mono "Edition 01 · Twilight" left, anchor links (Modes · Studio · Field Notes) right. Sticky optional (no — keep simple, non-sticky for v1).

### 5.2 Hero (RSC shell + `HeroReveal` client)

- Eyebrow (mono rule + "A recording instrument · v1"), serif headline ("Press _record._ Get a beautifully cut clip."), deck, CTA row, mono meta line, right-column pull-quote.
- **CTAs:** primary `Start recording` → `/record` (`<Button asChild><Link>`); secondary `See the three modes ↓` → in-page anchor to `#modes` (no fake demo).
- **Meta line:** `Web · No install` / `Client-side` / `MP4 · H.264` / `Free · MIT`.
- Background: film-grain SVG data-uri overlay + amber radial glow (CSS, no network).

### 5.3 The four signature moments

1. **Hero stagger** (`HeroReveal`, on first paint): eyebrow → headline lines → deck → CTAs fade/translate-up in sequence (~60ms stagger). LCP headline is visible pre-JS; the reveal enhances, never gates it (start state is `opacity:1` server-side, JS adds the entrance only when motion is allowed).
2. **Mode cards lift** (`ModeTriptych`, on scroll-enter): cards translateY(12px→0) + opacity + border warms to `--ivory-low`, staggered, via `whileInView` / `animation-timeline: view()`.
3. **Studio boots** (`StudioSurface`, on scroll-enter): REC dot begins its halo pulse and the timer starts ticking (mm:ss:ff) only once the surface enters the viewport.
4. **Field-notes ticker** (`FieldNotesTicker`): the caption strip gently marquees horizontally; pauses on hover; frozen under reduced-motion.

### 5.4 Reduced motion

`prefers-reduced-motion: reduce` ⇒ all entrances render at final state instantly (no transform), the ticker is static, the studio timer shows a fixed value (no tick). Implemented via a shared `useReducedMotion()` + CSS media query for the pure-CSS animations.

### 5.5 Studio section + field notes (RSC + `StudioSurface` client)

Section head (§ 02) + the `StudioSurfaceArt` illustration (REC topbar, demo window, cursor ring, PiP, controls) + two editorial "field notes" (click highlights; render specs — specs corrected to **MP4 · H.264 / AAC**, 1080p, 30/60fps, download-to-disk).

### 5.6 Footer (RSC)

Serif colophon (accurate: "Composed in Manila", drop unverified locales) + mono credit; links to `/privacy`, `/changelog`.

## 6 · SEO & performance

- **Metadata:** `buildMetadata({ title, description, path: '/' })` (5A helper). `/` keeps the highest sitemap priority (already 1.0 in 5A's sitemap).
- **JSON-LD:** add `softwareApplicationLd()` (name, applicationCategory `MultimediaApplication`, operatingSystem `Web`, offers `price: 0`) + `webApplicationLd()` to `lib/seo/json-ld.ts`; inject both on `/`.
- **OG:** reuse the 5A `_og/template`; a `/`-specific `opengraph-image.tsx` with the hero headline (the 5A default OG already covers `/` via metadataBase — 5B overrides with a landing-specific card).
- **CWV:** LCP = hero headline (server-rendered, `next/font` preloaded); INP guarded (motion = transform/opacity only, no layout thrash); CLS < 0.05 (reserve space for the studio surface + illustrations with explicit aspect-ratios). Motion bundle < 50 KB gzipped (tree-shaken `motion` imports; prefer CSS scroll-driven where supported).
- **View Transitions:** enable Next's experimental `viewTransition` (or a small progressive-enhancement wrapper) + a crossfade CSS; apply to outbound links that exist (`/record`, `/privacy`). Browsers without support navigate normally. `/`↔`/features` wires in 5C.

## 7 · Dependencies & impact

- **New dep:** `motion` (only). No icon packs above the fold (Lucide allowed for chrome if needed, below the fold).
- **Touched:** `app/page.tsx` (replaces the Phase-2 placeholder), `lib/seo/json-ld.ts` (+2 builders), `next.config.ts` (viewTransition experimental, if used), `README.md` (hero recapture + drop preview prefix), `app/opengraph-image.tsx` (landing variant).
- **New:** `_components/landing/*`, `components/illustrations/*`, `lib/motion/*`, `/` `opengraph-image` variant.

## 8 · Testing

- **Unit/component (Testing Library + jsdom):** hero renders the headline text + both CTAs with correct hrefs; mode triptych renders all three modes; field-notes renders all claims; `useReducedMotion` returns the SSR-safe default; JSON-LD builders produce valid `@type`s.
- **Reduced-motion:** a test asserts entrance components render final-state content when `prefers-reduced-motion` is mocked (no reliance on animation completion).
- **E2E (Playwright):** `/` loads 200; hero headline visible (LCP); `Start recording` navigates to `/record`; `#modes` anchor scroll; all sections present; JSON-LD `SoftwareApplication` present; console clean; `prefers-reduced-motion` run shows static state.
- **Visual (Playwright MCP):** full-page screenshot at 1440×900 + mobile 390; on-brand (Twilight, Instrument Serif, film grain), console clean, OG card renders.
- **Lighthouse (`lhci`):** `/` ≥ 95 across perf/a11y/bp/seo.

## 9 · Definition of done (10/10)

- Build, typecheck, lint, unit/component, e2e all green.
- `lhci` ≥ 95 on `/`.
- Motion bundle < 50 KB gzipped (verify via build output / bundle analysis).
- `prefers-reduced-motion` fully honored (verified in browser).
- Copy accurate to the engine (MP4-first; MIT; no fake demo).
- `/` JSON-LD (SoftwareApplication + WebApplication) + OG verified.
- Visual verification via Playwright MCP; console clean; CLS < 0.05.
- README hero recaptured from `/`; preview prefix dropped.
- Docs updated (FRONTEND route table + component inventory, DESIGN if tokens/components added, SEO, PROGRESS Slice 5B, CODEBASE_MAP).
- GH task issues closed; epic #5 reflects 5B complete (5C still planned).

## 10 · Open risks

- **Motion bundle vs Lighthouse:** keep `motion` imports tree-shaken (import specific APIs, not the whole lib); prefer CSS `animation-timeline: view()` for scroll-driven where supported to minimize JS. Verify the <50 KB budget in the build.
- **LCP not gated by JS:** the hero must paint server-side; the stagger is a pure enhancement. Test by throttling/with-JS-disabled that the headline is present.
- **View Transitions experimental API churn:** keep it progressive-enhancement and isolated so a Next API change can't break navigation.
- **CLS from late-loading illustrations:** reserve explicit `aspect-ratio` for every stage/surface so nothing shifts on enter.
