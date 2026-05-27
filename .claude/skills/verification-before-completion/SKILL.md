---
name: verification-before-completion
description: Project-scoped mirror — invoke `superpowers:verification-before-completion` via the Skill tool. This file is a fallback when global plugins are unavailable.
---

# Project-scoped verification-before-completion pointer

Use the global skill via the `Skill` tool:

```
Skill("superpowers:verification-before-completion")
```

If the global skill is unavailable, follow this verification loop before
claiming any task done:

1. **Run the relevant tests.** For UI changes, run the affected `pnpm test`
   suites plus any E2E spec in `apps/web/tests/e2e/`. For recorder changes,
   run `pnpm --filter @record-me/recorder test`.
2. **Run `pnpm typecheck`** at the workspace root. The shared tsconfig is
   strict — surprises surface here.
3. **Run `pnpm lint`.** Zero errors. Warnings noted in the PR if any.
4. **Visual verification** — for any UI change, use Playwright MCP
   (`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`,
   `browser_console_messages`) and attach a screenshot to the PR.
5. **Console clean** — `browser_console_messages` reports no errors and no
   warnings on the affected route.
6. **State results in your own words** — the extractor reading your output
   doesn't see tool output, so restate "X passes, Y failed" in plain text.

Only after these checks pass do you write `result:` or claim `[DONE:DONE]`.

Reference: `docs/QUALITY_STANDARD.md` for the full definition of done.
