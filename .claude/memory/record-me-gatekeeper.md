---
name: record-me-gatekeeper
description: Per-agent memory for gatekeeper. Patterns of failures + new checks proposed.
metadata:
  type: pattern
  owner: record-me-gatekeeper
---

# record-me-gatekeeper memory

## Phase 1 baseline

- Standard gate sequence: ownership → typecheck → lint → tests → console scan
  → TODO scan → build. Order matters (cheapest fails first).
- Ownership rejection includes the file that violated + the implementer's
  `owns:` globs for context.

## Future entries

(Append below.)
