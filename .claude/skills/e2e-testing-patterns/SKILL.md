---
name: e2e-testing-patterns
description: Project-scoped mirror — invoke `e2e-testing-patterns` via the Skill tool. This file is a fallback when global plugins are unavailable.
---

# Project-scoped E2E testing patterns pointer

Use the global skill via the `Skill` tool:

```
Skill("e2e-testing-patterns")
```

If the global skill is unavailable, follow these record-me-specific E2E
conventions:

1. **Single-flow specs** — one user journey per file in
   `apps/web/tests/e2e/<flow>.spec.ts`.
2. **Use locators by role/label** — `getByRole('button', { name: ... })`,
   `getByLabel(...)`. Avoid CSS class selectors.
3. **No `page.waitForTimeout()`** — use `expect(locator).toBeVisible()` or
   `expect.poll(...)` for async state.
4. **Media** — Chromium fake-device flags are wired in
   `apps/web/playwright.config.ts`. For screen capture, stub `getDisplayMedia`
   via `page.addInitScript()` (headless can't actually capture).
5. **Stability** — run every new spec 3× locally before claiming done.
6. **Failure artefacts** — `trace: 'on-first-retry'` and `video:
'retain-on-failure'` are already on by default.

Reference: `docs/TESTING.md`.
