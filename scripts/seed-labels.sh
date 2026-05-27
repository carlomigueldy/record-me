#!/usr/bin/env bash
# Sync labels from .github/labels.yml to the GitHub repo.
# Idempotent: existing labels are updated, missing labels are created.
# Requires: gh CLI, yq.

set -euo pipefail

LABELS_FILE=".github/labels.yml"

if ! command -v gh >/dev/null; then
  echo "error: gh CLI not installed" >&2
  exit 1
fi

if ! command -v yq >/dev/null; then
  echo "error: yq not installed (brew install yq)" >&2
  exit 1
fi

if [ ! -f "$LABELS_FILE" ]; then
  echo "error: $LABELS_FILE not found" >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
echo "Seeding labels into $REPO ..."

count=$(yq '. | length' "$LABELS_FILE")

for i in $(seq 0 $((count - 1))); do
  name=$(yq -r ".[$i].name" "$LABELS_FILE")
  color=$(yq -r ".[$i].color" "$LABELS_FILE")
  description=$(yq -r ".[$i].description // \"\"" "$LABELS_FILE")

  if gh label create "$name" --color "$color" --description "$description" --force >/dev/null 2>&1; then
    echo "  + $name"
  else
    gh label edit "$name" --color "$color" --description "$description" >/dev/null
    echo "  ~ $name (updated)"
  fi
done

echo "Done. $count labels synced."
