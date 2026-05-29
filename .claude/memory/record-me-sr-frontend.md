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

For production routes like `/record`, suppress it only at capture time via `page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })` — never commit the suppression to the layout.

## Phase 4 learnings

### Vitest + React JSX: @vitejs/plugin-react required

The project tsconfig uses `jsx: "preserve"` for Next.js App Router compatibility. Vitest cannot transform JSX without `@vitejs/plugin-react` in `vitest.config.ts`. Without it, tests throw "React is not defined". Add to `plugins: [react()]` in the Vitest config.

### Relative imports in Vitest (no @/ alias)

`vitest.config.ts` has no path resolver, so `@/` alias imports (which work in the Next.js build) fail under Vitest. All `apps/web/src/app/record/_components/*` files must use relative imports (`../../../hooks/use-recorder`, etc.). This is noted in the plan but easy to forget.

### ESLint no-explicit-any in vi.mock factories

Plan scaffolding often uses `any` in `vi.mock()` factory `opts` parameters. The codebase's `@typescript-eslint/no-explicit-any` rule rejects these. Pattern: import the module type at the top (`import type * as Mod from '...'`) and type the factory parameter explicitly.

### useMemo dep arrays and recorder methods

When `Studio.tsx` closes over `recorder.pause/resume/stop/reset` inside a `useMemo`, ESLint `react-hooks/exhaustive-deps` flags `recorder` as missing. Fix: destructure the stable `useCallback` methods out of recorder before the memo (`const { pause: recorderPause, ... } = recorder`) and list those in the dep array.

### useRecorder holistic lifecycle (the full airtight pattern)

After 4 principal review rounds, the correct async-cancellation design for `start()`:

1. **`startingRef`** — boolean, set synchronously at entry, cleared in `finally`. Drops concurrent calls before any yield.
2. **`genRef`** — numeric generation counter, incremented synchronously at entry (`myGen = ++genRef.current`). Also bumped in `reset()` and unmount cleanup. After every `await`, check `mountedRef.current && genRef.current === myGen`.
3. **`mountedRef`** — set `true` in `useEffect`, `false` in unmount return. Guards post-await state writes.
4. **Synchronous snapshot** — before any `await`, snapshot prior handle + result into locals, null the shared refs.
5. **Handle stored before `handle.start()` await** — so unmount cleanup can always find and dispose it.
6. **Post-`handle.start()` guard** — if stale, dispose the new handle and clear `handleRef` if it still points at it.
7. `reset()` bumps `genRef` + clears `startingRef` before its own cleanup.

### analytics double-fire: startedTracked ref pattern

`recording_started` must fire once per session despite `paused → recording` also being a valid state transition. The `prevState.current !== 'recording'` predicate is not sufficient — use a boolean `startedTracked` ref (mirror of `stoppedTracked`): fire on `state === 'recording' && !startedTracked.current`, set the flag, reset on `idle`.

### WAI-ARIA radiogroup: roving tabindex + arrow keys

For `ModePicker` (ModeCard triptych with `role="radio"`):

- Selected card gets `tabIndex=0`; all others (available or not) get `tabIndex=-1`.
- ArrowRight/Down → next available mode (clamped, no wrap); ArrowLeft/Up → previous.
- Filter `availableModes` from the `available` prop to skip disabled modes.
- Move DOM focus after `onSelect` via `cardRefs.current[idx]?.focus()`.
- `ModeCard` is a `forwardRef<HTMLElement>` — the ref works cleanly.

### WCAG AA contrast: text-ivory-mut vs text-ivory-dim

`text-ivory-mut` (#7A766D) fails WCAG AA for small text (text-xs/mono) on dark surfaces. Use `text-ivory-dim` (#B5AFA2) for small labels that must meet contrast. `text-ivory-mut` is acceptable only for truly decorative/secondary copy at larger sizes.

### README screenshot capture pipeline

For production routes (not `/dev/previews/*`): viewport 1440×900, deviceScaleFactor 2, wait `document.fonts.ready` + 1500ms settle, suppress Next.js dev indicator via `page.addStyleTag` at capture time only, compress with `pngquant --quality=80-95 --skip-if-larger`. Target size ~19–60 KB, hard limit 350 KB.
