---
description: Spawn the record-me-shipping team against the latest plan. Alias for /spawn-record-me-team with the most recently modified plan.
---

Run:

```bash
latest=$(ls -t docs/superpowers/plans/*.md 2>/dev/null | head -1)
test -n "$latest" || { echo "No plans found. Run /plan first."; exit 1; }
echo "Latest plan: $latest"
```

Then invoke `/spawn-record-me-team $latest`.
