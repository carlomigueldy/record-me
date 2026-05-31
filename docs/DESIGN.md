# Design system

Authoritative reference for the visual language of record-me. Source of truth
for the contract: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 9.

## Palette · Twilight

See `packages/ui/src/tokens.css` (also `packages/config/tailwind/theme.css`
for the Tailwind theme mapping).

### Surface

| Variable      | Value     | Use                    |
| ------------- | --------- | ---------------------- |
| `--bg`        | `#0F1115` | Page background        |
| `--bg-2`      | `#12151B` | Subtle elevation       |
| `--surface`   | `#171B22` | Card surfaces          |
| `--surface-2` | `#1F242C` | Elevated card surfaces |
| `--line`      | `#262C36` | Border (default)       |
| `--line-soft` | `#1B2028` | Border (subtle)        |

### Ink

| Variable      | Value     | Use                                 |
| ------------- | --------- | ----------------------------------- |
| `--ivory`     | `#EDE6D6` | Primary body text                   |
| `--ivory-dim` | `#B5AFA2` | Deck / secondary                    |
| `--ivory-mut` | `#948F84` | Meta / mono labels (AA on surfaces) |
| `--ivory-low` | `#54514A` | Disabled / decorative               |

### Signal & state

| Variable     | Value     | Use                        |
| ------------ | --------- | -------------------------- |
| `--amber`    | `#E5A24A` | Accent · REC · primary CTA |
| `--amber-hi` | `#F1B768` | Hover                      |
| `--amber-lo` | `#C88A38` | Pressed                    |
| `--success`  | `#9BB28F` | Sage success               |
| `--danger`   | `#C8675A` | Muted brick error          |

**Rule:** never hardcode hex values in UI code. Always use CSS variables (or the
Tailwind utility classes that the theme generates: `bg-bg`, `text-ivory`,
`text-amber`, `border-line`, etc.).

## Typography · Pairing A

| Role                      | Family           | Weights               | Notes                       |
| ------------------------- | ---------------- | --------------------- | --------------------------- |
| Display · headlines       | Instrument Serif | 400 (roman + italic)  | clamp(40px, 7vw, 96px) hero |
| Body · UI text            | Geist            | 300 / 400 / 500 / 600 | 13–17 px body               |
| Mono · technical metadata | Geist Mono       | 400 / 500             | 10–13 px                    |

Loaded via `next/font` in `apps/web/src/app/layout.tsx`. Variables exposed to
CSS: `--font-instrument-serif`, `--font-geist`, `--font-geist-mono`. The Tailwind
theme maps these to `font-serif`, `font-sans`, `font-mono`.

## Component conventions

- All `@record-me/ui` components are React Server Components by default;
  interactivity opts in via `'use client'` at the leaf.
- Variants via **CVA** (`class-variance-authority`).
- Class merging via **`cn()`** (clsx + tailwind-merge).
- `forwardRef` for any interactive primitive.
- No hardcoded hex; use CSS variables exclusively.

## Brand primitives

| Component       | Path                                         | Variants                                                                            |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `<WordMark>`    | `packages/ui/src/components/WordMark.tsx`    | `size: 'sm' \| 'md' \| 'lg'` (default `md`)                                         |
| `<RecDot>`      | `packages/ui/src/components/RecDot.tsx`      | `size: 'sm' \| 'md' \| 'lg'`, `active?: boolean` (default `true`), `label?: string` |
| `<MetaChip>`    | `packages/ui/src/components/MetaChip.tsx`    | `tone: 'muted' \| 'amber' \| 'success' \| 'danger'`                                 |
| `<ModeCard>`    | `packages/ui/src/components/ModeCard.tsx`    | `accent?: boolean`; slots: `children` (stage), `footer`                             |
| `<StudioShell>` | `packages/ui/src/components/StudioShell.tsx` | slots: `header`, `children` (stage), `footer`                                       |

All primitives are React Server Components by default; `<Button>` opts into `'use client'` because of event handlers.

## Interactive baseline

| Component  | Path                                    | Variants                                                                                              |
| ---------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `<Button>` | `packages/ui/src/components/Button.tsx` | `variant: 'primary' \| 'secondary' \| 'ghost'`, `size: 'sm' \| 'md' \| 'lg'`, `asChild?` (Radix Slot) |

## Illustration components (Phase 5B)

Bespoke CSS/div illustrations used in landing editorial:

| Component            | Path                                     | Use case                         |
| -------------------- | ---------------------------------------- | -------------------------------- |
| `<ModeStageA>`       | `apps/web/src/components/illustrations/` | Screen + Camera + Cursor visual  |
| `<ModeStageB>`       | `apps/web/src/components/illustrations/` | Screen + Cursor visual           |
| `<ModeStageC>`       | `apps/web/src/components/illustrations/` | Camera only visual               |
| `<StudioSurfaceArt>` | `apps/web/src/components/illustrations/` | Review surface hero illustration |

All illustrations are CSS/div art (static visual structures with no dependencies). StudioSurfaceArt is consumed by a client leaf (StudioSurface) and receives a formatted timer string for display.

## Motion conventions (Phase 5B)

Animations use **motion** (npm: `motion@^12.40.0`) with mandatory `prefers-reduced-motion` gating:

- All motion is disabled when user has set `prefers-reduced-motion: reduce`.
- Motion variants are defined in `lib/motion/variants.ts` and exported as objects: `fadeUp`, `staggerParent`, `liftIn`.
- Hook `useReducedMotion()` queries the media query at render time.
- Signature moments on landing: Hero reveal (stagger), ModeTriptych stagger, StudioSurface boot-up + timer tick, FieldNotes ticker.
- Always test with `prefers-reduced-motion` enabled (Playwright: set `prefers-reduced-motion: reduce` in browser context).

## Visual verification

Use `/dev/primitives` (dev-only — returns 404 in production via the layout guard at
`apps/web/src/app/dev/layout.tsx`) as the showcase canvas. Verify via Playwright MCP
(`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`)
on every change to a primitive.
