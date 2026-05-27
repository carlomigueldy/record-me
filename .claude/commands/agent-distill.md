---
description: Weekly distillation. Collapses .claude/journal/YYYY-WNN.md raw notes into curated memory entries and proposed agent-definition edits. Principal-reviewed before merge.
---

You are running the weekly journal-to-memory distillation.

Workflow:

1. **Identify the week** — current ISO week: `date +%Y-W%V`. Read `.claude/journal/$(date +%Y-W%V).md`.
2. **Read** every agent's memory file to know what is already captured.
3. **Cluster** the week's journal entries by theme.
4. **For each cluster:**
   - If it's agent-specific → propose an append to `.claude/memory/<agent>.md`.
   - If it's cross-cutting → propose an append to `.claude/memory/team-knowledge.md`.
   - If the same pattern shows up ≥ 3 times → propose a self-edit to the relevant agent definition.
5. **Open a draft PR** with the proposed edits, titled `chore(memory): weekly distillation YYYY-WNN`. Tag `record-me-principal` for review.
6. **After merge**, append a checkpoint line to the journal file: `Distilled YYYY-MM-DD by /agent-distill`.

Reference: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 11.6.
