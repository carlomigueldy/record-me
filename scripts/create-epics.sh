#!/usr/bin/env bash
# Create the 6 phase epic issues on the GitHub repo.
# Idempotent: skips creation if an epic for that phase already exists.

set -euo pipefail

if ! command -v gh >/dev/null; then
  echo "error: gh CLI not installed" >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
echo "Creating phase epics on $REPO ..."

declare -a PHASES=(
  "1|Bootstrap & Harness|Stand up monorepo, agent harness, docs, GH workflow, CI."
  "2|Design system & brand primitives|Tailwind v4 preset, shadcn components, brand primitives in @record-me/ui."
  "3|Recording engine|@record-me/recorder full implementation: state machine, canvas compositing, IndexedDB spill, MediaRecorder."
  "4|Studio|/record route end-to-end: mode picker, live preview, REC + timer, stop/render/download."
  "5|Marketing surface|/, /features/[mode], /docs, /privacy, /changelog with metadata, OG, sitemap, JSON-LD."
  "6|Analytics & polish|Custom events, Lighthouse budgets enforced, prod deployment, custom domain."
)

declare -a LABEL_SLUGS=(
  "phase-1: bootstrap"
  "phase-2: design-system"
  "phase-3: recorder"
  "phase-4: studio"
  "phase-5: marketing"
  "phase-6: analytics"
)

for entry in "${PHASES[@]}"; do
  num=$(echo "$entry" | cut -d'|' -f1)
  name=$(echo "$entry" | cut -d'|' -f2)
  goal=$(echo "$entry" | cut -d'|' -f3)
  label_slug="${LABEL_SLUGS[$((num - 1))]}"

  # Skip if epic exists.
  if gh issue list --label "epic" --search "Phase ${num}" --state all --json title --jq '.[].title' | grep -qE "^\[epic\] Phase ${num} \xc2\xb7 "; then
    echo "  ~ Phase ${num} (epic exists; skipping)"
    continue
  fi

  body=$(cat <<EOF
Auto-created by scripts/create-epics.sh.

**Phase:** ${num}
**Plan path:** docs/superpowers/plans/YYYY-MM-DD-record-me-phase-${num}-*.md (write via \`/plan\` when ready)
**Spec reference:** docs/superpowers/specs/2026-05-27-record-me-design.md

## Goal

${goal}

## Milestones

See docs/PROGRESS.md "Phase ${num}" section. This epic mirrors that checklist.

## Definition of done

All milestones checked, all per-task issues closed via /spawn-record-me-team's review loop, PR merged, docs updated.
EOF
)

  gh issue create \
    --title "[epic] Phase ${num} · ${name}" \
    --body "$body" \
    --label "epic,${label_slug}" \
    --assignee @me >/dev/null

  echo "  + Phase ${num} epic created"
done

echo "Done. Phase epics live."
