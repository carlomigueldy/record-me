---
name: tdd
description: Project-scoped mirror — invoke `superpowers:test-driven-development` via the Skill tool. This file is a fallback when global plugins are unavailable.
---

# Project-scoped TDD pointer

Use the global skill via the `Skill` tool:

```
Skill("superpowers:test-driven-development")
```

If the global skill is unavailable in this session, follow the standing TDD
loop manually:

1. **Red** — write the failing test.
2. **Green** — write the minimum code to make it pass.
3. **Refactor** — clean up with the test still green.
4. **Commit** — `feat:` / `fix:` / `refactor:` per change.

For record-me specifically:

- Recorder tests use Vitest + jsdom with MediaStream mocks.
- UI tests use Vitest + jsdom + RTL.
- E2E tests use Playwright with Chromium fake-device flags.
