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

## Tailwind v4 @source for workspace packages

Tailwind v4 does NOT auto-scan workspace packages outside the app root. If a component from `@record-me/ui` uses utility classes (e.g. `bg-amber`, `h-3`, `w-3`, arbitrary animation classes), those classes will be absent from the compiled stylesheet unless an explicit `@source` directive is added in `apps/web/src/app/globals.css`:

```css
@source "../../../../packages/ui/src";
```

Without this, components like `RecDot` silently render as 0×0 transparent spans — their classes are in the JSX but never compiled into CSS. This affects all routes that render `@record-me/ui` components, including `/dev/primitives` and `/dev/previews/*`.

**Diagnosis signal:** a span with `bg-amber h-3 w-3` classes reports `getBoundingClientRect()` width/height of 0 and `getComputedStyle().backgroundColor` of `rgba(0,0,0,0)`, despite `--color-amber` resolving correctly on `:root`. The CSS rule for `.bg-amber` simply does not exist in the stylesheet.

## Screenshot verification: trust the binary, not the live page

When visually verifying a screenshot during capture: **read the committed PNG with the Read tool before reporting [DONE:DONE]**. A `page.evaluate()` check returning the expected value during capture does not guarantee the saved PNG reflects that state — timing, animation snapshots, and compression can all produce a different result in the file.

If `getComputedStyle(el).backgroundColor` passes during capture but the committed PNG is suspiciously small (e.g. studio.png at ~5 KB when it should show a colored dot), trust the binary. Re-read the file, inspect it visually, and re-capture if the content looks wrong.

**Why:** a `page.reload()` workaround for a JIT miss may temporarily show correct computed styles in the live browser while the captured PNG was taken at a moment when CSS was still missing. The committed artifact is the ground truth.

## Next.js dev indicator in screenshot captures

The Next.js 15 dev build indicator (`<nextjs-portal>`) appears as a black circle with "N" in the bottom-left corner of all dev-mode screenshots. Suppress it on capture-only routes by adding a scoped style tag in the layout:

```tsx
<style>{`nextjs-portal { display: none !important; }`}</style>
```

Place it inside the fixed-overlay div in `/dev/previews/layout.tsx` — scoped to preview routes only so `/dev/primitives` and other dev routes retain the badge for normal development ergonomics.
