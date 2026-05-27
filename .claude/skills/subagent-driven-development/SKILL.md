---
name: subagent-driven-development
description: Project-scoped mirror — invoke `superpowers:subagent-driven-development` via the Skill tool. This file is a fallback when global plugins are unavailable.
---

# Project-scoped subagent-driven-development pointer

Use the global skill via the `Skill` tool:

```
Skill("superpowers:subagent-driven-development")
```

This skill is the workflow that `/spawn-record-me-team` implements. It is also
the recommended pattern when an individual session needs to fan out work to
specialised sub-agents (rather than spawning the full 6-member team).

If the global skill is unavailable, the manual pattern is:

1. **Plan first.** Use `superpowers:writing-plans` to write the plan as a
   sequence of `### Task N:` blocks with explicit `Files:` and dependencies.
2. **Build the dependency graph** — explicit "depends on Task N" plus implicit
   shared-file edges.
3. **Dispatch the frontier** — fan out parallel `Task` tool invocations for
   tasks with zero unmet deps.
4. **Route by tag** — `[DONE:DONE]` → gate, `[DONE:BLOCKED]` → reassign,
   `[REVIEW_RESULT] APPROVED` → mark complete, recompute frontier.
5. **Plateau detection** — if 2 review rounds with zero CRITICAL+MAJOR
   cleared, escalate to the user.

Full reference: `.claude/commands/spawn-record-me-team.md` (the canonical
record-me implementation), `docs/superpowers/specs/2026-05-27-record-me-design.md`
§ 11.
