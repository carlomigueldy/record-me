---
name: record-me-shipping
description: Plan-driven 6-teammate ship team for record-me (client-side only — no backend role)
members:
  - name: record-me-sr-frontend
    agent_type: record-me-sr-frontend
    model: claude-sonnet-4-6
    autonomous: true
  - name: record-me-staff
    agent_type: record-me-staff
    model: claude-opus-4-7
    autonomous: true
  - name: record-me-gatekeeper
    agent_type: record-me-gatekeeper
    model: claude-haiku-4-5
    autonomous: true
  - name: record-me-scribe
    agent_type: record-me-scribe
    model: claude-haiku-4-5
    autonomous: true
  - name: record-me-e2e
    agent_type: record-me-e2e
    model: claude-sonnet-4-6
    autonomous: true
  - name: record-me-principal
    agent_type: record-me-principal
    model: claude-opus-4-7
    autonomous: true
---

# record-me Shipping Team

Plan-driven multi-agent team for executing implementation plans end-to-end. Six
specialists (no backend role — record-me is client-side only). See
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 11 for the full design,
ownership matrix, and Read → Act → Reflect cycle.

## When to spawn

After writing an implementation plan via `superpowers:writing-plans`. Invoke
`/spawn-record-me-team` to launch the team against the latest plan (or pass an
explicit plan path: `/spawn-record-me-team docs/superpowers/plans/<file>.md`).

## Roles

- **record-me-sr-frontend** — UI/pages/hooks impl (Sonnet 4.6). Owns
  `apps/web/**` and `packages/ui/**`. Invokes `/frontend-design` for landing
  and per-mode pages.
- **record-me-staff** — Cross-cutting + recording engine (Opus 4.7). Owns
  `packages/recorder/**`, `packages/config/**`, `turbo.json`,
  `pnpm-workspace.yaml`. Receives `[BLOCKED]` reassignments.
- **record-me-gatekeeper** — Build/test/lint/ownership pre-screener
  (Haiku 4.5). Writes no code.
- **record-me-scribe** — Docs + memory curator (Haiku 4.5). Owns `docs/**`,
  `CLAUDE.md`, `AGENTS.md`, `.claude/memory/team-knowledge.md`.
- **record-me-e2e** — Playwright author (Sonnet 4.6). Owns
  `apps/web/tests/e2e/**`.
- **record-me-principal** — Reviewer (Opus 4.7). Invokes `/codex:review` plus
  Opus holistic review. Issues `[REVIEW_RESULT]` with CRITICAL/MAJOR/MINOR.
  Reviews every agent self-edit to `.claude/agents/*.md`.

## Lead session

The Claude Code session that runs `/spawn-record-me-team` IS the lead. The lead
orchestrates via SendMessage, never implements feature code. After all tasks are
APPROVED, the lead runs holistic checks (`pnpm typecheck && lint && test && build
&& test:e2e && lhci`) and invokes `superpowers:finishing-a-development-branch` to
open the PR.

## GitHub integration

From Phase 2 onward, the spawn command auto-creates a GH issue per plan task:
labels (`agent-task`, type, area, phase, priority), linked to the phase epic
issue. Implementers update issue progress with comments at major milestones.
Principal closes the issue on `[REVIEW_RESULT] APPROVED`. The eventual PR body
references all closed issues (`Closes #N, #M, ...`).

Phase 1 itself does not auto-create per-task issues (chicken-and-egg — templates
and labels don't exist until partway through Phase 1). Phase 1 tracks via the
plan checkboxes and `docs/PROGRESS.md` only.
