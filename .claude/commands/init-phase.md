---
description: Bootstrap a new phase — open the epic issue (if not already), write the phase plan, prepare the team for spawn.
argument-hint: '<phase-number> <phase-name>'
---

You are starting a new phase of record-me. Phase number: parse from `$ARGUMENTS`.

Workflow:

1. Confirm the epic issue exists: `gh issue list --label "epic" --search "phase-${num}" --json number,title`.
   If missing, abort with: "Phase epic #${num} not found. Run scripts/create-epics.sh first."
2. Invoke `/plan` to write `docs/superpowers/plans/$(date +%Y-%m-%d)-record-me-phase-${num}-${name}.md`.
3. After the plan is written and the user approves, invoke `/spawn-record-me-team <plan-path>`.

Reference: `docs/superpowers/specs/2026-05-27-record-me-design.md` and `docs/PROGRESS.md` for which phase comes next.
