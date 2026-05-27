# record-me — design spec

**Status:** draft v1 · ready for plan
**Date:** 2026-05-27
**Author:** Carlo Miguel Dy (via brainstorming with Claude Opus 4.7)
**Brainstorm artifacts:** `.superpowers/brainstorm/48274-1779894063/content/` (palette, typography, hi-fi preview, four design sections)

---

## 1 · Summary

**record-me** is an editorial, privacy-first, browser-native video recording instrument deployed to Vercel. v1 ships three recording modes — _Screen + Camera + Cursor_, _Screen + Cursor_, and _Camera only_ — with a one-tap download. No accounts. No upload. The recording never leaves the user's browser.

The product surface is wrapped in an SEO-strong site with per-mode landing pages, docs, privacy, and a changelog — built on Next.js 15 App Router with strong Core Web Vitals defended by Vercel Speed Insights and Lighthouse CI.

The codebase ships as a **pnpm + Turborepo monorepo** with one deployed app (`apps/web`) and three internal packages (`@record-me/recorder`, `@record-me/ui`, `@record-me/config`). The repository carries a **self-improving agent harness** at `.claude/` modeled on MesaGo: six project-scoped agents, persistent per-agent memory, a weekly distillation/checkpoint cycle, and explicit ownership enforcement.

---

## 2 · Goals & non-goals

### 2.1 Goals (v1)

1. Deliver a polished, _editorial-feeling_ recording experience in any modern Chromium browser and Firefox; degrade gracefully on Safari 17+.
2. Three recording modes work reliably with download-to-disk in under 90 seconds first-try.
3. Strong SEO: indexable site with per-mode landing pages, OG images, sitemap, JSON-LD, and a Lighthouse score ≥ 95 on `/`.
4. Privacy as a feature, not a footnote: cookieless analytics, no upload, codified in `/privacy` and `docs/SECURITY.md`.
5. A multi-agent shipping harness that gets _sharper_ as the codebase grows (memory, ownership, reflection, distillation).

### 2.2 Non-goals (deferred to v2+)

- Filters, AR backgrounds, custom backgrounds, blur (the "extended features" from the brief — explicitly v2).
- Post-recording cropping / editing.
- Cursor highlights on arbitrary screen captures (web sandboxing makes this impossible without a native helper or browser extension; v2 ships an extension).
- Cloud share links, accounts, dashboards, recording history.
- Mobile capture (iOS/Android Chrome can record webcam but not the screen; v1 is desktop-only).
- i18n translations (placeholder `[locale]` segment is noted in `docs/SEO.md`; no migration risk).
- OffscreenCanvas/Worker compositing (kept as a v1.x performance lever if Speed Insights surfaces frame-stability issues).

---

## 3 · Users & success criteria

### 3.1 Primary user

A web-savvy creator, indie hacker, or async-first team member who wants to record a 30-second to 10-minute clip — a product walkthrough, an async update, a tutorial — without installing anything, signing up, or worrying about whether their bytes left the machine.

### 3.2 Success criteria

| Criterion                          | Measure                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| Cold start → downloaded clip       | < 90s, first-try, in Chrome latest                         |
| Landing page Lighthouse            | ≥ 95 (Performance, Accessibility, Best Practices, SEO)     |
| `/record` Lighthouse               | ≥ 90                                                       |
| Core Web Vitals                    | LCP < 1.8s · INP < 200ms · CLS < 0.05 (Speed Insights p75) |
| Mode A end-to-end E2E (Playwright) | Green on every PR                                          |
| Recorder unit-test coverage        | ≥ 90%                                                      |
| Permission-denied analytics rate   | Tracked baseline; iterate UX if > 25% drop-off             |

---

## 4 · Browser support

- **Primary (first-class):** Chrome, Edge, Arc, Brave (latest 2 versions), Firefox (latest 2).
- **Secondary (best-effort):** Safari 17+. Detect missing capabilities (`MediaRecorder.isTypeSupported`, `getDisplayMedia`) on `/record` mount via `probeCapabilities()`; show a calm fallback panel listing supported browsers if blocked.
- **Out of scope:** mobile browsers, IE, Safari ≤ 16.

---

## 5 · Architecture

### 5.1 Project shape

**pnpm + Turborepo monorepo**, MesaGo-style. One deployed app, three internal packages.

```
record-me/
├── apps/
│   └── web/                        # Next.js 15 App Router · the only deployed surface
├── packages/
│   ├── recorder/                   # @record-me/recorder · framework-agnostic engine
│   ├── ui/                         # @record-me/ui · shadcn + Twilight tokens + brand primitives
│   └── config/                     # @record-me/config · tsconfig · eslint · tailwind preset
├── docs/                           # required reading · maintained by scribe
├── .claude/                        # agent harness · agents, commands, teams, memory, journal, skills
├── pnpm-workspace.yaml
├── turbo.json
├── CLAUDE.md
├── AGENTS.md                       # identical mirror of CLAUDE.md
├── README.md
└── .gitignore
```

### 5.2 Package responsibilities & dependencies

| Package               | Depends on                                                  | Responsibilities                                                                                                                                                           |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`            | `@record-me/ui`, `@record-me/recorder`, `@record-me/config` | All routes, layouts, metadata, OG images, sitemaps, server actions, `useRecorder()` React hook. The only thing Vercel deploys.                                             |
| `@record-me/recorder` | `@record-me/config`                                         | Framework-agnostic recording engine. MediaRecorder + 2D canvas + cursor overlay + IndexedDB chunk spill. **No React import.** Unit-tested in jsdom with MediaStream mocks. |
| `@record-me/ui`       | `@record-me/config`                                         | shadcn/ui components, Twilight design tokens (CSS variables), Tailwind v4 preset, brand primitives (REC dot, mode card, studio shell, mono metadata chip).                 |
| `@record-me/config`   | ∅                                                           | Shared `tsconfig` bases, eslint flat config, prettier config, tailwind preset, type-only design tokens. Zero runtime deps.                                                 |

### 5.3 Why this shape

- Isolating `recorder` means it can be unit-tested without spinning up Next.js or jsdom-with-React.
- `record-me-team` agents get clean file boundaries — sr-frontend owns `apps/web` + `packages/ui`; staff owns `packages/recorder` + `packages/config` + root configs.
- Single deploy target keeps Vercel config simple; future apps (e.g., the v2 Chrome extension) can be added as `apps/extension` without restructuring.

---

## 6 · Product surface

### 6.1 Three modes

| Mode                             | Tracks acquired                                                                | Canvas layers                                                                              | Output                               |
| -------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| **A · Screen + Camera + Cursor** | `getDisplayMedia({video, cursor:'always'})` + `getUserMedia({video, audio})`   | screen (full) → cam PiP (bottom-right circle, 120px) → cursor ripples (in-tab clicks only) | Composite video + mixed audio        |
| **B · Screen + Cursor**          | `getDisplayMedia({video, cursor:'always'})` + optional `getUserMedia({audio})` | screen (full) → cursor ripples (in-tab clicks only)                                        | Composite video + optional mic audio |
| **C · Camera only**              | `getUserMedia({video:{aspectRatio:1}, audio})`                                 | cam (square crop, centered, subtle vignette overlay)                                       | Square video + mic audio             |

### 6.2 User journey (anonymous, client-side)

```
/  (landing)
   → Start recording
   → /record  (the studio)
       → mode picker · pick A / B / C
       → cap selector  · 10m (default) / 20 / 30 / 45 / 60 with warning above 10m
       → press Start
           → permission requests (browser-native dialogs)
           → live preview · REC dot · mono timer · estimated MB
           → optional: pause/resume
           → press Stop & render
       → review pane: <video> preview + Download button + "Discard & re-record"
       → click Download → file lands in OS downloads
       → close tab or click "Record another"
```

### 6.3 Success criteria (felt experience)

- The user lands on `/` and the page loads with an editorial first impression in under 1.8s.
- They click "Start recording" and arrive at `/record` with no perceptible delay.
- They press Start, grant permissions once, and see a calm studio with the REC dot pulsing in amber.
- They press Stop and the download button appears within 5 seconds for a 10-minute recording.

---

## 7 · Recording pipeline

### 7.1 Five-stage pipeline (shared across modes)

| #   | Stage     | What                                                                                                       | API                                         |
| --- | --------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | Acquire   | Request screen and/or camera/mic per mode                                                                  | `getDisplayMedia`, `getUserMedia`           |
| 2   | Composite | 2D canvas matching target resolution; `requestAnimationFrame` loop draws screen → cam PiP → cursor ripples | `CanvasRenderingContext2D`                  |
| 3   | Stream    | Composite stream from canvas; mix mic + camera audio                                                       | `canvas.captureStream(fps)`, `AudioContext` |
| 4   | Encode    | `MediaRecorder` with negotiated mimeType, 30 fps, configurable bitrate, chunks every 1s                    | `MediaRecorder`                             |
| 5   | Deliver   | Concat chunks → Blob → object URL → anchor download → revoke URL                                           | `Blob`, `URL.createObjectURL`               |

### 7.2 State machine

```
idle
  → requesting-permissions
      → recording  ⇄  paused
          → finalizing
              → ready (Blob + URL + suggested filename)
                  → idle (after release/dispose or "Record another")

error  (reachable from any state; recovery = reset + re-acquire)
```

### 7.3 Cursor highlights — honest scope

**Constraint:** web apps cannot observe mouse events that happen outside their own tab. `getDisplayMedia` returns pixel data (the OS cursor is rendered into captured frames when `cursor: 'always'`) but no coordinates or click events from the captured surface.

**v1 behaviour:**

- Click ripples (amber rings, 2s fade) are drawn into the composite canvas when the user clicks **inside the record-me tab**. Useful for in-app demos and meta-recordings.
- For arbitrary screen/window captures, the OS cursor is still visible in the recording, but no ripples are drawn.
- The `/record` UI carries a calm note: _"Click highlights work when you record this tab. For highlights in other apps, install the record-me extension (coming soon)."_
- Setting `cursorHighlights: false` in `RecorderOptions` opts out entirely.

**v2 path:** ship a companion Chrome extension at `apps/extension` that has tab-level event access and can feed coordinates back to the recorder via `chrome.runtime` messaging.

### 7.4 Codec negotiation — MP4-first

`supportedMimeType()` walks this list and returns the first supported entry:

| Order | MIME                                     | Rationale                                                                                          |
| ----- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1     | `video/mp4;codecs=avc1.42E01E,mp4a.40.2` | H.264 baseline + AAC — universal playback (Safari, QuickTime, every editor, every social platform) |
| 2     | `video/mp4;codecs=h264,aac`              | Broader matcher for browsers that report short codec strings                                       |
| 3     | `video/webm;codecs=vp9,opus`             | Fallback for older Chromium without MediaRecorder MP4 support                                      |
| 4     | `video/webm;codecs=vp8,opus`             | Last-resort fallback for very old browsers                                                         |

**Notes for `docs/RECORDING.md`:**

- MP4 via MediaRecorder is recent (Chrome and Firefox added it in 2024–2025). Older browsers will silently fall back to WebM.
- MP4 output is ~30% larger than equivalent WebM/VP9 at matched quality; the tradeoff buys universal playback.
- Suggested filename extension follows the actual `mimeType` returned by `MediaRecorder`.

### 7.5 Memory strategy & caps

| Setting              | Default            | Max    | Behaviour                                                                                                                                                                                                         |
| -------------------- | ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxDurationMs`      | 10 min             | 60 min | UI shows a select (10/20/30/45/60); selecting > 10 m surfaces a warning _"Longer recordings depend on your machine. Download and processing may take a while. We recommend 10 minutes for the smoothest result."_ |
| Resolution auto-step | 1080p              | —      | If selected cap ≥ 30 min, default drops to 720p / 2 Mbps. User can override.                                                                                                                                      |
| Chunk storage        | in-memory          | —      | For caps ≤ 10 min: keep `ondataavailable` chunks in a JS array.                                                                                                                                                   |
| Chunk spill          | IndexedDB          | —      | For caps > 10 min: each chunk written to an IndexedDB object store. Reassembled into Blob on `stop()`. Trades stop-latency for memory safety.                                                                     |
| Hard cap             | 10/20/30/45/60 min | —      | Recorder auto-stops 100ms before the cap and transitions to `finalizing`.                                                                                                                                         |
| Live indicator       | —                  | —      | Mono readout in the studio shows estimated MB so far + projected final MB at current bitrate.                                                                                                                     |

### 7.6 `@record-me/recorder` public API

```ts
// Framework-agnostic. No React imports. Unit-tested in jsdom with MediaStream mocks.

export type RecordMode = 'screen+cam+cursor' | 'screen+cursor' | 'cam-only';
export type RecorderState =
  | 'idle'
  | 'requesting-permissions'
  | 'recording'
  | 'paused'
  | 'finalizing'
  | 'ready'
  | 'error';

export interface RecorderOptions {
  mode: RecordMode;
  resolution?: '720p' | '1080p'; // default '1080p', clamped to source track
  fps?: number; // default 30
  videoBitsPerSecond?: number; // default 4_000_000
  maxDurationMs?: number; // default 600_000 (10m). Allowed: 10/20/30/45/60 minutes.
  cursorHighlights?: boolean; // default true; only meaningful when capturing the record-me tab
  storage?: 'auto' | 'memory' | 'indexeddb'; // default 'auto' (spills if maxDurationMs > 600_000)
  onStateChange?: (s: RecorderState) => void;
  onDurationTick?: (ms: number) => void;
  onBytesTick?: (bytes: number) => void;
  onError?: (e: RecorderError) => void;
}

export interface RecordingResult {
  blob: Blob;
  url: string; // object URL, valid until .release()
  mimeType: string;
  durationMs: number;
  bytes: number;
  suggestedFilename: string; // e.g. "record-me-2026-05-27-001.mp4"
  release: () => void; // URL.revokeObjectURL + IndexedDB cleanup
}

export interface RecorderHandle {
  state: RecorderState;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<RecordingResult>;
  dispose: () => void; // stop tracks, revoke URLs, clear IndexedDB
}

export interface CapabilityReport {
  hasMediaRecorder: boolean;
  hasGetDisplayMedia: boolean;
  hasGetUserMedia: boolean;
  supportedMimeType: string | null;
  isSafari: boolean;
  isMobile: boolean;
}

export function createRecorder(opts: RecorderOptions): RecorderHandle;
export function supportedMimeType(): string | null;
export function probeCapabilities(): CapabilityReport;
```

---

## 8 · Pages & SEO

### 8.1 Route tree (App Router)

```
apps/web/src/app/
├── layout.tsx                         # root layout · Twilight tokens · <Analytics/> · <SpeedInsights/>
├── page.tsx                           # /
├── opengraph-image.tsx                # default OG · @vercel/og
├── sitemap.ts                         # dynamic
├── robots.ts
├── manifest.ts                        # PWA-light
│
├── record/
│   ├── page.tsx                       # /record
│   ├── layout.tsx                     # minimal chrome
│   └── opengraph-image.tsx
│
├── features/
│   ├── layout.tsx                     # shared deep-page chrome
│   └── [mode]/                        # /features/screen-camera-cursor | /screen-cursor | /camera-only
│       ├── page.tsx
│       ├── opengraph-image.tsx
│       └── _content/                  # MDX fragments per mode
│
├── docs/
│   ├── page.tsx
│   └── [...slug]/page.tsx             # /docs/permissions, /docs/codecs, /docs/safari, etc.
│
├── privacy/page.tsx
├── changelog/page.tsx
│
└── api/
    └── og/route.ts                    # dynamic OG for changelog entries (v1.x optional)
```

### 8.2 Per-page metadata

Every route exports `generateMetadata`. No silent inheritance. Per-page: title, description, OG image, Twitter card, canonical URL.

| Route                            | Title                                       | Sitemap priority | Indexed            |
| -------------------------------- | ------------------------------------------- | ---------------- | ------------------ |
| `/`                              | record me — record your screen, beautifully | 1.0              | yes                |
| `/features/screen-camera-cursor` | Mode A — Screen, Camera & Cursor            | 0.8              | yes                |
| `/features/screen-cursor`        | Mode B — Screen & Cursor                    | 0.8              | yes                |
| `/features/camera-only`          | Mode C — Camera Only                        | 0.8              | yes                |
| `/record`                        | The studio — record me                      | 0.7              | yes (noimageindex) |
| `/docs`                          | Documentation                               | 0.6              | yes                |
| `/docs/[...slug]`                | (slug-driven)                               | 0.6              | yes                |
| `/changelog`                     | Changelog                                   | 0.5              | yes                |
| `/privacy`                       | Privacy                                     | 0.4              | yes                |

### 8.3 OG images

Per-route `opengraph-image.tsx` rendered at the edge via `@vercel/og`. 1200 × 630. Twilight palette, Instrument Serif headline, mono caption strip at the bottom. Cached at the edge.

### 8.4 Structured data (JSON-LD)

- `SoftwareApplication` + `WebApplication` on `/`
- `HowTo` on each `/features/[mode]` (paired with the use-case content)
- `FAQPage` on `/docs`

Injected via `<script type="application/ld+json">` in each route's `page.tsx`.

### 8.5 Core Web Vitals contract

- **Budgets:** LCP < 1.8s · INP < 200ms · CLS < 0.05 (Speed Insights p75)
- **Lighthouse:** ≥ 95 on `/`, ≥ 90 elsewhere
- **CI enforcement:** Lighthouse CI on `/` and `/record` on every PR. Failing budgets block merge.

### 8.6 Discipline rules (codified in `docs/SEO.md`)

- `next/font` for Instrument Serif + Geist + Geist Mono. `font-display: swap`, preconnect + preload on Instrument Serif and Geist.
- `next/image` everywhere with explicit `width` and `height`.
- No JS-blocking embeds above the fold.
- i18n placeholder noted: `[locale]` segment can wrap routes when translations are added.

### 8.7 Landing page · 10/10 marketing polish

The hi-fi mockup at `.superpowers/brainstorm/.../preview-hifi-pairing-a.html` is the _visual baseline_. The shipped `/` must elevate that with motion, illustrations, and signature moments.

**Requirements:**

- **Animation library:** `motion` (Framer Motion's successor — same API, smaller bundle). React-native primitive for entrances, exits, and hover states.
- **Scroll-driven animation:** prefer CSS `animation-timeline: view()` where supported (Chrome 115+, GPU-cheap); fall back to `motion`'s `useScroll` for Firefox.
- **Custom illustrations:** inline SVG components in `apps/web/src/components/illustrations/`. Hand-drawn editorial style — sr-frontend authors, principal reviews. **No stock icon packs above the fold.** Lucide is fine for UI chrome elsewhere.
- **Signature moments (one per scroll section):**
  1. Hero stagger reveal on first paint
  2. Mode triptych cards lift on enter
  3. Studio surface "boots up" on enter (REC dot pulse + timer tick)
  4. Field-notes ticker
- **Motion budgets:** transform/opacity only, no layout thrash, LCP element renders without waiting on JS, total motion bundle < 50 KB gzipped.
- **Content shape:** short editorial blurbs (1–2 sentences per section); each section has a "Learn more →" link routing to `/features/[mode]`, `/docs`, or `/privacy`. Deep content lives on the feature pages.
- **View Transitions API:** route transitions from `/` ↔ `/features/[mode]` use the View Transitions API for a smooth crossfade.

---

## 9 · Design system

### 9.1 Tokens (CSS variables in `packages/ui/src/tokens.css`)

**Surface**

| Variable      | Value     | Use                      |
| ------------- | --------- | ------------------------ |
| `--bg`        | `#0F1115` | Page background          |
| `--bg-2`      | `#12151B` | Subtle elevation         |
| `--surface`   | `#171B22` | Card surfaces            |
| `--surface-2` | `#1F242C` | Elevated card surfaces   |
| `--line`      | `#262C36` | Border (default)         |
| `--line-soft` | `#1B2028` | Border (subtle dividers) |

**Ink**

| Variable      | Value     | Use                   |
| ------------- | --------- | --------------------- |
| `--ivory`     | `#EDE6D6` | Primary body text     |
| `--ivory-dim` | `#B5AFA2` | Deck / secondary      |
| `--ivory-mut` | `#7A766D` | Meta / mono labels    |
| `--ivory-low` | `#54514A` | Disabled / decorative |

**Signal & state**

| Variable     | Value     | Use                                                      |
| ------------ | --------- | -------------------------------------------------------- |
| `--amber`    | `#E5A24A` | Accent · REC dot · primary CTA · italic-color highlights |
| `--amber-hi` | `#F1B768` | Hover                                                    |
| `--amber-lo` | `#C88A38` | Active / pressed                                         |
| `--success`  | `#9BB28F` | Sage success                                             |
| `--danger`   | `#C8675A` | Muted brick error                                        |

### 9.2 Typography (Pairing A)

| Role                      | Family           | Weights               | Notes                                                 |
| ------------------------- | ---------------- | --------------------- | ----------------------------------------------------- |
| Display · headlines       | Instrument Serif | 400 (roman + italic)  | clamp(40px, 7vw, 96px) hero · 32–52px section         |
| Body · UI text            | Geist            | 300 / 400 / 500 / 600 | 13–17 px body · loaded via `next/font`                |
| Mono · technical metadata | Geist Mono       | 400 / 500             | 10–13 px · timestamps · sizes · codecs · field labels |

### 9.3 Component conventions

- All components in `@record-me/ui` are React Server Components by default; interactivity opts in via `'use client'` at the leaf.
- Variants via **CVA** (`class-variance-authority`).
- Class merging via **`cn()`** (clsx + tailwind-merge).
- `forwardRef` for any interactive primitive.
- Tailwind v4 preset at `packages/ui/src/tailwind.preset.ts` maps tokens → utility classes. `tailwind.config` in `apps/web` extends the preset only.

### 9.4 Brand primitives

| Component       | Location        | Purpose                                               |
| --------------- | --------------- | ----------------------------------------------------- |
| `<RecDot>`      | `@record-me/ui` | Pulsing amber recording indicator with halo animation |
| `<ModeCard>`    | `@record-me/ui` | The triptych card with stage preview                  |
| `<StudioShell>` | `@record-me/ui` | The framed surface that wraps the live recording      |
| `<MetaChip>`    | `@record-me/ui` | Mono uppercase metadata pill                          |
| `<WordMark>`    | `@record-me/ui` | "record _me_" wordmark with italic                    |

---

## 10 · Analytics

### 10.1 Stack

- `@vercel/analytics` — anonymous, cookieless page views + MAU. Mounted in `apps/web/src/app/layout.tsx` as `<Analytics />`.
- `@vercel/speed-insights` — Core Web Vitals RUM. Mounted in the same layout as `<SpeedInsights />`.

### 10.2 Custom event taxonomy

Typed helper at `apps/web/src/lib/analytics.ts` wraps `track()` from `@vercel/analytics`. All events carry zero PII.

| Event                       | Properties                                           | Why                                                                                                           |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `mode_selected`             | `mode: RecordMode`                                   | Top-of-funnel intent (before recording starts)                                                                |
| `recording_started`         | `mode, resolution, cap_minutes`                      | Which mode wins · cap distribution                                                                            |
| `recording_stopped`         | `mode, duration_seconds, bytes, mime_type, partial?` | Average session length → cap & quality presets; `partial: true` when stopped by an error rather than the user |
| `recording_downloaded`      | `mode, duration_seconds, bytes, mime_type`           | Conversion funnel: started → completed → downloaded                                                           |
| `permission_denied`         | `kind: 'screen' \| 'camera' \| 'mic'`                | Where users bounce — drives error UX iteration                                                                |
| `browser_unsupported`       | `feature, ua_browser`                                | Real demand for Safari / edge-case support                                                                    |
| `cursor_highlight_disabled` | `reason: 'opt-out' \| 'not-record-me-tab'`           | How often is the cursor-highlight scope hit                                                                   |

### 10.3 Privacy implication

Codified once in `docs/SECURITY.md` and `/privacy`: _"We use Vercel Analytics to count anonymous page views and Vercel Speed Insights to monitor performance. Both are cookieless. Recording content never leaves your browser."_

---

## 11 · Agent harness

### 11.1 `.claude/` structure

```
.claude/
├── agents/
│   ├── record-me-sr-frontend.md       # role · workflow · owns globs · quality bar
│   ├── record-me-staff.md
│   ├── record-me-gatekeeper.md
│   ├── record-me-scribe.md
│   ├── record-me-e2e.md
│   └── record-me-principal.md
│
├── memory/                            # persistent, committed
│   ├── MEMORY.md                      # index, one line per memory file
│   ├── team-knowledge.md              # shared cross-agent wisdom (scribe-curated)
│   ├── record-me-sr-frontend.md       # per-agent gotchas, patterns, "things that broke before"
│   ├── record-me-staff.md
│   ├── record-me-gatekeeper.md
│   ├── record-me-scribe.md
│   ├── record-me-e2e.md
│   └── record-me-principal.md
│
├── journal/                           # high-volume raw notes — distilled weekly
│   └── YYYY-WNN.md                    # one bucket per ISO week
│
├── commands/
│   ├── spawn-record-me-team.md        # the dispatch loop · mirrors /spawn-mesago-team
│   ├── agent-reflect.md               # per-completion reflection cycle
│   ├── agent-distill.md               # weekly journal → memory + agent-def distillation
│   ├── agent-checkpoint.md            # weekly codebase-map + agent inventory refresh
│   ├── plan.md · ship.md · debug.md · tdd.md · review.md · update-docs.md · pr.md ...
│
├── teams/
│   └── record-me-shipping.md          # YAML blueprint · 6 members
│
├── skills/                            # project-scoped skill mirror
│   ├── tdd/SKILL.md
│   ├── e2e-testing-patterns/SKILL.md
│   ├── frontend-design/SKILL.md
│   ├── tailwind-design-system/SKILL.md
│   ├── verification-before-completion/SKILL.md
│   ├── subagent-driven-development/SKILL.md
│   ├── next-best-practices/SKILL.md
│   └── tanstack-query-best-practices/SKILL.md
│
├── settings.json                      # CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 · permissions · SessionStart hook
└── team-reminder.txt                  # printed on SessionStart
```

### 11.2 The Read → Act → Reflect cycle

**Read** (on first message of a session): agent reads its own definition (`.claude/agents/<agent>.md`), its own memory (`.claude/memory/<agent>.md`), and shared `team-knowledge.md` before acting.

**Act** (during work): standing authority inside declared `owns:` globs. Refactors decay it spots; updates inventory tables in its own definition file as part of the work. Gatekeeper rejects cross-ownership edits unless task is tagged `[cross-cutting]` (routes to `record-me-staff`).

**Reflect** (on task completion):

- Append surprises / patterns to `.claude/memory/<agent>.md` (frontmatter: `name`, `description`, `type: pattern | gotcha | decision | inventory`).
- If a pattern recurred, propose an edit to its own definition; principal reviews.
- If the codebase shape shifted, ping scribe to update `docs/CODEBASE_MAP.md`.

### 11.3 The six-member team blueprint (`.claude/teams/record-me-shipping.md`)

```yaml
---
name: record-me-shipping
description: Plan-driven 6-teammate ship team for record-me (client-side only — no backend role)
members:
  - {
      name: record-me-sr-frontend,
      agent_type: record-me-sr-frontend,
      model: claude-sonnet-4-6,
      autonomous: true,
    }
  - { name: record-me-staff, agent_type: record-me-staff, model: claude-opus-4-7, autonomous: true }
  - {
      name: record-me-gatekeeper,
      agent_type: record-me-gatekeeper,
      model: claude-haiku-4-5,
      autonomous: true,
    }
  - {
      name: record-me-scribe,
      agent_type: record-me-scribe,
      model: claude-haiku-4-5,
      autonomous: true,
    }
  - { name: record-me-e2e, agent_type: record-me-e2e, model: claude-sonnet-4-6, autonomous: true }
  - {
      name: record-me-principal,
      agent_type: record-me-principal,
      model: claude-opus-4-7,
      autonomous: true,
    }
---
```

### 11.4 Ownership matrix

| Domain                                                      | Owner                                                   | Enforcement                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `apps/web/src/app/**` · `apps/web/src/components/**`        | `record-me-sr-frontend`                                 | Gatekeeper rejects cross-owner edits unless task is `[cross-cutting]`                |
| `packages/ui/**`                                            | `record-me-sr-frontend`                                 | Same                                                                                 |
| `packages/recorder/**`                                      | `record-me-staff`                                       | Gatekeeper rejects edits from sr-frontend; recorder changes always need staff review |
| `packages/config/**` · `turbo.json` · `pnpm-workspace.yaml` | `record-me-staff`                                       | Cross-cutting, never an impl's by-the-way edit                                       |
| `apps/web/tests/e2e/**`                                     | `record-me-e2e`                                         | E2E specs only authored by e2e agent (impls request them via `[e2e]` tag)            |
| `docs/**` · `CLAUDE.md` · `AGENTS.md`                       | `record-me-scribe`                                      | Impls flag doc updates needed; scribe authors them post-merge                        |
| `.claude/memory/**`                                         | `record-me-scribe` (curate) + each agent (append own)   | Each agent owns their own memory file; scribe curates `team-knowledge.md`            |
| `.claude/agents/**`                                         | `record-me-principal` (review) + each agent (self-edit) | Agents propose self-improvement edits; principal reviews before merge                |

### 11.5 `/spawn-record-me-team` dispatch loop

Mirrors `/spawn-mesago-team` exactly (Steps 1–8: plan picker → preflight → TeamCreate → dependency graph → dispatch loop → message routing → escalation → completion + PR). Source-of-truth: `.claude/commands/spawn-record-me-team.md`.

**Differences from MesaGo:**

- No backend agent in dispatch rules; tasks touching `packages/recorder/**` route to `record-me-staff`.
- Holistic checks in Step 8a: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build && pnpm lhci`.
- `[REVIEW_RESULT] APPROVED` triggers an E2E sub-task spawn when files in `apps/web/src/app/**` or new `apps/web/src/components/**` are touched.

### 11.6 Self-improvement commands

- `/agent-reflect <agent> <task-id>` — per-task: agent reviews its diff + outcome and updates its memory file.
- `/agent-distill` — weekly: collapse `.claude/journal/YYYY-WNN.md` entries into curated memory + agent-def edits (principal-reviewed).
- `/agent-checkpoint` — weekly (or on big merges): scribe regenerates `docs/CODEBASE_MAP.md` (file inventory by owner) and refreshes inventory tables embedded in agent definitions.

### 11.7 `settings.json` essentials

```json
{
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" },
  "permissions": {
    "allow": [
      "Bash(pnpm:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "Bash(git stash:*)",
      "Bash(gh:*)",
      "Bash(ls:*)",
      "Bash(find:*)",
      "Bash(grep:*)",
      "Bash(wc:*)",
      "Bash(cat:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(diff:*)",
      "Bash(echo:*)",
      "Bash(test:*)",
      "Bash(npx playwright:*)",
      "Bash(npx lhci:*)",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "WebSearch"
    ],
    "deny": []
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "test -f .claude/commands/spawn-record-me-team.md && test -f .claude/team-reminder.txt && cat .claude/team-reminder.txt"
          }
        ]
      }
    ]
  }
}
```

---

## 12 · Quality gates

### 12.1 Pre-commit (local · lefthook or husky)

- `lint-staged`: `eslint --fix` + `prettier --write` on changed files
- `tsc --noEmit` (incremental)
- Vitest `--related` on the diff

### 12.2 Gatekeeper (per task · in the dispatch loop)

- `pnpm typecheck` · `pnpm lint` · `pnpm test` (affected via Turbo `--filter`)
- Ownership audit: `git diff --name-only` ⨯ agent's `owns:` globs
- `grep -r console.log` in changed files (allowed only in test/dev files)
- `grep -r 'TODO\|FIXME'` in the diff → flag as MINOR

### 12.3 Pre-merge (CI · GitHub Actions)

- Full `pnpm typecheck` · `pnpm lint` · `pnpm test --coverage`
- Coverage thresholds (block under): `recorder` ≥ 90% · `ui` ≥ 70% · `web` ≥ 60%
- Playwright E2E suite (`pnpm test:e2e`) with `--use-fake-device-for-media-stream` + `--use-fake-ui-for-media-stream` Chromium flags
- `pnpm build`
- Lighthouse CI on `/` and `/record` with budgets above
- Sitemap + robots integrity check (parse + diff against expected routes)

### 12.4 Definition of done · 10/10

- Build · typecheck · lint · tests all green
- UI changes visually verified with Playwright MCP (`browser_snapshot` + `browser_take_screenshot`)
- Console clean (no warnings/errors during E2E)
- Docs updated by scribe (no stale `CODEBASE_MAP.md`, no stale `CLAUDE.md`)
- No "should work" claims — every behaviour has a passing test
- No regression in other modes/routes

---

## 13 · Testing strategy

| Layer       | Tool                                   | Scope                                                                                            | Where                            |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------- |
| Unit        | Vitest + jsdom                         | `@record-me/recorder` headless with MediaStream/MediaRecorder mocks · `@record-me/ui` primitives | `packages/*/src/**/*.test.ts(x)` |
| Integration | Vitest + jsdom + React Testing Library | `useRecorder` hook · key page components with mocked recorder                                    | `apps/web/src/**/*.test.tsx`     |
| E2E         | Playwright                             | One smoke flow per mode · Lighthouse on `/` and `/record`                                        | `apps/web/tests/e2e/**`          |
| Visual      | Playwright MCP                         | Per-task ad-hoc verification by sr-frontend / e2e                                                | (manual via /verify or /run)     |

**Mock strategy** for recorder: Vitest setup file replaces `window.MediaRecorder`, `navigator.mediaDevices.getDisplayMedia`, and `navigator.mediaDevices.getUserMedia` with controllable fakes. Each test asserts state transitions and final Blob shape.

---

## 14 · Error surface

Every error becomes a calm, editorial UI state. Never a console trace surfaced to the user.

| Failure                                              | UI response                                                                                      | Analytics                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Permission denied (screen / camera / mic)            | "We need [kind] access to record this mode" + "Try again" affordance                             | `permission_denied { kind }`                  |
| Browser missing `MediaRecorder` or `getDisplayMedia` | "Your browser doesn't support this. Try Chrome, Edge, Firefox, or Arc." + supported browser list | `browser_unsupported { feature, ua_browser }` |
| Track failure mid-recording                          | Keep what we have · "Save partial recording" + "Start over"                                      | `recording_stopped` with partial flag         |
| Memory pressure (chunk count threshold)              | Calm banner above the studio: "Recording is getting long. We recommend stopping soon."           | (logged only)                                 |
| IndexedDB write failure (long-recording mode)        | Fall back to in-memory with explicit warning toast                                               | (logged only)                                 |
| Unsupported recording cap on this device             | Cap select disables options that exceed estimated safe memory budget for the user agent          | (none)                                        |

---

## 15 · Privacy contract

Codified in `docs/SECURITY.md` and surfaced verbatim on `/privacy`:

1. **Recording bytes never leave the browser.** Encoded chunks live in JS memory or IndexedDB; the Blob is offered for direct download via an anchor element. There is no upload endpoint and no server-side recording storage.
2. **No accounts, no auth cookies.** record-me sets zero cookies for authentication or session tracking.
3. **Vercel Analytics and Speed Insights are cookieless and anonymous.** They aggregate page views and Core Web Vitals; they do not identify users or store PII.
4. **Custom analytics events carry no PII.** Only mode, duration, bytes, mime type, and error kind are tracked.
5. **IndexedDB stores are wiped on `stop()` / `dispose()` and on the next session start.** No recording artifacts persist between sessions.
6. **CSP headers via `next.config.ts`** block third-party scripts beyond Vercel itself. No analytics scripts from other providers, no ad networks, no trackers.

---

## 16 · v2 hooks

Where v2 features plug in without rewriting v1:

| v2 feature                                           | v1 hook point                                                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Filters · AR backgrounds · blur · custom backgrounds | `packages/recorder` composites in canvas. Insert a `FilterPipeline` step between source draw and PiP overlay. Pipeline contract: `(ImageData) => ImageData`. |
| Cropping / post-recording editor                     | New `apps/web/src/app/record/edit/page.tsx` route + new `@record-me/editor` package. Re-encode via ffmpeg.wasm.                                              |
| Cursor highlights for any captured surface           | Companion Chrome extension at `apps/extension`. Coordinates fed back via `chrome.runtime` messaging.                                                         |
| Cloud share links                                    | New `apps/web/src/app/api/share/route.ts` + Vercel Blob (24h expiry cron via `vercel.ts`).                                                                   |
| User accounts + recording history                    | Clerk (Vercel Marketplace) at the layout boundary; existing routes unaffected.                                                                               |
| OffscreenCanvas/Worker compositing                   | Move canvas + render loop into a Web Worker; recorder package surface unchanged.                                                                             |
| Mobile                                               | Mode C (camera only) works on mobile out of the box; Mode A/B require platform helpers — out of v2 scope.                                                    |

---

## 17 · Open risks

| Risk                                                                                            | Mitigation                                                                                                                                         |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| MP4 via MediaRecorder is recent — older Chromium / Firefox versions silently fall back to WebM  | Document in `/docs/codecs`; track `mime_type` in `recording_downloaded` event to see real distribution                                             |
| IndexedDB write performance varies by device — long recordings on low-spec machines may stutter | Cap option disables values that exceed safe estimated budget; live memory indicator gives user a heads-up                                          |
| Safari `getDisplayMedia` UX differs from Chromium                                               | `probeCapabilities()` surfaces this; `/docs/safari` page documents known differences                                                               |
| Landing-page motion budget vs. CWV target                                                       | Motion only via transform/opacity; LCP element renders without waiting on JS; `motion` bundle stays < 50 KB gzip; Lighthouse CI blocks regressions |
| Agent self-edits to `.claude/agents/*.md` could regress quality if unreviewed                   | Principal reviews every self-edit before merge; `/agent-distill` runs principal-supervised                                                         |

---

## 18 · Definition of v1 done

- [ ] All three recording modes work end-to-end in Chrome and Firefox latest.
- [ ] Cap selector wired with warning above 10 min; IndexedDB spill verified at 60 min on a reference machine.
- [ ] MP4-first codec negotiation verified; fallback to WebM exercised in Firefox stable.
- [ ] Cursor highlights work for in-tab clicks (Mode A & B); UI carries the honest-scope note.
- [ ] All eight routes ship with metadata, OG images, JSON-LD; sitemap and robots correct.
- [ ] Landing page polished per § 8.7 with motion, signature moments, View Transitions on outbound links.
- [ ] Lighthouse ≥ 95 on `/`, ≥ 90 on `/record`; Speed Insights live; budgets enforced in CI.
- [ ] Vercel Analytics + custom events firing; PII rules in § 10 verified.
- [ ] `/privacy` reads as written; CSP headers block third-party scripts.
- [ ] All six agents present at `.claude/agents/`; team blueprint at `.claude/teams/record-me-shipping.md`; `/spawn-record-me-team` runs against a real plan.
- [ ] `.claude/memory/` seeded with one entry per agent; `team-knowledge.md` carries v1 baseline notes.
- [ ] `docs/` carries: ARCHITECTURE, DESIGN, FRONTEND, RECORDING, SEO, SECURITY, TESTING, CODE_STYLE, COMMANDS, QUALITY_GATES, QUALITY_STANDARD, WORKFLOW, PROGRESS, CODEBASE_MAP, AGENT_JOURNAL.
- [ ] `CLAUDE.md` and `AGENTS.md` are identical and complete (mirror pattern).
- [ ] PR template + commit conventions documented; squash-merge only.
- [ ] Deployed to Vercel with custom domain; preview deployments enabled on every PR.
- [ ] **GitHub repository** created at `github.com/<owner>/record-me` (public, MIT) and linked as `origin`; initial commit pushed; GitHub About description set per § 19.
- [ ] **README.md** at repository root complete per § 19.2.
- [ ] **LICENSE** file (MIT) at repository root.
- [ ] OG hero static asset generated and committed at `apps/web/public/og/hero.png` (or README falls back to live OG endpoint).
- [ ] Repository topics seeded per § 19.5.

---

## 19 · Repository bootstrap

### 19.1 GitHub repository

**Decision:** public · MIT licensed · personal account.

Implementation steps (owned by `record-me-staff` in the bootstrap plan):

1. Resolve the GitHub login: `gh auth status` then `gh api user --jq .login`.
2. Create the repository:
   ```bash
   gh repo create <owner>/record-me \
     --public \
     --description "An editorial, browser-native recorder. Screen · camera · cursor. No accounts, no upload, free forever." \
     --homepage "https://record-me.app" \
     --license MIT
   ```
   _(Substitute the actual homepage once the Vercel domain is decided. If MIT LICENSE was already committed locally, omit `--license MIT` to avoid the conflict.)_
3. Link as origin and push:
   ```bash
   git remote add origin git@github.com:<owner>/record-me.git
   git push -u origin main
   ```
4. Enable repository settings:
   - **Default branch:** `main`
   - **Branch protection on `main`:** require PRs, require status checks (typecheck, lint, test, e2e, build, lighthouse), squash-merge only, no force-push.
   - **Discussions:** off (v1).
   - **Issues:** on (with `bug`, `feature`, `chore`, `docs` labels seeded).
   - **Secrets:** seed `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` for CI.

### 19.2 README.md (repository root)

**Tone match:** the README echoes the editorial-premium voice of the product itself. Short, considered, restrained. No emoji walls. No badge soup at the top. One hero image, then crisp sections.

**Required structure** (sr-frontend authors, principal reviews; lives at `/README.md`):

````markdown
# record me

> An editorial recording instrument that lives in your browser.

[![Live](https://img.shields.io/badge/live-record--me.app-E5A24A?style=flat-square)](https://record-me.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-EDE6D6?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-0F1115?style=flat-square)](https://nextjs.org)
[![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-0F1115?style=flat-square)](https://vercel.com)

<!-- Hero preview · 1200×630 PNG · generated during build from /opengraph-image.tsx -->

![record me — the studio](./apps/web/public/og/hero.png)

<!-- If the static file isn't present at README render time, swap to a `next/image` of the live OG endpoint -->

A quietly editorial screen recorder for the web. Press record, capture your screen,
your camera, and your cursor — render a polished clip in the browser. No accounts,
no upload, no compromise on craft.

## Three modes

- **Screen + Camera + Cursor** — the full recital. Picture-in-picture camera, click highlights.
- **Screen + Cursor** — just the work. Clean walk-throughs and demos.
- **Camera only** — talking-head async updates, round-framed and centered.

## Principles

- **Privacy as a feature, not a footnote.** Recording bytes never leave your browser.
  Cookieless analytics. No accounts.
- **Editorial over generic.** Twilight palette, Instrument Serif headlines, Geist body,
  Geist Mono for the technical bits. The studio is composed like a piece of furniture.
- **Web-native.** Built on Next.js 15 App Router, deployed to Vercel. MediaRecorder +
  canvas compositing on the main thread. Zero install.

## Quick start

```bash
pnpm install
pnpm dev          # opens http://localhost:3000
pnpm test         # vitest
pnpm test:e2e     # playwright
pnpm build        # production build
```
````

## Project structure

```
record-me/
├── apps/web                  # Next.js 15 App Router · the deployed surface
├── packages/recorder         # @record-me/recorder · framework-agnostic recording engine
├── packages/ui               # @record-me/ui · shadcn + Twilight tokens + brand primitives
├── packages/config           # @record-me/config · tsconfig · eslint · tailwind preset
├── docs/                     # Required reading — architecture, design, recording, security, …
└── .claude/                  # Agent harness — agents, commands, teams, memory, journal
```

Full architecture in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Design system in [`docs/DESIGN.md`](docs/DESIGN.md).
Recording pipeline in [`docs/RECORDING.md`](docs/RECORDING.md).
Privacy contract in [`docs/SECURITY.md`](docs/SECURITY.md).

## Contributing

This project ships through a six-member multi-agent team — spawn it with
[`/spawn-record-me-team`](.claude/commands/spawn-record-me-team.md) against a plan
written by `superpowers:writing-plans`. Human PRs welcome; please read
[`docs/WORKFLOW.md`](docs/WORKFLOW.md) and [`docs/CODE_STYLE.md`](docs/CODE_STYLE.md)
before opening one.

## License

MIT — see [LICENSE](LICENSE).

---

Built in the open. Composed in Brooklyn &amp; Manila. Printed by Vercel.

```

### 19.3 GitHub About description

The one-liner shown next to the repo name on `github.com/<owner>/record-me`. Max ~150 characters; mobile clamps to ~60 visible. Three candidates — the bootstrap plan picks one (recommended first):

1. **(Recommended)** *An editorial, browser-native recorder. Screen · camera · cursor. No accounts, no upload, free forever.* — clear, brand-true, scannable.
2. *Press record. Get a beautifully cut clip. A quietly editorial screen recorder for the web.* — leads with the hero copy; warmer.
3. *Web-native screen + camera + cursor recorder. Privacy-first, MIT-licensed, no install.* — most utilitarian; best for SEO of the repo page itself.

### 19.4 LICENSE

MIT, full text at repo root. `<year>` = 2026; `<copyright holder>` = "Carlo Miguel Dy".

### 19.5 Topics (GitHub repo metadata)

Tag the repo with: `screen-recorder`, `video-recording`, `nextjs`, `vercel`, `react`, `typescript`, `tailwindcss`, `mediarecorder`, `web-app`, `privacy`, `open-source`. Improves discoverability without polluting the README.

---

## 20 · References

- Brainstorm artifacts: `.superpowers/brainstorm/48274-1779894063/content/`
  - `welcome.html` — brief recap
  - `palette-options.html` — color direction selection
  - `typography-options.html` — typography pairing selection
  - `preview-hifi-pairing-a.html` — **visual baseline mockup** (the editorial premium dark execution)
  - `design-1-architecture.html` — monorepo + harness diagram
  - `design-1b-self-improving-harness.html` — Read → Act → Reflect cycle
  - `design-2-recording-pipeline.html` — five-stage pipeline + per-mode tracks + cursor-highlight callout + recorder API
  - `design-3-pages-seo.html` — route tree + per-route cards + SEO checklist
  - `design-4-system-team-quality.html` — tokens + team + gates + privacy + v2 hooks
- MesaGo reference (pattern source): `~/personal/food-delivery-app/.claude/`
- Superpowers `writing-plans` skill — next step after spec sign-off
```
