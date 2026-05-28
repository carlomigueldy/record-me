# README Screenshots — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. When spawned by `/spawn-record-me-team` the dispatch loop handles task routing and review gates automatically.

**Goal:** Land three editorial screenshots in `README.md` that preview the app's design today — sourced from new non-production `/dev/previews/{landing,modes,studio}` routes composed from real Twilight tokens and `@record-me/ui` primitives — with honesty signaling that distinguishes shipped surfaces from Phase 4/5 mockups.

**Architecture:** A nested `/dev/previews/layout.tsx` adds a fixed-overlay shell that escapes the parent `/dev` chrome (`max-w-6xl px-6 py-12`), giving each preview route full-bleed canvas suitable for 1440×900 captures. The previews import `WordMark`, `MetaChip`, `RecDot`, `ModeCard`, and `StudioShell` from `@record-me/ui` — no hex literals, no hardcoded fonts. Production safety is inherited: `/dev/layout.tsx` already calls `notFound()` when `NODE_ENV === 'production'`, so `/dev/previews/*` is 404'd in prod without further work. Screenshots are captured by hand via Playwright MCP at viewport 1440×900, run through `pngquant` to stay ≤ 350 KB each, committed to `.github/assets/readme/`, then wired into `README.md` with attribution blockquotes that prefix `Preview · ships in Phase N` for surfaces that haven't shipped yet.

**Tech Stack:** Next.js 15 App Router (React Server Components), Tailwind v4 with Twilight tokens from `packages/ui/src/tokens.css`, `@record-me/ui` brand primitives, `next/font/google` (Instrument Serif + Geist + Geist Mono — already wired in `apps/web/src/app/layout.tsx`), Playwright MCP for screenshot capture, `pngquant` CLI for compression.

**Spec:** [`docs/superpowers/specs/2026-05-28-readme-screenshots-design.md`](../specs/2026-05-28-readme-screenshots-design.md)

**Conventional commits:** Use `feat(web):` for new preview routes, `chore(web):` for the package.json capture script, `docs:` for README + PROGRESS + CODEBASE_MAP updates, `chore(assets):` for the screenshot commits. No LLM attribution footers — per root `CLAUDE.md` git conventions.

**Branching:** Single feature branch `docs/readme-screenshots-previews` off `main`. Per-task commits, squash-merge at the end via `/pr`.

**Ownership:** Routes and the layout escape hatch are sr-frontend work (under `apps/web/**`). The `preview:screenshots` script in `apps/web/package.json` is cross-cutting because package.json edits affect tooling — routes to staff. README + PROGRESS.md + CODEBASE_MAP.md + FRONTEND.md updates route to scribe. Screenshot capture itself routes to sr-frontend (Playwright MCP is the same tool the team already uses for visual verification).

---

## File Structure

### Created

| Path                                             | Owner       | Purpose                                                                                                 |
| ------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/dev/previews/layout.tsx`       | sr-frontend | Fixed-overlay shell that escapes `/dev` chrome; sets `noindex,nofollow` metadata as belt-and-suspenders |
| `apps/web/src/app/dev/previews/landing/page.tsx` | sr-frontend | Mockup of the Phase 5 landing hero                                                                      |
| `apps/web/src/app/dev/previews/modes/page.tsx`   | sr-frontend | Composition of three `ModeCard`s — the brand's signature visual moment                                  |
| `apps/web/src/app/dev/previews/studio/page.tsx`  | sr-frontend | Mockup of the Phase 4 studio surface                                                                    |
| `.github/assets/readme/hero.png`                 | sr-frontend | 1440×900 PNG captured from `/dev/previews/landing`, ≤ 350 KB                                            |
| `.github/assets/readme/modes.png`                | sr-frontend | 1440×900 PNG captured from `/dev/previews/modes`, ≤ 350 KB                                              |
| `.github/assets/readme/studio.png`               | sr-frontend | 1440×900 PNG captured from `/dev/previews/studio`, ≤ 350 KB                                             |

### Modified

| Path                    | Change                                                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/package.json` | Add `preview:screenshots` script — documents the capture flow as a comment-rich shell sequence (not run by CI)                                                                            |
| `README.md`             | Replace commented-out hero block with real `<img>` + Preview blockquote; insert modes image inside "Three modes" section; add new "The studio" section between Principles and Quick start |
| `docs/PROGRESS.md`      | Add recapture lines to Phase 4 and Phase 5 done criteria (so future phases retire the Preview blockquotes)                                                                                |
| `docs/CODEBASE_MAP.md`  | Add new preview routes + screenshot assets under sr-frontend ownership                                                                                                                    |
| `docs/FRONTEND.md`      | Add `/dev/previews/{landing,modes,studio}` entries to the route tree section                                                                                                              |

---

## Section A · Preview Layout & Production Safety

### Task A1: Add the `/dev/previews/` layout with chrome escape + noindex

**Files:**

- Create: `apps/web/src/app/dev/previews/layout.tsx`

- [ ] **Step 1: Create the layout file**

```tsx
// apps/web/src/app/dev/previews/layout.tsx
import type { Metadata } from 'next';

// /dev/* is already 404'd in production by /dev/layout.tsx (notFound()
// guard + force-dynamic). The noindex meta below is belt-and-suspenders:
// it covers dev/staging environments and any direct exposure during
// preview-deploy QA. Production safety is inherited from the parent.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// The parent /dev/layout.tsx wraps children in `mx-auto max-w-6xl px-6 py-12`.
// Preview routes need full-bleed canvas for 1440×900 screenshots — a fixed
// overlay is the cleanest App Router escape hatch from inherited layout chrome.
// `z-50` clears anything the parent renders; `overflow-auto` keeps long content
// scrollable for ad-hoc review; `bg-bg` ensures the parent's content is fully
// obscured for clean captures.
export default function PreviewsLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 overflow-auto bg-bg text-ivory">{children}</div>;
}
```

- [ ] **Step 2: Verify the dev server still boots and `/dev/previews/landing` 404s (route doesn't exist yet, that's expected)**

Run `pnpm dev` in the background (Bash tool: `run_in_background: true`), then poll once it's ready:
`until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q 200; do sleep 1; done`
Then: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dev/previews/landing`
Expected: `404` (route file not created yet — proves the layout file itself doesn't break the build).

- [ ] **Step 3: Confirm the existing `/dev/primitives` route still renders correctly under the parent layout**

Use Playwright MCP:

```
browser_navigate { url: "http://localhost:3000/dev/primitives" }
browser_snapshot
```

Expected: page renders with the existing `/dev/layout.tsx` chrome (`max-w-6xl` container, padding) — confirms we haven't regressed the sibling route.

- [ ] **Step 4: Verify production guard still fires for `/dev/previews/*`**

Stop the dev server first: `pkill -f "next dev"`.
Then build for production: `NODE_ENV=production pnpm --filter @record-me/web build`.
Then start the production server **in the background** (Bash tool: `run_in_background: true`): `NODE_ENV=production pnpm --filter @record-me/web start`.
Then poll and verify:

```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q 200; do sleep 1; done
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dev/previews/landing
pkill -f "next start"
```

Expected: `404` — confirms `/dev/layout.tsx`'s production guard applies to the nested previews segment.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dev/previews/layout.tsx
git commit -m "feat(web): add /dev/previews layout with chrome escape"
```

---

## Section B · Preview Routes

### Task B1: Landing preview (`/dev/previews/landing`)

**Files:**

- Create: `apps/web/src/app/dev/previews/landing/page.tsx`

- [ ] **Step 1: Create the page file**

```tsx
// apps/web/src/app/dev/previews/landing/page.tsx
import { Button, MetaChip, WordMark } from '@record-me/ui';

export default function LandingPreview() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg p-16">
      <header className="flex items-center justify-between">
        <WordMark size="sm" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-ivory-mut">
          v1 · preview
        </span>
      </header>

      <div className="my-auto flex max-w-4xl flex-col gap-10">
        <div className="h-px w-16 bg-line" aria-hidden="true" />
        <h1 className="font-serif text-7xl leading-[1.05] text-ivory">
          An editorial recording
          <br />
          instrument that lives in
          <br />
          your <em className="italic text-amber">browser.</em>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-ivory-dim">
          Screen, camera, cursor — composed in the browser, downloaded to disk. No accounts, no
          upload, no compromise on craft.
        </p>
        <div className="flex items-center gap-6 pt-2">
          <Button size="lg">[ start recording ]</Button>
          <span className="font-mono text-xs uppercase tracking-widest text-ivory-dim">
            ↓ see the three modes
          </span>
        </div>
      </div>

      <footer className="flex flex-wrap gap-2 pt-12">
        <MetaChip>privacy-first</MetaChip>
        <MetaChip>no upload</MetaChip>
        <MetaChip>three modes</MetaChip>
        <MetaChip>browser-native</MetaChip>
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Visually verify with Playwright MCP at 1440×900**

```
browser_navigate { url: "http://localhost:3000/dev/previews/landing" }
browser_resize { width: 1440, height: 900 }
browser_evaluate { script: "document.fonts.ready.then(() => 'ready')" }
browser_snapshot
browser_take_screenshot { fullPage: false }
```

Expected: full-bleed twilight backdrop, WordMark anchored upper-left, the headline set in Instrument Serif with "browser" italicized in amber, primary `[ start recording ]` Button below the body copy, four MetaChips along the bottom edge. No `/dev` chrome visible.

- [ ] **Step 3: Confirm console is clean**

```
browser_console_messages
```

Expected: no errors, no warnings (font loading messages are fine).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/dev/previews/landing/page.tsx
git commit -m "feat(web): add landing preview at /dev/previews/landing"
```

### Task B2: Modes preview (`/dev/previews/modes`)

**Files:**

- Create: `apps/web/src/app/dev/previews/modes/page.tsx`

- [ ] **Step 1: Create the page file**

```tsx
// apps/web/src/app/dev/previews/modes/page.tsx
import { ModeCard } from '@record-me/ui';

export default function ModesPreview() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg p-16">
      <header className="flex flex-col gap-4">
        <span className="font-mono text-xs uppercase tracking-widest text-ivory-mut">
          three modes
        </span>
        <h2 className="font-serif text-5xl leading-tight text-ivory">
          Choose your <em className="italic text-amber">composition</em>.
        </h2>
      </header>

      <div className="my-auto grid grid-cols-3 gap-6">
        <ModeCard
          eyebrow="A · the full recital"
          title="Screen + Camera + Cursor"
          description="Picture-in-picture camera, click highlights, the whole show. The mode you reach for when the camera matters as much as the screen."
        />
        <ModeCard
          eyebrow="B · just the work"
          title="Screen + Cursor"
          description="Clean walk-throughs and demos. No camera, no distraction — only the work and where you're pointing."
          accent
        />
        <ModeCard
          eyebrow="C · talking head"
          title="Camera only"
          description="Async updates, round-framed and centered. The quickest path from thought to clip."
        />
      </div>

      <footer className="flex items-center justify-between pt-8 text-[10px] uppercase tracking-widest text-ivory-mut">
        <span className="font-mono">five primitives · shipped phase 2</span>
        <span className="font-mono">apps/web/src/app/dev/previews/modes</span>
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Visually verify with Playwright MCP at 1440×900**

```
browser_navigate { url: "http://localhost:3000/dev/previews/modes" }
browser_resize { width: 1440, height: 900 }
browser_evaluate { script: "document.fonts.ready.then(() => 'ready')" }
browser_snapshot
browser_take_screenshot { fullPage: false }
```

Expected: eyebrow + headline upper-left, three `ModeCard`s centered horizontally with the middle (B) card showing the amber accent ring, monospace footer pinned bottom. No `/dev` chrome.

- [ ] **Step 3: Confirm console is clean**

```
browser_console_messages
```

Expected: no errors, no warnings.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/dev/previews/modes/page.tsx
git commit -m "feat(web): add modes preview at /dev/previews/modes"
```

### Task B3: Studio preview (`/dev/previews/studio`)

**Files:**

- Create: `apps/web/src/app/dev/previews/studio/page.tsx`

- [ ] **Step 1: Create the page file**

```tsx
// apps/web/src/app/dev/previews/studio/page.tsx
import { MetaChip, RecDot, StudioShell } from '@record-me/ui';

export default function StudioPreview() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-16">
      <StudioShell
        className="w-full max-w-5xl"
        header={
          <>
            <div className="flex items-center gap-3">
              <RecDot />
              <span className="font-mono text-sm text-ivory">00:42</span>
              <span className="font-mono text-xs text-ivory-mut">· 12.4 MB</span>
            </div>
            <MetaChip>screen + camera + cursor</MetaChip>
          </>
        }
        footer={
          <>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ivory-mut">
              studio · live preview
            </span>
            <div className="flex items-center gap-6 font-mono text-xs uppercase tracking-wider">
              <span className="text-ivory-dim">■ stop</span>
              <span className="text-ivory-dim">↻ restart</span>
              <span className="text-amber">⤓ download</span>
            </div>
          </>
        }
      >
        {/* Stylised "captured screen" — abstracted grid + vignette, no fake UI. Editorial restraint. */}
        <div className="relative aspect-video w-full overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(237,230,214,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(237,230,214,0.04) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-bg/40" />
          {/* Camera PiP — circular, bottom-right, label-only */}
          <div className="absolute bottom-6 right-6 flex h-24 w-24 items-center justify-center rounded-full border border-line bg-surface text-ivory-dim">
            <span className="font-mono text-[10px] uppercase tracking-widest">cam</span>
          </div>
        </div>
      </StudioShell>
    </main>
  );
}
```

- [ ] **Step 2: Visually verify with Playwright MCP at 1440×900**

```
browser_navigate { url: "http://localhost:3000/dev/previews/studio" }
browser_resize { width: 1440, height: 900 }
browser_evaluate { script: "document.fonts.ready.then(() => 'ready')" }
browser_snapshot
browser_take_screenshot { fullPage: false }
```

Expected: centered StudioShell card (max-w-5xl) with header showing pulsing RecDot + monospace timer + MB indicator + mode chip; 16:9 canvas with subtle grid + vignette + circular `cam` PiP bottom-right; footer with stop/restart/download controls (download in amber). No `/dev` chrome.

- [ ] **Step 3: Confirm RecDot is pulsing (motion-safe)**

```
browser_evaluate { script: "getComputedStyle(document.querySelector('[aria-label=\"Recording\"]')).animationName" }
```

Expected: `"record-me-rec-pulse"` (or similar) — confirms the RecDot's motion-safe animation is registered. RecDot's default `aria-label` is `"Recording"` (capital R) per `packages/ui/src/components/RecDot.tsx`. If `prefers-reduced-motion: reduce` is set in the test environment, value will be `"none"` — that's also correct.

- [ ] **Step 4: Confirm console is clean**

```
browser_console_messages
```

Expected: no errors, no warnings.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dev/previews/studio/page.tsx
git commit -m "feat(web): add studio preview at /dev/previews/studio"
```

---

## Section C · Capture Script & Screenshots

### Task C1: Add `preview:screenshots` documentation script to `apps/web/package.json`

**Files:**

- Modify: `apps/web/package.json:6-15` (scripts block)

- [ ] **Step 1: Read the current scripts block**

Run: `cat apps/web/package.json`

Confirm the `"scripts"` block currently ends with `"clean": "rm -rf .next .turbo node_modules"`.

- [ ] **Step 2: Add the `preview:screenshots` entry**

Apply this edit to `apps/web/package.json` — add a new line in the scripts block immediately after `"test:e2e"`:

```json
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "typecheck": "tsc --noEmit",
    "lint": "next lint --dir src",
    "test": "vitest run --passWithNoTests",
    "test:e2e": "playwright test",
    "preview:screenshots": "echo 'Manual capture flow. Steps:\\n  1. pnpm dev (root)\\n  2. Playwright MCP browser_navigate to http://localhost:3000/dev/previews/{landing,modes,studio}\\n  3. browser_resize { width: 1440, height: 900 }\\n  4. browser_evaluate document.fonts.ready\\n  5. browser_take_screenshot → .github/assets/readme/{hero,modes,studio}.png\\n  6. pngquant --quality=80-95 --skip-if-larger --output <file> --force <file>\\n  7. Verify each PNG <= 350 KB. Commit. See docs/superpowers/specs/2026-05-28-readme-screenshots-design.md § 3.2.'",
    "clean": "rm -rf .next .turbo node_modules"
  },
```

- [ ] **Step 3: Verify the script runs (it just echoes the procedure)**

Run: `pnpm --filter @record-me/web preview:screenshots`
Expected: the echo output prints the seven-step capture flow.

- [ ] **Step 4: Verify the rest of the scripts still work**

Run: `pnpm --filter @record-me/web typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json
git commit -m "chore(web): document preview:screenshots capture flow in package.json"
```

### Task C2: Capture, compress, and commit the three screenshots

**Files:**

- Create: `.github/assets/readme/hero.png`
- Create: `.github/assets/readme/modes.png`
- Create: `.github/assets/readme/studio.png`

- [ ] **Step 1: Ensure `pngquant` is installed**

Run: `which pngquant || brew install pngquant`
Expected: a path is printed (either pre-existing install or fresh from Homebrew).

- [ ] **Step 2: Create the asset directory**

Run: `mkdir -p .github/assets/readme`
Then: `ls -la .github/assets/readme`
Expected: directory exists, empty.

- [ ] **Step 3: Start the dev server in the background**

Use the Bash tool with `run_in_background: true`: `pnpm dev`.
Then poll until ready:

```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dev/previews/landing | grep -q 200; do sleep 1; done
```

Expected: poll exits when `/dev/previews/landing` returns `200`.

- [ ] **Step 4: Capture `hero.png`**

Using Playwright MCP:

```
browser_navigate { url: "http://localhost:3000/dev/previews/landing" }
browser_resize { width: 1440, height: 900 }
browser_evaluate { script: "document.fonts.ready.then(() => 'ready')" }
browser_take_screenshot { fullPage: false, filename: ".github/assets/readme/hero.png", omitBackground: false }
```

If the MCP server writes to a different path, move the file:
`mv <captured-path> .github/assets/readme/hero.png`

- [ ] **Step 5: Capture `modes.png`**

```
browser_navigate { url: "http://localhost:3000/dev/previews/modes" }
browser_resize { width: 1440, height: 900 }
browser_evaluate { script: "document.fonts.ready.then(() => 'ready')" }
browser_take_screenshot { fullPage: false, filename: ".github/assets/readme/modes.png", omitBackground: false }
```

- [ ] **Step 6: Capture `studio.png`**

```
browser_navigate { url: "http://localhost:3000/dev/previews/studio" }
browser_resize { width: 1440, height: 900 }
browser_evaluate { script: "document.fonts.ready.then(() => 'ready')" }
browser_take_screenshot { fullPage: false, filename: ".github/assets/readme/studio.png", omitBackground: false }
```

- [ ] **Step 7: Verify all three files exist at the correct dimensions**

Run:

```bash
for f in hero modes studio; do
  identify .github/assets/readme/$f.png || sips -g pixelWidth -g pixelHeight .github/assets/readme/$f.png
done
```

Expected: each file reports `1440x900` (allow a few px tolerance for OS-level scaling; if dimensions are 2880×1800 the MCP is capturing at 2× — re-capture with explicit `deviceScaleFactor: 1`).

- [ ] **Step 8: Compress with `pngquant`**

Run:

```bash
for f in hero modes studio; do
  pngquant --quality=80-95 --skip-if-larger --output .github/assets/readme/$f.png --force .github/assets/readme/$f.png
done
```

- [ ] **Step 9: Verify each PNG is ≤ 350 KB**

Run:

```bash
for f in hero modes studio; do
  size=$(stat -f%z .github/assets/readme/$f.png 2>/dev/null || stat -c%s .github/assets/readme/$f.png)
  echo "$f.png: $size bytes"
  test "$size" -le 358400 && echo "  OK (≤ 350 KB)" || echo "  TOO LARGE — rerun pngquant with --quality=70-90"
done
```

Expected: all three report `OK`. If any are too large, rerun step 8 with `--quality=70-90`.

- [ ] **Step 10: Stop the dev server**

Run: `pkill -f "next dev"`
Expected: dev server terminates.

- [ ] **Step 11: Commit the assets**

```bash
git add .github/assets/readme/hero.png .github/assets/readme/modes.png .github/assets/readme/studio.png
git commit -m "chore(assets): add README preview screenshots (hero, modes, studio)"
```

---

## Section D · Documentation

### Task D1: Update `README.md` with hero image, modes image, and "The studio" section

**Files:**

- Modify: `README.md:9-11` (commented-out hero block)
- Modify: `README.md:18` (after the `## Three modes` heading)
- Modify: `README.md:24-31` (after the Principles section — insert new "The studio" section before Quick start)

- [ ] **Step 1: Replace the commented-out hero block at the top**

In `README.md`, replace lines 9–11 (the three `<!-- Hero preview ... -->` comment lines) with:

```md
<p align="center">
  <img src=".github/assets/readme/hero.png"
       alt="record me — editorial landing with WordMark, tagline, and primary CTA over a twilight backdrop"
       width="900" />
</p>

> _Preview · The landing ships in Phase 5. Mockup rendered from real Twilight
> tokens via [`/dev/previews/landing`](apps/web/src/app/dev/previews/landing/page.tsx)._
```

- [ ] **Step 2: Insert the modes image inside "Three modes"**

In `README.md`, immediately after the `## Three modes` heading (line 18) and before the bullet list, insert:

```md
![The three recording modes: Screen + Camera + Cursor, Screen + Cursor, and Camera only — each as an editorial ModeCard](.github/assets/readme/modes.png)

> _The `ModeCard` primitive shipped in Phase 2. Composition previewed via
> [`/dev/previews/modes`](apps/web/src/app/dev/previews/modes/page.tsx)._
```

- [ ] **Step 3: Insert the new "The studio" section between Principles and Quick start**

In `README.md`, after the Principles section's closing line (`Web-native.` paragraph) and before `## Quick start`, insert:

```md
## The studio

![The studio surface: REC indicator, monospace timer, MB counter, live preview canvas, and stop/restart/download controls](.github/assets/readme/studio.png)

A composed cockpit, not a control panel. REC dot, monospace timer, MB indicator,
live canvas preview, and three quiet controls — stop, restart, download.

> _Preview · The studio ships in Phase 4. Mockup rendered from real Twilight
> tokens via [`/dev/previews/studio`](apps/web/src/app/dev/previews/studio/page.tsx)._
```

- [ ] **Step 4: Verify the README parses cleanly**

Run: `npx --yes markdownlint-cli2 README.md` (if installed; skip if not available — prettier on commit catches most issues).
Then: `git diff README.md` — eyeball the diff for malformed Markdown.

- [ ] **Step 5: Visually verify the README renders correctly on GitHub's preview**

Use VS Code's built-in markdown preview (`Cmd+Shift+V` with `README.md` open) or open the file on GitHub after pushing to confirm:

- All three images resolve (no broken-image icons).
- The Preview blockquotes render as quotes, not as code.
- The "The studio" section sits between Principles and Quick start.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: add hero, modes, and studio previews to README"
```

### Task D2: Update `docs/PROGRESS.md` with Phase 4/5 recapture criteria

**Files:**

- Modify: `docs/PROGRESS.md:47-60` (Phase 4 checklist)
- Modify: `docs/PROGRESS.md:62-75` (Phase 5 checklist)

- [ ] **Step 1: Add the recapture line to Phase 4**

In `docs/PROGRESS.md`, append a new checklist item at the bottom of the Phase 4 section (after `E2E smoke test per mode`):

```md
- [ ] Recapture `.github/assets/readme/studio.png` from `/record` (not `/dev/previews/studio`); drop the "Preview · ships in Phase 4" prefix in `README.md` and re-link to `apps/web/src/app/record/page.tsx`
```

- [ ] **Step 2: Add the recapture line to Phase 5**

In `docs/PROGRESS.md`, append a new checklist item at the bottom of the Phase 5 section (after `Lighthouse ≥ 95 on /`):

```md
- [ ] Recapture `.github/assets/readme/hero.png` from `/` (not `/dev/previews/landing`); drop the "Preview · ships in Phase 5" prefix in `README.md` and re-link to `apps/web/src/app/page.tsx`
```

- [ ] **Step 3: Verify nothing else in the file regressed**

Run: `git diff docs/PROGRESS.md`
Expected: exactly two additions, both at the end of their respective phases.

- [ ] **Step 4: Commit**

```bash
git add docs/PROGRESS.md
git commit -m "docs(progress): record recapture criteria for phases 4 and 5"
```

### Task D3: Update `docs/CODEBASE_MAP.md` and `docs/FRONTEND.md`

**Files:**

- Modify: `docs/CODEBASE_MAP.md` (add new entries under sr-frontend ownership)
- Modify: `docs/FRONTEND.md` (add route entries)

- [ ] **Step 1: Read the current CODEBASE_MAP.md to find the sr-frontend section**

Run: `grep -n "sr-frontend" docs/CODEBASE_MAP.md`
Identify the table or section where `apps/web/src/app/dev/primitives/page.tsx` is listed (this is the closest sibling to what we're adding).

- [ ] **Step 2: Add the new preview files under the same owner**

In the sr-frontend section of `docs/CODEBASE_MAP.md`, add entries for:

```
apps/web/src/app/dev/previews/layout.tsx          | Fixed-overlay shell escaping /dev chrome; noindex metadata
apps/web/src/app/dev/previews/landing/page.tsx    | Phase 5 landing hero mockup (real Twilight tokens)
apps/web/src/app/dev/previews/modes/page.tsx      | Three-ModeCard composition (Phase 2 primitives)
apps/web/src/app/dev/previews/studio/page.tsx     | Phase 4 studio surface mockup
.github/assets/readme/hero.png                    | README hero capture (1440×900, ≤ 350 KB)
.github/assets/readme/modes.png                   | README modes capture
.github/assets/readme/studio.png                  | README studio capture
```

(Match the existing column format — if entries are pipe-separated, match the column widths; if bulleted, follow that style.)

- [ ] **Step 3: Read the current FRONTEND.md route tree**

Run: `grep -n "dev/primitives\|dev/" docs/FRONTEND.md`
Identify the route tree section.

- [ ] **Step 4: Add the new routes under `/dev/`**

In the route tree, add three new entries directly below the existing `/dev/primitives` line:

```
/dev/previews/landing        — Phase 5 landing hero mockup (dev-only)
/dev/previews/modes          — Three-ModeCard composition (dev-only)
/dev/previews/studio         — Phase 4 studio mockup (dev-only)
```

(Match the formatting of existing route entries.)

- [ ] **Step 5: Verify both files parse**

Run: `git diff docs/CODEBASE_MAP.md docs/FRONTEND.md`
Eyeball for clean diffs, no malformed tables.

- [ ] **Step 6: Commit**

```bash
git add docs/CODEBASE_MAP.md docs/FRONTEND.md
git commit -m "docs: register new /dev/previews routes and screenshot assets"
```

---

## Section E · Gate & Final Verification

### Task E1: Run the full gate pipeline + visual sweep

**Files:** (read-only verification — no edits)

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors across all packages.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Unit tests**

Run: `pnpm test`
Expected: all suites pass (no new tests added, but the existing suite must still pass).

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: build succeeds. In the Next.js build output, the lines for `/dev/previews/landing`, `/dev/previews/modes`, and `/dev/previews/studio` should each show route type `ƒ` (Dynamic), NOT `○` (Static). This proves the inherited `force-dynamic` from `/dev/layout.tsx` is still active.

- [ ] **Step 5: Verify production guard for the new routes**

Run:

```bash
NODE_ENV=production pnpm --filter @record-me/web start &
sleep 3
for path in landing modes studio; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/dev/previews/$path")
  echo "/dev/previews/$path → $code"
  test "$code" = "404" && echo "  OK" || echo "  FAIL — expected 404 in production"
done
kill %1
```

Expected: all three return `404`.

- [ ] **Step 6: Verify `noindex` meta is present in dev**

Run: `pnpm dev &` then:

```bash
sleep 3
for path in landing modes studio; do
  echo "--- /dev/previews/$path ---"
  curl -s "http://localhost:3000/dev/previews/$path" | grep -o '<meta name="robots"[^>]*>' || echo "  MISSING noindex meta"
done
pkill -f "next dev"
```

Expected: each route reports `<meta name="robots" content="noindex,nofollow"/>` (or equivalent — Next normalises attribute order).

- [ ] **Step 7: Verify `apps/web/public/` stays free of marketing imagery**

Run: `ls apps/web/public/`
Expected: only `.gitkeep` (and whatever was already there).

- [ ] **Step 8: Verify each committed PNG is ≤ 350 KB**

Run:

```bash
for f in hero modes studio; do
  size=$(stat -f%z .github/assets/readme/$f.png 2>/dev/null || stat -c%s .github/assets/readme/$f.png)
  echo ".github/assets/readme/$f.png: $size bytes"
done
```

Expected: all three ≤ 358400 bytes.

- [ ] **Step 9: Open the PR**

Use the `/pr` slash command (or the equivalent superpowers:finishing-a-development-branch flow):

```
/pr
```

PR title: `docs: README screenshots — preview routes + capture pipeline`
PR body: link to the spec (`docs/superpowers/specs/2026-05-28-readme-screenshots-design.md`) and this plan; include a visual section listing the three captured PNGs (GitHub renders them inline in PRs).

---

## Reviewer Checklist (for record-me-principal)

- [ ] All four preview routes import only from `@record-me/ui` and use Tailwind classes — zero hex literals in `page.tsx` files.
- [ ] No marketing images live under `apps/web/public/**`.
- [ ] `/dev/previews/*` returns 404 in production build.
- [ ] `noindex` meta present in dev DOM for all three preview routes.
- [ ] All three PNGs are 1440×900, ≤ 350 KB, and live in `.github/assets/readme/`.
- [ ] README shows all three images with Preview/attribution blockquotes; alt text matches spec § 4.1 verbatim.
- [ ] `docs/PROGRESS.md` Phase 4 and Phase 5 sections have new recapture criteria.
- [ ] `docs/CODEBASE_MAP.md` and `docs/FRONTEND.md` updated.
- [ ] No LLM attribution in any commit or PR.
- [ ] Console clean for all three preview routes (verified via Playwright MCP).
