# Project-scoped skill mirrors

This directory mirrors the most-frequently-used skills for record-me so the team
has reliable in-repo access regardless of global plugin state.

Each subdirectory holds a single `SKILL.md` that either:

- Restates the skill content verbatim (for skills that may drift in the global
  catalog), or
- Re-exports / points to the global skill with a one-line note (for stable,
  shipped skills).

Agents should prefer the global skill via the `Skill` tool when available
(e.g. `Skill("frontend-design:frontend-design")`); these mirrors are fallbacks
when the global plugin isn't loaded.

Skills mirrored here:

- tdd · superpowers:test-driven-development
- e2e-testing-patterns · e2e-testing-patterns
- frontend-design · frontend-design:frontend-design
- tailwind-design-system · tailwind-design-system
- verification-before-completion · superpowers:verification-before-completion
- subagent-driven-development · superpowers:subagent-driven-development
- next-best-practices · next-best-practices
