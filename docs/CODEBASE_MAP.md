# Codebase map

Auto-maintained by `/agent-checkpoint` (run weekly or after major merges).

Last regenerated: 2026-05-30 (Phase 5B Editorial landing)

## record-me-sr-frontend

### apps/web/src

- `app/layout.tsx` — root layout, next/font wiring (Instrument Serif, Geist, Geist Mono)
- `app/page.tsx` — home page (Phase 5B editorial landing with sections + JSON-LD)
- `app/globals.css` — CSS imports: tokens → tailwindcss → theme
- `app/record/page.tsx` — /record placeholder
- `app/dev/layout.tsx` — dev-only layout (404 in production)
- `app/dev/primitives/page.tsx` — brand primitives showcase
- `app/dev/previews/layout.tsx` — fixed-overlay shell escaping /dev chrome; noindex metadata
- `app/dev/previews/landing/page.tsx` — Phase 5 landing hero mockup (real Twilight tokens)
- `app/dev/previews/modes/page.tsx` — three-ModeCard composition (Phase 2 primitives)
- `app/dev/previews/studio/page.tsx` — Phase 4 studio surface mockup
- `app/opengraph-image.tsx` · `app/privacy/page.tsx` · `app/privacy/opengraph-image.tsx` · `app/changelog/page.tsx` · `app/changelog/opengraph-image.tsx` — Phase 5A pages + OG
- `app/sitemap.ts` · `app/robots.ts` · `app/manifest.ts` · `app/icon.svg` — Phase 5A SEO metadata
- `lib/seo/site-config.ts` · `lib/seo/metadata.ts` · `lib/seo/json-ld.ts` · `lib/seo/JsonLd.tsx` — Phase 5A SEO library
- `app/changelog/changelog.ts` — Typed changelog entries (MDX-free, v1.0.0 seed)
- `app/_og/fonts.ts` · `app/_og/fonts/InstrumentSerif-Regular.ttf` · `app/_og/fonts/GeistMono-Regular.ttf` · `app/_og/template.tsx` — Phase 5A shared OG template
- `app/_components/landing/LandingNav.tsx` · `LandingNav.test.tsx` — Phase 5B masthead (wordmark + studio link)
- `app/_components/landing/Hero.tsx` · `HeroReveal.tsx` — Phase 5B headline + CTA + reveal orchestration
- `app/_components/landing/ModesSection.tsx` · `ModeTriptych.tsx` — Phase 5B mode showcase grid
- `app/_components/landing/StudioSection.tsx` · `StudioSurface.tsx` — Phase 5B studio narrative + illustration
- `app/_components/landing/FieldNotesTicker.tsx` — Phase 5B scrolling metadata strip (moment 4)
- `app/_components/landing/LandingFooter.tsx` — Phase 5B colophon + version
- `lib/motion/usePrefersReducedMotion.ts` · `variants.ts` — Phase 5B prefers-reduced-motion hook + motion object definitions
- `components/TransitionLink.tsx` — Phase 5B View-Transitions wrapper (outbound navigation)

### packages/ui/src

- `index.ts` — public surface re-exports
- `tokens.css` — Twilight design tokens (canonical CSS vars + keyframes)
- `lib/cn.ts` — clsx + tailwind-merge helper
- `lib/cn.test.ts` — unit tests for cn()
- `components/Button.tsx` — shadcn Button (Twilight CVA)
- `components/Button.test.tsx` — unit tests
- `components/WordMark.tsx` — brand wordmark
- `components/WordMark.test.tsx` — unit tests
- `components/MetaChip.tsx` — mono metadata pill
- `components/MetaChip.test.tsx` — unit tests
- `components/RecDot.tsx` — recording indicator
- `components/RecDot.test.tsx` — unit tests
- `components/ModeCard.tsx` — triptych card
- `components/ModeCard.test.tsx` — unit tests
- `components/StudioShell.tsx` — recording surface frame
- `components/StudioShell.test.tsx` — unit tests
- `components/illustrations/ModeStageA.tsx` — Phase 5B screen + camera + cursor visual
- `components/illustrations/ModeStageB.tsx` — Phase 5B screen + cursor visual
- `components/illustrations/ModeStageC.tsx` — Phase 5B camera only visual
- `components/illustrations/StudioSurfaceArt.tsx` — Phase 5B review surface hero illustration
- `test/setup.ts` — jest-dom matcher setup
- `../vitest.config.ts` — vitest jsdom + RTL config

### .github/assets/readme

- `hero.png` — README hero capture (1440×900, ≤ 350 KB)
- `modes.png` — README modes capture
- `studio.png` — README studio capture

## record-me-staff

### packages/recorder/src

- `index.ts` — public surface (re-exports)
- `types.ts` — public types
- `capabilities.ts` — MP4-first MIME negotiation + capability probe
- `errors.ts` — RecorderError + DOMException mapping
- `filename.ts` — suggestedFilename builder
- `acquire.ts` — per-mode track acquisition
- `composer.ts` — 2D canvas RAF composer
- `cursor-highlights.ts` — in-tab click ripples
- `encoder.ts` — MediaRecorder wrapper
- `recorder.ts` — createRecorder state machine
- `storage/index.ts` — ChunkStore + factory
- `storage/memory.ts` — in-memory chunk store
- `storage/indexeddb.ts` — IndexedDB chunk store
- `test/setup.ts` — vitest global mock setup
- `test/mocks/**` — MediaRecorder / MediaStream / navigator.mediaDevices / canvas / AudioContext mocks
- `vitest.config.ts` — vitest jsdom + 90% coverage gate

### packages/config (Phase 1)

- `tsconfig/base.json`
- `tsconfig/next.json`
- `tsconfig/package.json`
- `eslint/index.js`
- `prettier/index.js`
- `tailwind/theme.css` — Tailwind v4 @theme block (references vars from tokens.css)

### Root configs

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.json`
- `lefthook.yml`
- `lighthouserc.json`
- `vitest.workspace.ts`

## record-me-scribe

### docs/

- `ARCHITECTURE.md`, `DESIGN.md`, `FRONTEND.md`, `RECORDING.md`, `SEO.md`,
  `SECURITY.md`, `TESTING.md`, `CODE_STYLE.md`, `COMMANDS.md`,
  `QUALITY_GATES.md`, `QUALITY_STANDARD.md`, `WORKFLOW.md`, `PROGRESS.md`,
  `CODEBASE_MAP.md` (this file), `AGENT_JOURNAL.md`
- `superpowers/specs/2026-05-27-record-me-design.md`
- `superpowers/plans/2026-05-28-record-me-phase-1-bootstrap.md`

### Root

- `CLAUDE.md`, `AGENTS.md`, `README.md`, `LICENSE`

## record-me-e2e

### apps/web/tests/e2e

- `smoke.spec.ts` — Phase 1 smoke tests
- `seo.spec.ts` — Phase 5A SEO metadata, robots, sitemap, OG image smoke tests
