## Summary

<!-- One paragraph: what this PR does and why. -->

## Linked issues

Closes <!-- #N, #M -->

<!-- For multi-task PRs (e.g. from /spawn-record-me-team), list every closed issue. -->

## Type

- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] docs
- [ ] test
- [ ] chore
- [ ] perf
- [ ] ci

## Phase

- [ ] Phase 1 · Bootstrap & Harness
- [ ] Phase 2 · Design system & brand primitives
- [ ] Phase 3 · Recording engine
- [ ] Phase 4 · Studio
- [ ] Phase 5 · Marketing surface
- [ ] Phase 6 · Analytics & polish
- [ ] Cross-phase / maintenance

## Spec sections touched

<!-- Reference sections of docs/superpowers/specs/2026-05-27-record-me-design.md
     if this PR implements or modifies a spec contract. -->

## Test plan

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (coverage unchanged or improved)
- [ ] `pnpm test:e2e` passes (if UI changes)
- [ ] `pnpm build` passes
- [ ] Lighthouse budgets met (if UI changes — `pnpm lhci`)
- [ ] Visual verification via Playwright MCP (if UI changes) — screenshots below
- [ ] Docs updated (`docs/PROGRESS.md` + any relevant `docs/*.md`)
- [ ] `diff CLAUDE.md AGENTS.md` empty (if either touched)

## Screenshots / recordings

<!-- For UI work: Playwright MCP screenshots showing the before / after.
     For recorder work: not required (covered by unit tests). -->

## Privacy + security check

- [ ] No new API route accepting video bytes
- [ ] No new third-party scripts (CSP unchanged)
- [ ] No cookies set
- [ ] No PII added to analytics events

## Reviewer notes

<!-- Anything reviewers should pay extra attention to. -->
