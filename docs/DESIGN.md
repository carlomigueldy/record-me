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

| Variable      | Value     | Use                   |
| ------------- | --------- | --------------------- |
| `--ivory`     | `#EDE6D6` | Primary body text     |
| `--ivory-dim` | `#B5AFA2` | Deck / secondary      |
| `--ivory-mut` | `#7A766D` | Meta / mono labels    |
| `--ivory-low` | `#54514A` | Disabled / decorative |

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

## Brand primitives (Phase 2)

| Component       | Location        | Purpose                              |
| --------------- | --------------- | ------------------------------------ |
| `<RecDot>`      | `@record-me/ui` | Pulsing amber recording indicator    |
| `<ModeCard>`    | `@record-me/ui` | Triptych card with stage preview     |
| `<StudioShell>` | `@record-me/ui` | Frame for the live recording surface |
| `<MetaChip>`    | `@record-me/ui` | Mono uppercase metadata pill         |
| `<WordMark>`    | `@record-me/ui` | "record _me_" wordmark with italic   |

Implementations land in Phase 2. Phase 1 ships only the tokens.
