# Progress

Living document mirroring GitHub phase epic issue state. Scribe updates this
after every approved task.

## Phase 1 · Bootstrap & Harness · complete

Plan: `docs/superpowers/plans/2026-05-28-record-me-phase-1-bootstrap.md`
Epic: #1 (closed)
Completed: 2026-05-28

- [x] Section A · Monorepo skeleton (Tasks 1–8)
- [x] Section B · Tooling (Tasks 9–14)
- [x] Section C · Agent harness (Tasks 15–28)
- [x] Section D · Documentation (Tasks 29–35)
- [x] Section E · GitHub workflow surfaces (Tasks 36–40)
- [x] Section F · Repository creation + deployment (Tasks 41–43)

## Phase 2 · Design system & brand primitives · complete

Plan: `docs/superpowers/plans/2026-05-28-record-me-phase-2-design-system.md`
Epic: #2 (closed)
Completed: 2026-05-28

- [x] Tailwind v4 preset extended with full token set
- [x] shadcn/ui components installed in `@record-me/ui` (Button baseline)
- [x] Brand primitives: RecDot, ModeCard, StudioShell, MetaChip, WordMark
- [x] Unit tests for brand primitives
- [x] Storybook-free visual verification via Playwright MCP

## Phase 3 · Recording engine · complete

Plan: `docs/superpowers/plans/2026-05-28-record-me-phase-3-recorder.md`
Epic: #3 (closed)
Completed: 2026-05-28

- [x] `supportedMimeType()` + `probeCapabilities()` (extracted into `capabilities.ts`)
- [x] `createRecorder()` state machine
- [x] Track acquisition per mode (A/B/C)
- [x] Canvas compositing pipeline (RAF + per-mode layouts)
- [x] Cursor highlight overlay (in-tab clicks)
- [x] MediaRecorder integration + codec negotiation
- [x] IndexedDB chunk spill for long recordings
- [x] Memory mode + RecordingResult assembly
- [x] 90%+ unit test coverage

## Phase 4 · Studio (/record) · complete

Plan: `docs/superpowers/plans/2026-05-29-record-me-phase-4-studio.md`
Epic: #4
Completed: 2026-05-30

- [x] `useRecorder()` React hook + React Testing Library harness
- [x] Mode picker UI (A/B/C triptych radio)
- [x] Cap selector + warning (>10 min)
- [x] Live preview with composite video stream (no audio)
- [x] Stop & render review pane (playback + download)
- [x] Download flow (blob → filename → user disk)
- [x] Discard & re-record flow
- [x] Error states (permission denied, unsupported browser, mid-recording track failure)
- [x] E2E smoke test per mode
- [x] Recapture `.github/assets/readme/studio.png` from `/record` (real setup state; not `/dev/previews/studio`)

**Deferred (with rationale)**

- **Memory-pressure banner + IndexedDB-fallback toast** (spec § 14) — Requires new engine signals `onMemoryPressure` / `onStorageFallback` (out of scope; Phase 6 polish).
- **"Save partial recording" on track-failure** (spec § 8 / § 14) — Engine cannot assemble partial blobs from error state (`stop()` rejects). Needs engine `assemble-on-error()` path (deferred; Phase 4 shows interrupted-error + "Start over").
- **`/record` page OG / canonical / JSON-LD metadata** — Broader SEO surface (Phase 5 scope, principal minor follow-up per spec § 11).

## Phase 5 · Marketing surface · in progress

Plan: `docs/superpowers/plans/2026-05-30-record-me-phase-5a-seo-foundation.md`
Epic: #5

**Slice 5A · SEO foundation & thin pages · complete**

Completed: 2026-05-30

- [x] `lib/seo/` module (site-config, metadata, json-ld, JsonLd component)
- [x] OG template + font loader (`app/_og/`)
- [x] `/privacy` editorial page + metadata + OG
- [x] `/changelog` typed data page + metadata + OG
- [x] `sitemap.ts` + `robots.ts` + `manifest.ts` + icon.svg
- [x] Root layout metadataBase + default metadata + Organization/WebSite JSON-LD
- [x] CSP header (allows Vercel Analytics + Speed Insights)
- [x] E2E smoke tests (`tests/e2e/seo.spec.ts`)
- [x] Lighthouse CI budgets for /privacy + /changelog

**Slice 5B · Editorial landing · complete**

Completed: 2026-05-30

- [x] `/` editorial landing with bespoke illustrations + motion orchestration
- [x] Four signature motion moments (Hero reveal, ModeTriptych stagger, StudioSurface fade-in, FieldNotes ticker)
- [x] `usePrefersReducedMotion()` hook + motion variant gating (full a11y support)
- [x] `<TransitionLink>` View-Transitions wrapper on outbound navigation
- [x] SoftwareApplication + WebApplication JSON-LD builders + landing injection
- [x] `/` OG card (bespoke landing variant)
- [x] Landing component inventory (LandingNav, Hero, ModesSection, StudioSection, etc.)
- [x] Landing illustration components (ModeStageA/B/C, StudioSurfaceArt)
- [x] Lighthouse ≥ 95 on `/`
- [x] Recapture `.github/assets/readme/hero.png` from `/` (replace `/dev/previews/landing`)

**Slice 5C · MDX content system · complete**

Completed: 2026-05-31

- [x] `/features/[mode]` MDX deep pages (3 modes) + per-route metadata + per-mode OG card
- [x] `HowTo` JSON-LD on each `/features/[mode]` + `BreadcrumbList` (additive beyond § 8.4)
- [x] `/docs` index + `/docs/[...slug]` (6 docs: getting-started · permissions · codecs · safari · browser-support · troubleshooting) + metadata
- [x] `FAQPage` JSON-LD on `/docs` (from the registry's deduped doc FAQ set) + `BreadcrumbList` on deep pages
- [x] Single shared `/docs/opengraph-image` OG card (per-doc OG dropped — Next 15 cannot place `opengraph-image` inside a `[...slug]` catch-all)
- [x] Build-time MDX toolchain (`@next/mdx` + `remark-frontmatter` strip + `rehype-pretty-code` single dark theme, CSP-safe; dev stays webpack — never `--turbopack`)
- [x] Root `mdx-components.tsx` brand seam + `<Prose>` wrapper + single-theme Shiki code styling
- [x] Typed content registry: `lib/content/{schema,loader,features,registry,doc-bodies}` (zod + gray-matter), single source for params/metadata/sitemap/nav/JSON-LD
- [x] Static `<Toc>` + `<Breadcrumbs>` + `<DocsSidebar>` (RSC, no scroll-spy; `github-slugger` heading ids)
- [x] `/` ↔ `/features` View-Transition + cross-links (ModeTriptych "Learn more →")
- [x] Registry-driven `sitemap.ts` (+3 `/features/*` @ 0.8, `/docs` + each doc @ 0.6)
- [x] Lighthouse ≥ 90 on `/features/[mode]` + `/docs/[...slug]` (verified: both new routes perf = 1.00, a11y = 1.00, bp = 0.96, seo = 1.00; LCP ≤ 1800, CLS ≤ 0.05)

## Phase 6 · Analytics & polish · planned

Plan: (to be written)
Epic: #6

- [ ] Vercel Analytics + Speed Insights wired (✓ scaffolded in Phase 1)
- [ ] Custom event taxonomy implemented in `lib/analytics.ts`
- [ ] All events firing from the right points in the studio
- [ ] Lighthouse CI in pipeline (✓ scaffolded in Phase 1)
- [ ] Final v1 done checklist verified
- [ ] Production deployment + custom domain
