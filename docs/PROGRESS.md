# Progress

Living document mirroring GitHub phase epic issue state. Scribe updates this
after every approved task.

## Phase 1 · Bootstrap & Harness · in progress

Plan: `docs/superpowers/plans/2026-05-28-record-me-phase-1-bootstrap.md`
Epic: #1 (created in Task 41)

- [x] Section A · Monorepo skeleton (Tasks 1–8)
- [x] Section B · Tooling (Tasks 9–14)
- [x] Section C · Agent harness (Tasks 15–28)
- [x] Section D · Documentation (Tasks 29–35)
- [x] Section E · GitHub workflow surfaces (Tasks 36–40)
- [ ] Section F · Repository creation + deployment (Tasks 41–43)

## Phase 2 · Design system & brand primitives · planned

Plan: (to be written)
Epic: #2

- [ ] Tailwind v4 preset extended with full token set
- [ ] shadcn/ui components installed in `@record-me/ui`
- [ ] Brand primitives: RecDot, ModeCard, StudioShell, MetaChip, WordMark
- [ ] Unit tests for brand primitives
- [ ] Storybook-free visual verification via Playwright MCP

## Phase 3 · Recording engine · planned

Plan: (to be written)
Epic: #3

- [ ] `supportedMimeType()` + `probeCapabilities()` (✓ scaffolded in Phase 1)
- [ ] `createRecorder()` state machine
- [ ] Track acquisition per mode (A/B/C)
- [ ] Canvas compositing pipeline
- [ ] Cursor highlight overlay (in-tab clicks)
- [ ] MediaRecorder integration + codec negotiation
- [ ] IndexedDB chunk spill for long recordings
- [ ] Memory mode + RecordingResult assembly
- [ ] 90%+ unit test coverage

## Phase 4 · Studio (/record) · planned

Plan: (to be written)
Epic: #4

- [ ] `useRecorder()` React hook
- [ ] Mode picker UI
- [ ] Cap selector + warning
- [ ] Live preview canvas with REC dot, timer, MB indicator
- [ ] Stop & render preview pane
- [ ] Download flow
- [ ] Discard & re-record
- [ ] Error states (permission denied, unsupported browser, mid-recording failure)
- [ ] E2E smoke test per mode

## Phase 5 · Marketing surface · planned

Plan: (to be written)
Epic: #5

- [ ] `/` landing with motion + signature moments
- [ ] `/features/[mode]` deep pages with MDX
- [ ] `/docs` + `/docs/[...slug]`
- [ ] `/privacy`, `/changelog`
- [ ] Per-route `generateMetadata` + `opengraph-image.tsx`
- [ ] `sitemap.ts`, `robots.ts`, `manifest.ts`
- [ ] JSON-LD on landing + feature pages
- [ ] View Transitions API on outbound links
- [ ] Lighthouse ≥ 95 on `/`, ≥ 90 elsewhere

## Phase 6 · Analytics & polish · planned

Plan: (to be written)
Epic: #6

- [ ] Vercel Analytics + Speed Insights wired (✓ scaffolded in Phase 1)
- [ ] Custom event taxonomy implemented in `lib/analytics.ts`
- [ ] All events firing from the right points in the studio
- [ ] Lighthouse CI in pipeline (✓ scaffolded in Phase 1)
- [ ] Final v1 done checklist verified
- [ ] Production deployment + custom domain
