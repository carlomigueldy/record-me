# Workflow

## Standing process

1. **Spec** lives at `docs/superpowers/specs/`. The current v1 spec is
   `2026-05-27-record-me-design.md`.
2. **Plan** lives at `docs/superpowers/plans/`. Phases 1–6 each get one plan.
3. **Execution** via `/spawn-record-me-team <plan>` (the 6-agent dispatch loop).
4. **Doc updates** are part of every PR — scribe ensures `docs/PROGRESS.md` and
   relevant `docs/*.md` reflect the change.
5. **GH tracking** — phases are epic issues; tasks are auto-issued by the spawn
   command (Phase 2+) and closed on `[REVIEW_RESULT] APPROVED`.

## Mandatory skills

Every task that involves implementation must use:

- `superpowers:writing-plans` — before any non-trivial implementation.
- `superpowers:test-driven-development` — for code (the "red-green-refactor" loop).
- `superpowers:verification-before-completion` — before claiming work done.
- `superpowers:using-git-worktrees` — for parallel feature work.
- `superpowers:finishing-a-development-branch` — to open a PR.
- `frontend-design` (or `frontend-design:frontend-design`) — non-negotiable for
  any UI work: new pages, component changes, layout, styling, theming,
  animations. Invoke before writing component code.

## Phase cadence

| Phase | Goal                             | Plan path                                   |
| ----- | -------------------------------- | ------------------------------------------- |
| 1     | Bootstrap & Harness              | `2026-05-28-record-me-phase-1-bootstrap.md` |
| 2     | Design system & brand primitives | (to be written)                             |
| 3     | Recording engine                 | (to be written)                             |
| 4     | Studio (`/record`)               | (to be written)                             |
| 5     | Marketing surface                | (to be written)                             |
| 6     | Analytics & polish               | (to be written)                             |

## When to escalate to the user

- The dispatch loop hits a plateau (2 review rounds with zero CRITICAL/MAJOR
  cleared) — principal triggers escalation.
- All implementers report `[DONE:BLOCKED]` simultaneously.
- A spec change is needed mid-execution.

## When NOT to escalate

- A test fails — fix it.
- A typecheck breaks — fix it.
- A lint warning appears — fix it.
- A doc is stale — scribe updates it.
