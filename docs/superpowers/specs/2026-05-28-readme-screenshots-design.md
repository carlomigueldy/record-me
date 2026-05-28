# README screenshots — design spec

**Status:** draft v1 · ready for plan
**Date:** 2026-05-28
**Author:** Carlo Miguel Dy (via brainstorming with Claude Opus 4.7)
**Related:** [`docs/superpowers/specs/2026-05-27-record-me-design.md`](2026-05-27-record-me-design.md), [`README.md`](../../../README.md), [`docs/PROGRESS.md`](../../PROGRESS.md)

---

## 1 · Summary

Update `README.md` to preview the design of the app with three editorial screenshots: a landing hero, a three-modes composition, and the studio surface. Because the real landing (Phase 5) and studio (Phase 4) routes haven't shipped, the mockups are authored as non-production `/dev/previews/*` routes inside `apps/web` using the real Twilight tokens, real Instrument Serif + Geist fonts, and real `@record-me/ui` brand primitives — guaranteeing the README cannot silently drift from the design system. Screenshots are captured manually via Playwright MCP at 1440×900, committed to `.github/assets/readme/`, and embedded inline in the existing README sections. Every mockup carries a `> _Preview · ships in Phase N_` blockquote that links to its source route so readers know what's shipped vs. what's previewed.

---

## 2 · Goals & non-goals

### 2.1 Goals

1. README's front door communicates the editorial design quality of the project today, not after Phase 5 ships.
2. Mockups use real tokens/fonts/primitives — drift between README and design system is structurally impossible.
3. Preview routes double as scaffolding for Phase 4 (studio) and Phase 5 (landing) implementation.
4. Honesty signal on every preview — no reader misreads a mockup as a shipped feature.
5. Reproducible capture process documented in `apps/web/package.json`.

### 2.2 Non-goals

- OG image / social card (deferred to Phase 5).
- Light-mode variants — brand is dark-first by design.
- Animated previews (GIF/video) — static PNGs only.
- CI screenshot diffing — manual recapture only.
- Indexing of `/dev/previews/*` by search engines.
- Per-mode deep page mockups (spec § 8.7) — those are Phase 5 work.

---

## 3 · Architecture

### 3.1 Preview routes

Four new files under `apps/web/src/app/dev/previews/`:

```
apps/web/src/app/dev/previews/
├── layout.tsx              # bare layout, no chrome, full-bleed; sets <meta name="robots" content="noindex,nofollow">
├── landing/page.tsx        # mockup of the planned Phase 5 landing hero
├── modes/page.tsx          # the three ModeCards composed against the twilight backdrop
└── studio/page.tsx         # mockup of the planned Phase 4 studio: REC dot, timer, MB indicator, preview canvas, controls
```

**Constraints:**

- All routes import from `@record-me/ui` (`WordMark`, `ModeCard`, `RecDot`, `MetaChip`, `StudioShell`) and use Tailwind classes with Twilight tokens. No inline-styled mockups, no hardcoded colors.
- The shared `layout.tsx` sets `noindex,nofollow` via the App Router `metadata.robots` field and renders no header/footer chrome — purely the preview surface.
- Routes are co-located with the existing `/dev/primitives` showcase to preserve the convention that `/dev/*` is the non-production design space.

### 3.2 Capture pipeline

Manual, run by hand, results committed to git:

1. `pnpm dev` (root) → app live at `http://localhost:3000`.
2. For each of `/dev/previews/{landing,modes,studio}`:
   - Use Playwright MCP `browser_navigate` to load the route.
   - `browser_resize` to **1440×900**.
   - `browser_take_screenshot` → PNG to `.github/assets/readme/{hero,modes,studio}.png`.
3. Run `pngquant --quality=80-95 --skip-if-larger --output <name>.png --force <name>.png` on each file to target ≤ 350 KB.

The capture step produces the three PNGs. Sequencing of commits across route files, screenshots, README edits, and `docs/PROGRESS.md` updates is the implementation plan's job (see § 5 and § 7 for what changes; the plan will batch them sensibly).

**No CI integration.** A `pnpm preview:screenshots` script in `apps/web/package.json` documents the capture steps as a comment-rich shell sequence — humans/agents can copy it, but it is not automated.

### 3.3 Asset storage

- Path: `.github/assets/readme/`
- Files: `hero.png`, `modes.png`, `studio.png` — all 1440×900 PNG, 1× density, ≤ 350 KB each after `pngquant`.
- Loaded in the README via relative `.github/assets/readme/<name>.png` paths (GitHub renders these natively).
- Not shipped in the Next.js public bundle — keeps marketing images out of production.

---

## 4 · Shot list

| Shot     | Source route            | Composition                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero`   | `/dev/previews/landing` | Full-bleed twilight backdrop. `WordMark` anchored upper-left. Tagline ("An editorial recording instrument that lives in your browser") in Instrument Serif, set to the left, breaking at a deliberate point. Primary `[ start recording ]` action below the tagline. Four `MetaChip`s along the bottom edge: privacy-first, no upload, three modes, browser-native. Faint rule below the headline. Generous negative space throughout. |
| `modes`  | `/dev/previews/modes`   | Three `ModeCard`s laid out horizontally at desktop width, each with the spec-defined glyph, mode name in Instrument Serif, one-line description in Geist body. Eyebrow "three modes" in Geist Mono uppercase tracking above the cards.                                                                                                                                                                                                 |
| `studio` | `/dev/previews/studio`  | The **planned** studio: `RecDot` pulsing top-left, monospace timer (`00:42`), MB indicator (`12.4 MB`), preview canvas placeholder showing a stylized screen+cam composite, control row beneath (`■ stop`, `↻ restart`, `⤓ download`). Mode chip top-right.                                                                                                                                                                            |

### 4.1 Alt text (committed verbatim in README)

- `hero`: `record me — editorial landing with WordMark, tagline, and primary CTA over a twilight backdrop`
- `modes`: `The three recording modes: Screen + Camera + Cursor, Screen + Cursor, and Camera only — each as an editorial ModeCard`
- `studio`: `The studio surface: REC indicator, monospace timer, MB counter, live preview canvas, and stop/restart/download controls`

---

## 5 · README integration

### 5.1 Diff

**At the top** — replace the three commented-out hero lines (lines 9–11 in current `README.md`) with the hero image and its preview caption:

```md
<p align="center">
  <img src=".github/assets/readme/hero.png"
       alt="record me — editorial landing with WordMark, tagline, and primary CTA over a twilight backdrop"
       width="900" />
</p>

> _Preview · The landing ships in Phase 5. Mockup rendered from real Twilight
> tokens via [`/dev/previews/landing`](apps/web/src/app/dev/previews/landing/page.tsx)._
```

**Inside "Three modes"** — insert the modes image directly under the section header, above the bullet list, with a preview caption noting the primitives shipped in Phase 2:

```md
## Three modes

![The three recording modes: Screen + Camera + Cursor, Screen + Cursor, and Camera only — each as an editorial ModeCard](.github/assets/readme/modes.png)

> _The `ModeCard` primitive shipped in Phase 2. Composition previewed via
> [`/dev/previews/modes`](apps/web/src/app/dev/previews/modes/page.tsx)._
```

**New section "The studio"** — insert between "Principles" and "Quick start":

```md
## The studio

![The studio surface: REC indicator, monospace timer, MB counter, live preview canvas, and stop/restart/download controls](.github/assets/readme/studio.png)

A composed cockpit, not a control panel. REC dot, monospace timer, MB indicator,
live canvas preview, and three quiet controls — stop, restart, download.

> _Preview · The studio ships in Phase 4. Mockup rendered from real Twilight
> tokens via [`/dev/previews/studio`](apps/web/src/app/dev/previews/studio/page.tsx)._
```

### 5.2 Honesty signaling (codified)

1. Every README image gets an attribution blockquote immediately below it, linking to the source route file so a curious reader can verify it's real-tokens code, not Photoshop.
2. When the underlying surface hasn't shipped yet, the blockquote is prefixed with `Preview · ships in Phase N`. (Applies to `hero` → Phase 5, `studio` → Phase 4. The `modes` shot uses already-shipped Phase 2 primitives and gets attribution only, no Preview prefix.)
3. When Phase 4 ships:
   - Scribe recaptures `studio.png` from the real `/record` route (instead of `/dev/previews/studio`).
   - Scribe drops the "Preview · ships in Phase 4" prefix and updates the link to `apps/web/src/app/record/page.tsx`.
4. Same for Phase 5 / hero when the real landing ships.
5. These recapture steps are added to `docs/PROGRESS.md` as part of the Phase 4 and Phase 5 "done" definitions.

---

## 6 · Verification

Per [`docs/QUALITY_STANDARD.md`](../../QUALITY_STANDARD.md), before marking work done:

1. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all pass.
2. Playwright MCP visits each `/dev/previews/*` route at 1440×900 and confirms render matches the shot list section by section.
3. README renders correctly on GitHub (verify by opening the README on the PR page after push — image paths must resolve).
4. `apps/web/public/` remains free of marketing imagery (verify with `ls`).
5. `noindex,nofollow` meta is present in DOM of `/dev/previews/*` (verify via Playwright MCP `browser_evaluate('document.querySelector("meta[name=robots]").content')`).
6. Each committed PNG is ≤ 350 KB.

---

## 7 · Risks & open questions

| Risk                                                                                                         | Mitigation                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mockups diverge from the real Phase 4/5 implementation once those ship.                                      | Recapture step is encoded in `docs/PROGRESS.md` as a Phase 4/5 done criterion; mockups use real tokens so any token change auto-propagates.                                                                           |
| PNGs bloat git history over time as designs evolve.                                                          | `pngquant` enforced at ≤ 350 KB; only three files; rare recapture cadence.                                                                                                                                            |
| `/dev/previews/*` accidentally indexed or linked from prod.                                                  | `noindex,nofollow` on the shared layout; routes live under existing `/dev/*` convention which is documented as non-production. Optional middleware rule to return 404 for `/dev/*` in production deferred to Phase 6. |
| Studio mockup may not survive contact with the Phase 4 implementation reality (`useRecorder()` constraints). | Phase 4 plan will lift the JSX into the real `/record` page and harden it — divergence is expected and resolved by recapture, not by freezing the mockup.                                                             |

---

## 8 · Out of scope

- OG image / social card generation (Phase 5).
- Light-mode preview variants.
- Animated previews, GIF, or video.
- Automated screenshot diffing in CI.
- Per-mode deep-page mockups (spec § 8.7) — Phase 5.
- Hosting screenshots on a CDN or external service.
- Mobile / responsive preview captures — all shots are desktop 1440×900.
