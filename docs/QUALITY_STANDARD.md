# Quality standard · 10/10 or don't ship

Source of truth: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 12.4.

Every agent must deliver production-quality, verified, working code.

## Definition of done

- [ ] Build · typecheck · lint · tests all green
- [ ] UI changes visually verified with Playwright MCP (`browser_navigate`,
      `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`)
- [ ] Console clean during E2E (no warnings, no errors)
- [ ] Docs updated by scribe (`docs/PROGRESS.md`, any relevant `docs/*.md`)
- [ ] No "should work" claims — every behaviour has a passing test
- [ ] No regression in other modes / routes / packages
- [ ] CLAUDE.md and AGENTS.md byte-identical (`diff CLAUDE.md AGENTS.md` empty)
- [ ] Linked GH issue closed with a summary comment (Phase 2+)

## Unacceptable

- Untested code
- "Should work" claims without verification
- TODOs left in place of implementations
- Partial features that break existing functionality
- Force-pushing to `main`
- Lowering coverage thresholds to make tests pass
- Bypassing pre-commit hooks (`--no-verify`)
- Hardcoded hex values in UI code
- `console.log` in shipped code
- Adding `Co-Authored-By` lines for AI/LLM models in commits
