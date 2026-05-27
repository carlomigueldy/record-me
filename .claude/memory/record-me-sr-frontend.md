---
name: record-me-sr-frontend
description: Per-agent memory for sr-frontend. Append-only learnings curated by the agent after each APPROVED task.
metadata:
  type: pattern
  owner: record-me-sr-frontend
---

# record-me-sr-frontend memory

## Phase 1 baseline

- Tailwind v4 is CSS-first (`@import 'tailwindcss'` + `@theme {}` in a CSS file).
  No `tailwind.config.js`. The shared theme lives at
  `packages/config/tailwind/theme.css`.
- Next.js 15 requires React 19. Server Components are the default; opt into
  client with `'use client'` at the leaf.
- `next/font` exposes the font family via a CSS variable that the Tailwind
  preset references — wire both ends in `apps/web/src/app/layout.tsx`.

## Future entries

(Append below — frontmatter per entry, one line in MEMORY.md per entry.)
