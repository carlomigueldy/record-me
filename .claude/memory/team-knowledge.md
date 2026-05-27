---
name: team-knowledge
description: Cross-agent wisdom curated by scribe. Patterns, decisions, and gotchas that benefit multiple agents.
metadata:
  type: pattern
  curated_by: record-me-scribe
---

# Team knowledge — v1 baselines

## Naming

- All record-me agents are prefixed `record-me-`. Don't introduce unprefixed agents.
- Recording modes use these exact strings (typed in `@record-me/recorder`):
  `'screen+cam+cursor' | 'screen+cursor' | 'cam-only'`.

## Codec preferences (from spec § 7.4)

- MP4 first (H.264 + AAC) → WebM (VP9) → WebM (VP8). Never invert this.
- Suggested filename follows the actual `mimeType` returned by MediaRecorder.

## Design discipline (from spec § 9)

- Never hardcode hex values in UI code. Use CSS variables from
  `packages/ui/src/tokens.css`.
- Typography only via `next/font` — no raw `@import` of Google Fonts in CSS.

## Privacy invariants (from spec § 15)

- Zero recording bytes ever leave the browser. No API route receives video data.
- Vercel Analytics + Speed Insights are the only third-party scripts allowed.
  CSP headers block everything else.

## Ownership reminder

- Cross-ownership edits are gatekeeper FAILs unless the plan task is tagged
  `[cross-cutting]`. If you find yourself wanting to "just fix this small
  thing" outside your domain, return `[DONE:BLOCKED]` with a reassignment
  request.

## Self-improvement cadence

- `/agent-reflect` runs per task (automatically after APPROVED).
- `/agent-distill` runs weekly (Monday).
- `/agent-checkpoint` runs weekly or after a major merge.
