# Frontend

Authoritative reference for `apps/web` and `packages/ui`. Source of truth:
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 6, § 8.

## Route tree (target)

```
apps/web/src/app/
├── layout.tsx                  # root · <Analytics/> · <SpeedInsights/> · next/font
├── page.tsx                    # /
├── opengraph-image.tsx         # default OG
├── sitemap.ts · robots.ts · manifest.ts
│
├── record/
│   ├── page.tsx                # /record (the studio)
│   ├── layout.tsx              # minimal chrome
│   └── opengraph-image.tsx
│
├── features/                  # Phase 5C
│   ├── layout.tsx
│   └── [mode]/                 # /features/screen-camera-cursor | /screen-cursor | /camera-only
│       ├── page.tsx            # RSC · generateStaticParams (3) + dynamicParams=false
│       ├── opengraph-image.tsx # per-mode OG card
│       └── _content/*.mdx      # 3 colocated MDX bodies (frontmatter-validated)
│
├── docs/                       # Phase 5C
│   ├── layout.tsx · page.tsx   # index (FAQPage JSON-LD)
│   ├── opengraph-image.tsx     # SINGLE shared docs OG (no per-doc OG — see SEO.md)
│   └── [...slug]/page.tsx      # catch-all · 6 static docs from registry
├── privacy/page.tsx
├── changelog/page.tsx
│
├── mdx-components.tsx          # Phase 5C · root MDX component map (brand seam)
└── api/og/route.ts             # v1.x optional
```

> Phase 5C doc MDX bodies live at `src/content/docs/*.mdx` (NOT under `app/`);
> they render via the static `DOC_BODY` import map in `lib/content/doc-bodies.ts`,
> keyed by `slug.join('-')`. Feature bodies are the 3 fixed
> `app/features/[mode]/_content/*.mdx`, wired via `FEATURE_BODY` in
> `lib/content/features.ts`.

## Per-route inventory

| Route                   | Type | Owner       | Status                                                                                                                                                           |
| ----------------------- | ---- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                     | RSC  | sr-frontend | Phase 5B · shipped. Editorial landing with motion, signature moments, View-Transitions wrapper.                                                                  |
| `/dev/primitives`       | RSC  | sr-frontend | Dev-only showcase for brand primitives. 404 in production via `/dev/layout.tsx`.                                                                                 |
| `/dev/previews/landing` | RSC  | sr-frontend | Phase 5 landing hero mockup (dev-only)                                                                                                                           |
| `/dev/previews/modes`   | RSC  | sr-frontend | Three-ModeCard composition (dev-only)                                                                                                                            |
| `/dev/previews/studio`  | RSC  | sr-frontend | Phase 4 studio mockup (dev-only)                                                                                                                                 |
| `/record`               | ○    | sr-frontend | Phase 4 · shipped. Renders static RSC shell; `<Studio>` hydrates client-side (capability probe + recorder are client-only).                                      |
| `/features/[mode]`      | ●    | sr-frontend | Phase 5C · shipped. 3 static MDX deep pages (`generateStaticParams` + `dynamicParams=false`). `<Prose>` body + HowTo/Breadcrumb JSON-LD + per-mode OG.           |
| `/docs`                 | ○    | sr-frontend | Phase 5C · shipped. Section-grouped index + visible FAQ mirroring `FAQPage` JSON-LD + Breadcrumb. Single `/docs/opengraph-image` card.                           |
| `/docs/[...slug]`       | ●    | sr-frontend | Phase 5C · shipped. 6 static MDX docs (`generateStaticParams` from registry + `dynamicParams=false`). Static `<Toc>` + `<DocsSidebar>` + Breadcrumb + prev/next. |
| `/privacy`              | RSC  | sr-frontend | Phase 5A · shipped. Editorial page from 6-point privacy contract.                                                                                                |
| `/changelog`            | RSC  | sr-frontend | Phase 5A · shipped. Typed changelog.ts + seed v1.0.0 entry.                                                                                                      |

Update this table after every phase.

## Hooks (Phase 4)

- `useRecorder()` — thin React wrapper around `createRecorder()` from
  `@record-me/recorder`. Returns `{ state, durationMs, bytes, previewStream, result, error, start, pause, resume, stop, reset }`.
  Lifecycle: `reset()` disposes the handle + releases the result (privacy —
  camera/mic off); `start()` disposes any prior handle and releases the prior
  result's object URL; unmount releases the latest result's object URL.

## Component inventory

### @record-me/ui primitives

| Component       | Description                                         |
| --------------- | --------------------------------------------------- |
| `<WordMark>`    | Brand wordmark — italic amber "me"                  |
| `<RecDot>`      | Pulsing amber recording indicator with halo         |
| `<MetaChip>`    | Mono uppercase metadata pill                        |
| `<ModeCard>`    | Triptych card with eyebrow, serif title, stage slot |
| `<StudioShell>` | Framed shell for the live recording surface         |
| `<Button>`      | shadcn-style Button with Twilight CVA variants      |
| `cn()`          | clsx + tailwind-merge helper                        |

### Studio components (Phase 4 · `/record`)

**Orchestrator**

- `<Studio>` (`_components/Studio.tsx`) — 'use client' root. Manages state machine (setup → live → review), permission probing, error handling. Renders `<StudioShell>` + phase-specific UI.

**Setup phase (mode + cap selection)**

- `<ModePicker>` — Triptych radio picker (A/B/C modes, available-mode gating).
- `<CapSelector>` — Cap minutes selector (10–60 min), resolution (1080p/720p), cursor highlight toggle. Warns on >10 min.

**Live phase (recording)**

- `<LivePreview>` — `<video srcObject>` mirror bound to `onPreviewReady` stream (composite video-only).

**Review phase (playback + download)**

- `<ReviewPane>` — `<video controls>` for playback with result URL.

**Error + unsupported**

- `<ErrorState>` — Editorial error cards per kind (permission-denied device-specific, track-failed interrupted, etc.). "Try again" callback.
- `<UnsupportedState>` — Browser-unsupported gate (no MediaRecorder, no getDisplayMedia, etc.).

**Utilities**

- `derivePhase()` + `StudioPhase` type (`_components/studio-phase.ts`) — Pure phase state machine derivation.

### Landing components (Phase 5B · `/`)

- `<LandingNav>` — Masthead with wordmark + studio link (RSC)
- `<Hero>` — Headline + tagline + CTA (moment 1)
- `<HeroReveal>` — Client leaf wrapping Hero children; stagger orchestration + reduced-motion gating (motion)
- `<ModesSection>` — "Three recording modes" section intro
- `<ModeTriptych>` — Three-column mode showcase grid
- `<StudioSection>` — "Professional review surface" section intro
- `<StudioSurface>` — Large illustration + narrative with boot-up timer tick animation (moment 3)
- `<FieldNotesTicker>` — Scrolling metadata strip (moment 4)
- `<LandingFooter>` — Colophon + version string (RSC)

### Landing illustrations (Phase 5B · `apps/web/src/components/illustrations/`)

- `<ModeStageA>` — Screen + Camera + Cursor visual
- `<ModeStageB>` — Screen + Cursor visual
- `<ModeStageC>` — Camera only visual
- `<StudioSurfaceArt>` — Review surface hero illustration (CSS/div art with timer string prop)

### Motion library (Phase 5B · `lib/motion/`)

- `useReducedMotion()` — Media query hook for `prefers-reduced-motion: reduce`
- Motion variants (`fadeUp`, `staggerParent`, `liftIn`) — motion library animation objects with reduced-motion gating

### Navigation utilities (Phase 5B · `components/TransitionLink.tsx`)

- `<TransitionLink>` — View-Transitions API wrapper for outbound navigation (href-based, no instrumentation)

### Studio library modules (Phase 4 · `apps/web/src/lib`)

- `analytics.ts` — Typed Vercel Analytics event taxonomy (7 studio events: modeSelected, recordingStarted, recordingStopped, recordingDownloaded, permissionDenied, browserUnsupported, cursorHighlightDisabled).
- `capabilities.ts` — `deriveStudioCapabilities()` + `browserName()` UA sniff. Probe-to-mode derivation.
- `format.ts` — `formatDuration()` (mm:ss), `formatMegabytes()` (1 decimal), `capMinutesToMs()`.

### SEO library modules (Phase 5A · `apps/web/src/lib/seo`)

- `site-config.ts` — `resolveSiteUrl()`, `siteConfig` (name, tagline, description, canonical URL).
- `metadata.ts` — `buildMetadata()` helper for title, description, canonical, OG, Twitter cards. Phase 5C adds an optional `robots?` field (5C routes are all indexed, so they leave it unset).
- `json-ld.ts` — `organizationLd()`, `webSiteLd()`, `softwareApplicationLd()`, `webApplicationLd()` (Phase 5B). Phase 5C adds `howToLd()`, `faqPageLd()`, `breadcrumbLd()` (see SEO.md).
- `JsonLd.tsx` — Server component that injects `<script type="application/ld+json">`.

### Content system (Phase 5C · MDX)

**Typed content registry (`apps/web/src/lib/content/`)** — the single source of
truth for everything _structured_ (params, metadata, sitemap, nav, JSON-LD),
kept separate from the `@next/mdx` body render:

- `schema.ts` — zod `featureFrontmatterSchema` + `docFrontmatterSchema` → typed `FeatureFrontmatter` / `DocFrontmatter` (+ `Qa`, `HowToStep`). `description ≤ 160`, `draft` defaults `false`.
- `loader.ts` — `gray-matter` reads + zod-validates frontmatter: `getModeFrontmatter`, `getDocFrontmatter`, `getAllDocs` (enforces basename===`slug.join('-')`, drops `draft` in prod — the slug-guard/allow-list), plus a server-side heading parser (`github-slugger` ids) for the static TOC.
- `features.ts` — `FEATURE_SLUG_TO_MODE` (pinned URL slug → engine `RecordMode`) + `FEATURE_BODY` (fixed 3-key static MDX import map).
- `registry.ts` — `allFeatures`, `allDocs`, `docsBySection`, `routeList`, `getFeatureBySlug`, `getDocBySlug`, `prevNext`, `dedupeFaq` (keeps first per question → valid `FAQPage`).
- `doc-bodies.ts` — `DOC_BODY` static import map (keyed by `slug.join('-')`; no dynamic `import()`).

**MDX seam + prose (`apps/web/src/`)**

- `mdx-components.tsx` — root `useMDXComponents` brand seam (App Router file convention): internal links → `<TransitionLink>`, external → `target=_blank rel=noreferrer`, `img` → `next/image` (explicit w/h, CLS-safe); headings keep `rehype-slug` ids; code/pre keep Shiki's resolved inline per-token colors.
- `app/_components/content/Prose.tsx` — token-based MDX body wrapper (Instrument Serif headings / Geist body / Geist Mono code).

**Static content nav (`apps/web/src/app/_components/content/`)** — all RSC, no client JS:

- `Toc.tsx` — on-page anchor list to `rehype-slug` heading ids (sticky aside, reserved dims; no scroll-spy in v1).
- `Breadcrumbs.tsx` — breadcrumb trail (last item = current page).
- `DocsSidebar.tsx` — section-grouped docs nav (`docsBySection`), active-slug marker.

## Content authoring workflow (Phase 5C)

**To add a doc** (under `/docs/<slug>`):

1. Create `apps/web/src/content/docs/<slug>.mdx` with frontmatter:
   `title`, `description` (≤ 160 chars), `slug` (string[], v1 is single-segment),
   `section`, `order`, optional `faq` (`{question, answer}[]`), optional `draft`
   (defaults `false`), optional `updated`.
2. Add a `DOC_BODY` entry in `lib/content/doc-bodies.ts` keyed by `slug.join('-')`
   (static import — no dynamic `import()`). The catch-all validates the slug
   against `getAllDocs()` and the `DOC_BODY` map (404 on either miss).
3. Body authored in MDX; never export a `metadata`/`frontmatter` const (the
   registry owns metadata — review rule). `draft: true` excludes it in prod.

**Features** are the 3 fixed `app/features/[mode]/_content/*.mdx` (pinned slugs);
add new modes only by extending `FEATURE_SLUG_TO_MODE` + `FEATURE_BODY` + a
colocated `_content/<slug>.mdx`.

### OG template (Phase 5A · `apps/web/src/app/_og`)

- `fonts.ts` — `loadOgFonts()` async loader for Instrument Serif + Geist Mono TTFs.
- `fonts/` — Bundled TTF assets (InstrumentSerif-Regular.ttf, GeistMono-Regular.ttf).
- `template.tsx` — Shared `ogImage({title, caption})` using Next.js `ImageResponse`.
