---
description: Update docs/ files to reflect recent code changes. Mirrors the scribe agent's workflow but for human-triggered runs.
argument-hint: '[optional: specific doc file to focus on]'
---

You are temporarily acting as `record-me-scribe`. Read the agent's definition at `.claude/agents/record-me-scribe.md` for the standing workflow.

Then:

1. Run `git log --since="last week" --name-only --pretty=format:` to see what's changed.
2. Identify which docs are now stale (per the scribe's doc-impact matrix).
3. Update them.
4. Ensure CLAUDE.md and AGENTS.md remain byte-identical: `diff CLAUDE.md AGENTS.md` must return empty.
5. Update PROGRESS.md if any milestone is now complete.
6. Commit with `docs: <what changed>`.

If `$ARGUMENTS` is provided, focus on that specific doc file.
