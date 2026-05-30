# Phase 5B · Editorial Landing (`/`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **UI tasks MUST invoke `frontend-design` before writing component code** (per CLAUDE.md), using the hi-fi baseline as reference, and MUST visually verify with Playwright MCP.

**Goal:** Ship the editorial landing at `/` — the hi-fi baseline built as real React, elevated with `motion`, four signature moments, bespoke illustrations, View-Transitions infra, full reduced-motion support, and the deferred `/` JSON-LD/OG — holding Lighthouse ≥ 95.

**Architecture:** `/` is an RSC (hero headline = LCP, server-rendered); motion opts in at `'use client'` leaves, one per signature moment. Landing sections live in `app/_components/landing/`; bespoke illustrations in `components/illustrations/`; motion helpers in `lib/motion/`. Reuses `@record-me/ui` primitives and the 5A `lib/seo` module.

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, TypeScript, `motion`, Tailwind v4, CSS scroll-driven animation (`animation-timeline: view()`), Vitest + Testing Library, Playwright, `next/og`.

**Spec:** `docs/superpowers/specs/2026-05-30-record-me-phase-5b-landing-design.md`
**Visual baseline:** `.superpowers/brainstorm/48274-1779894063/content/preview-hifi-pairing-a.html`

**Corrected copy (accuracy — verified against the engine; do NOT regress to the baseline's wording):**

- Codecs: **MP4 · H.264 (AAC)**, WebM/VP9 fallback — NOT "VP9 · H.264". (spec § 7.4)
- License: **Free · MIT** / open-source — accurate (LICENSE present).
- Hero secondary CTA: **"See the three modes ↓"** anchor to `#modes` — NO fake "40-second demo".
- Colophon locale: "Composed in Manila" — drop unverified "Brooklyn".

---

## File structure

**Create:** `app/_components/landing/{LandingNav,Hero,HeroReveal,ModesSection,ModeTriptych,StudioSection,StudioSurface,FieldNotesTicker,LandingFooter}.tsx` · `components/illustrations/{ModeStageA,ModeStageB,ModeStageC,StudioSurfaceArt}.tsx` · `lib/motion/{useReducedMotion.ts,variants.ts}` · `app/opengraph-image` landing variant · `tests/e2e/landing.spec.ts` · component tests alongside.
**Modify:** `app/page.tsx` (replace placeholder) · `lib/seo/json-ld.ts` (+2 builders) · `next.config.ts` (viewTransition) · `README.md` · docs.

---

### Task 1: Install `motion` + `lib/motion` helpers

**Files:** Create `apps/web/src/lib/motion/useReducedMotion.ts`, `apps/web/src/lib/motion/variants.ts`, `apps/web/src/lib/motion/useReducedMotion.test.ts`. Modify `apps/web/package.json`.

- [ ] **Step 1: Add the dependency**

Run: `pnpm --filter @record-me/web add motion` then `pnpm install`. Expected: `motion` in `apps/web/package.json` dependencies; lockfile updated.

- [ ] **Step 2: Write the failing test**

```ts
// apps/web/src/lib/motion/useReducedMotion.test.ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePrefersReducedMotion } from './useReducedMotion';

describe('usePrefersReducedMotion', () => {
  it('returns false by default (SSR-safe)', () => {
    vi.stubGlobal(
      'matchMedia',
      vi
        .fn()
        .mockReturnValue({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
    );
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when the user prefers reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi
        .fn()
        .mockReturnValue({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
    );
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 3: Run test → fail.** `pnpm --filter @record-me/web test src/lib/motion/useReducedMotion.test.ts` → cannot find module.

- [ ] **Step 4: Implement**

```ts
// apps/web/src/lib/motion/useReducedMotion.ts
'use client';
import { useEffect, useState } from 'react';

/** SSR-safe prefers-reduced-motion hook. Defaults to false (motion allowed) until mounted. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
```

```ts
// apps/web/src/lib/motion/variants.ts
import type { Variants } from 'motion/react';

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
export const liftIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};
```

- [ ] **Step 5: Run test → pass.** Expected: 2 passed.
- [ ] **Step 6: Commit.** `git add apps/web/src/lib/motion apps/web/package.json ../../pnpm-lock.yaml && git commit -m "feat(landing): motion dep + reduced-motion hook + variants"`

---

### Task 2: `/` JSON-LD builders (SoftwareApplication + WebApplication)

**Files:** Modify `apps/web/src/lib/seo/json-ld.ts`. Add to `apps/web/src/lib/seo/json-ld.test.ts`.

- [ ] **Step 1: Write failing tests** (append to existing json-ld.test.ts)

```ts
import { softwareApplicationLd, webApplicationLd } from './json-ld';

describe('app json-ld builders', () => {
  it('softwareApplicationLd has required fields + free offer', () => {
    const ld = softwareApplicationLd();
    expect(ld['@type']).toBe('SoftwareApplication');
    expect(ld.applicationCategory).toBe('MultimediaApplication');
    expect(ld.operatingSystem).toBe('Web');
    expect((ld.offers as { price?: string }).price).toBe('0');
  });
  it('webApplicationLd has required fields', () => {
    const ld = webApplicationLd();
    expect(ld['@type']).toBe('WebApplication');
    expect(ld.browserRequirements).toMatch(/javascript/i);
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** (append to json-ld.ts)

```ts
export function softwareApplicationLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteConfig.name,
    url: siteConfig.url,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    description: siteConfig.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}
export function webApplicationLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteConfig.name,
    url: siteConfig.url,
    browserRequirements: 'Requires JavaScript and a browser with MediaRecorder support.',
  };
}
```

- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit.** `feat(seo): SoftwareApplication + WebApplication json-ld builders`

---

### Task 3: Mode-stage illustrations (A/B/C)

**Files:** Create `apps/web/src/components/illustrations/{ModeStageA,ModeStageB,ModeStageC}.tsx` + `ModeStages.test.tsx`.

- [ ] **Step 1: `frontend-design`** — invoke the `frontend-design` skill for these three bespoke "stage" preview illustrations. Reference the baseline's `.mode-a/.mode-b/.mode-c .stage` markup (screen+window+webcam+cursor; screen+grid+cursor; round camera frame). Build as presentational components (SVG/CSS), Twilight tokens only (no hex), explicit `aspect-ratio: 16/10`, ambient CSS animation (cursor ring pulse) gated behind `@media (prefers-reduced-motion: no-preference)`. No client JS, no icon packs.

- [ ] **Step 2: Component test** (smoke — renders + a11y role)

```tsx
// ModeStages.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ModeStageA } from './ModeStageA';
import { ModeStageB } from './ModeStageB';
import { ModeStageC } from './ModeStageC';
describe('mode stage illustrations', () => {
  it.each([
    ['A', ModeStageA],
    ['B', ModeStageB],
    ['C', ModeStageC],
  ] as const)('%s renders decoratively', (_n, C) => {
    const { container } = render(<C />);
    expect(container.firstChild).toBeTruthy();
    // decorative — must be aria-hidden so it isn't announced
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});
```

- [ ] **Step 3:** Implement per frontend-design output; ensure each root is `aria-hidden="true"` (decorative). Run test → pass.
- [ ] **Step 4: Visual-verify** via `/dev/primitives` or a scratch route with Playwright MCP — confirm on-brand, no console errors.
- [ ] **Step 5: Commit.** `feat(landing): bespoke mode-stage illustrations (A/B/C)`

---

### Task 4: Studio-surface illustration

**Files:** Create `apps/web/src/components/illustrations/StudioSurfaceArt.tsx` + test.

- [ ] **Step 1: `frontend-design`** — the recording-surface illustration: topbar (REC dot + label + timer slot as a prop/child), demo window, amber cursor-highlight ring, round PiP, controls row (mode chips + Stop & render). Timer value is passed in (the tick is owned by `StudioSurface` in Task 8); the art is otherwise static + ambient CSS. `aria-hidden="true"`, explicit aspect-ratio, tokens only.
- [ ] **Step 2: Smoke test** (renders; accepts a `timer` prop string and shows it).
- [ ] **Step 3:** Implement → test pass.
- [ ] **Step 4: Visual-verify** (Playwright MCP).
- [ ] **Step 5: Commit.** `feat(landing): studio-surface illustration`

---

### Task 5: `LandingNav` (RSC)

**Files:** Create `app/_components/landing/LandingNav.tsx` + test.

- [ ] **Step 1: `frontend-design`** for the masthead (mono edition left, `<WordMark>` center, anchor links right; bottom hairline). RSC, no client JS.
- [ ] **Step 2: Test** — renders WordMark + the three anchor links (`#modes`, `#studio`, `#field`) with correct hrefs.
- [ ] **Step 3:** Implement → pass.
- [ ] **Step 4: Commit.** `feat(landing): editorial masthead nav`

---

### Task 6: Hero + `HeroReveal` (signature moment 1)

**Files:** Create `app/_components/landing/Hero.tsx` (RSC), `HeroReveal.tsx` (client), `Hero.test.tsx`.

- [ ] **Step 1: `frontend-design`** for the hero (eyebrow, serif headline "Press _record._ Get a beautifully cut clip.", deck, CTA row, mono meta line, right pull-quote; film-grain + amber-glow background). RSC renders all copy/markup (headline = LCP). `HeroReveal` is a `'use client'` wrapper that animates its children with the stagger (moment 1) ONLY when motion is allowed.
- [ ] **Step 2: Failing test**

```tsx
// Hero.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from './Hero';
describe('Hero', () => {
  it('renders the LCP headline + CTAs with correct hrefs (server content, no JS gating)', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/record/i);
    expect(screen.getByRole('link', { name: /start recording/i })).toHaveAttribute(
      'href',
      '/record',
    );
    expect(screen.getByRole('link', { name: /three modes/i })).toHaveAttribute('href', '#modes');
    expect(screen.getByText(/MP4 · H\.264/)).toBeInTheDocument(); // corrected codec copy
  });
});
```

- [ ] **Step 3:** Implement. `HeroReveal` uses `staggerParent`/`fadeUp`; initial DOM state has full opacity (server) and JS adds entrance — assert the test passes WITHOUT animation (content present regardless). Run → pass.
- [ ] **Step 4: Visual-verify** (Playwright MCP) hero at 1440 + 390; confirm stagger plays, reduced-motion shows instant.
- [ ] **Step 5: Commit.** `feat(landing): hero + stagger reveal (moment 1)`

---

### Task 7: `ModesSection` + `ModeTriptych` (signature moment 2)

**Files:** Create `app/_components/landing/ModesSection.tsx` (RSC), `ModeTriptych.tsx` (client), `ModesSection.test.tsx`.

- [ ] **Step 1: `frontend-design`** — section head (§ 01 · "Three _modes._ One quiet instrument.") + the triptych. Each card: badge, serif title, blurb, the matching `ModeStage*` illustration. `ModeTriptych` is `'use client'` and lifts cards on scroll-enter (moment 2) via `whileInView` + `liftIn` (custom index), reduced-motion → static.
- [ ] **Step 2: Test** — renders all three mode titles + the three blurbs; section has `id="modes"`.
- [ ] **Step 3:** Implement → pass. Copy must be accurate (Mode A/B/C descriptions per the baseline).
- [ ] **Step 4: Visual-verify** (Playwright MCP) — cards lift on scroll; reduced-motion static.
- [ ] **Step 5: Commit.** `feat(landing): modes triptych + lift-on-enter (moment 2)`

---

### Task 8: `StudioSection` + `StudioSurface` (signature moment 3)

**Files:** Create `app/_components/landing/StudioSection.tsx` (RSC), `StudioSurface.tsx` (client), `StudioSection.test.tsx`.

- [ ] **Step 1: `frontend-design`** — section head (§ 02 · "The _studio,_ while recording.") + `StudioSurfaceArt` + the two editorial field notes (click highlights; **render specs corrected**: Container MP4 (H.264 + AAC) · Resolution 1080p · Frame rate 30/60 fps · Export download to disk). `StudioSurface` is `'use client'`: when the surface scrolls into view, start the REC pulse + tick the timer (mm:ss:ff via `requestAnimationFrame`/interval); reduced-motion → fixed timer, no pulse.
- [ ] **Step 2: Test** — renders section `id="studio"`, the field-note headings, and the corrected codec spec text (`MP4`, `H.264`); asserts NO "VP9" string.
- [ ] **Step 3:** Implement → pass.
- [ ] **Step 4: Visual-verify** (Playwright MCP) — boot-up + tick on enter; reduced-motion frozen.
- [ ] **Step 5: Commit.** `feat(landing): studio section + boot-up (moment 3)`

---

### Task 9: `FieldNotesTicker` (signature moment 4)

**Files:** Create `app/_components/landing/FieldNotesTicker.tsx` (client) + test.

- [ ] **Step 1: `frontend-design`** — the caption strip of standing claims (Recorded in browser · No accounts · Free · MIT · Built on Next.js · Tailwind v4 · Vercel) as a gentle horizontal marquee; pause on hover; `id="field"`.
- [ ] **Step 2: Test** — renders all claim strings; reduced-motion → static (no animation class / `data-reduced` flag asserted).
- [ ] **Step 3:** Implement (CSS marquee preferred; pause-on-hover; reduced-motion freezes). → pass.
- [ ] **Step 4: Commit.** `feat(landing): field-notes ticker (moment 4)`

---

### Task 10: `LandingFooter` (RSC)

**Files:** Create `app/_components/landing/LandingFooter.tsx` + test.

- [ ] **Step 1: `frontend-design`** — serif colophon ("An experiment in editorial recording. Composed in Manila, set in _Instrument Serif_ & Geist, printed by Vercel.") + mono credit; links to `/privacy`, `/changelog`.
- [ ] **Step 2: Test** — renders the `/privacy` + `/changelog` links; colophon text present.
- [ ] **Step 3:** Implement → pass.
- [ ] **Step 4: Commit.** `feat(landing): colophon footer`

---

### Task 11: Compose `/` page (RSC) — metadata + JSON-LD + sections

**Files:** Modify `apps/web/src/app/page.tsx` (replace the Phase-2 placeholder). Create `apps/web/src/app/page.test.tsx`.

- [ ] **Step 1: Failing test**

```tsx
// page.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';
describe('HomePage (landing)', () => {
  it('renders the hero, all sections, and is not the Phase-2 scaffold', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/Phase 2 scaffold/i)).toBeNull();
    expect(document.getElementById('modes')).toBeTruthy();
    expect(document.getElementById('studio')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run → fail** (still the scaffold).
- [ ] **Step 3: Implement** — `page.tsx` exports `metadata = buildMetadata({ title: \`${siteConfig.name} — ${siteConfig.tagline}\`, description: siteConfig.description, path: '/' })`(or keep root template), injects`<JsonLd data={[softwareApplicationLd(), webApplicationLd()]} />`, and composes `<LandingNav/> <Hero/> <ModesSection/> <StudioSection/> <FieldNotesTicker/> <LandingFooter/>`. Remove the Phase-2 placeholder copy.
- [ ] **Step 4: Run → pass.** Then build: `pnpm --filter @record-me/web build` → `/` compiles.
- [ ] **Step 5: Commit.** `feat(landing): compose / page — sections + SoftwareApplication json-ld`

---

### Task 12: `/` OpenGraph image (landing variant)

**Files:** Modify/confirm `apps/web/src/app/opengraph-image.tsx` (5A default) renders a landing-appropriate card (hero headline + caption). Reuse `_og/template`.

- [ ] **Step 1:** Update the default `opengraph-image.tsx` title/caption to the landing headline ("Press record. Get a beautifully cut clip." / "record your screen, beautifully"). Keep the 5A template + fonts + `outputFileTracingIncludes`.
- [ ] **Step 2: Verify** — `next build` then curl `/opengraph-image` → 200 image/png 1200×630; visual-check the card renders the serif headline.
- [ ] **Step 3: Commit.** `feat(landing): / opengraph card`

---

### Task 13: View-Transitions infrastructure

**Files:** Modify `apps/web/next.config.ts` + add crossfade CSS (global) + apply to outbound `<Link>`s that exist.

- [ ] **Step 1:** Enable Next's experimental view transitions (`experimental: { viewTransition: true }`) OR a small progressive-enhancement wrapper if the experimental API is unstable on the pinned Next version (verify against the installed version first). Add a minimal crossfade `::view-transition-old/new` CSS in globals.
- [ ] **Step 2:** Apply to the hero `Start recording` → `/record` and footer → `/privacy`/`/changelog` links. Browsers without support must navigate normally (progressive enhancement — verify no errors in unsupported path).
- [ ] **Step 3: Verify** — `pnpm dev`, navigate `/` → `/record` with Playwright MCP; confirm crossfade where supported + clean navigation otherwise; console clean.
- [ ] **Step 4: Commit.** `feat(landing): view-transitions infra for outbound links`

> If the experimental API is not viable on the pinned Next version, implement the crossfade via `document.startViewTransition` in a tiny client `<TransitionLink>` wrapper (progressive enhancement) and note the decision in the commit body. Do NOT block the slice on it — degrade to normal navigation.

---

### Task 14: E2E — landing smoke + reduced-motion

**Files:** Create `apps/web/tests/e2e/landing.spec.ts`.

- [ ] **Step 1:** Reuse `playwright.config.ts` baseURL/webServer. Write specs:
  - `/` loads 200; `<h1>` headline visible (LCP); title is the landing title.
  - `Start recording` link navigates to `/record`.
  - `#modes` anchor present; all three mode titles visible.
  - `SoftwareApplication` JSON-LD script present.
  - console has zero errors.
  - reduced-motion: with `page.emulateMedia({ reducedMotion: 'reduce' })`, the page renders all content (hero, modes, studio) — assert content present (motion must not gate content).
- [ ] **Step 2: Run** `pnpm --filter @record-me/web test:e2e landing.spec.ts` → all pass (3× for stability).
- [ ] **Step 3: Commit.** `test(landing): e2e smoke + reduced-motion`

---

### Task 15: Visual verification + README hero + docs + full gate

**Files:** Modify `README.md`, `.github/assets/readme/hero.png`, `docs/{FRONTEND,DESIGN,SEO,PROGRESS,CODEBASE_MAP}.md`.

- [ ] **Step 1: Visual-verify** (Playwright MCP) the real `/` at 1440×900 and 390×844: on-brand (Twilight, Instrument Serif, film grain), all four signature moments play, console clean, CLS not visibly shifting. Capture screenshots.
- [ ] **Step 2: README hero** — recapture `.github/assets/readme/hero.png` from the real `/` (production build, `browser_resize 1440×900`, `document.fonts.ready`, screenshot, `pngquant` ≤ 350 KB per the documented flow). Drop the "\_Preview · The landing ships in Phase 5..." line in `README.md`; re-link the caption to `apps/web/src/app/page.tsx`.
- [ ] **Step 3: Bundle budget** — confirm the motion JS added to `/` is < 50 KB gzipped (inspect `next build` route output / analyze). If over, switch scroll-driven moments to CSS `animation-timeline: view()` and tree-shake `motion` imports.
- [ ] **Step 4: Docs** — `FRONTEND.md` (set `/` row to "Phase 5B · shipped"; add landing components + illustrations + lib/motion to the inventory), `DESIGN.md` (note new illustration components if reusable), `SEO.md` (SoftwareApplication/WebApplication shipped on `/`), `PROGRESS.md` (Slice 5B complete; 5C still planned), `CODEBASE_MAP.md`.
- [ ] **Step 5: Full gate** — `pnpm -w typecheck && pnpm -w lint && pnpm -w test && pnpm --filter @record-me/web build && pnpm --filter @record-me/web test:e2e && pnpm lhci` (clean `.next` first; no competing next process — per the 5A staff note). Confirm `/` Lighthouse ≥ 95.
- [ ] **Step 6: Commit.** `docs(phase-5b): mark editorial landing shipped + README hero`

---

## Self-review notes (coverage check)

- **Spec § 4 architecture** → Tasks 1 (motion lib), 3–4 (illustrations), 5–10 (sections), 11 (page compose). ✓
- **Spec § 5.3 four moments** → Task 6 (hero stagger), 7 (cards lift), 8 (studio boots), 9 (ticker). ✓
- **Spec § 5.4 reduced motion** → built into Tasks 6–9; asserted in Task 14. ✓
- **Spec § 6 SEO/perf** → Task 2 (JSON-LD), 11 (inject), 12 (OG), 13 (View Transitions), 15 (Lighthouse + bundle budget). ✓
- **Spec § 8 testing** → component tests per task; Task 14 (e2e + reduced-motion); Task 15 (visual + lhci). ✓
- **Spec § 9 DoD** → Task 15 (README, docs, full gate). ✓
- **Copy accuracy** → MP4-first asserted in Tasks 6 & 8 tests (assert no "VP9"); MIT/colophon in Tasks 9–10. ✓
- **Type consistency:** `usePrefersReducedMotion`, `fadeUp`/`staggerParent`/`liftIn`, `softwareApplicationLd`/`webApplicationLd`, `ModeStage{A,B,C}`, `StudioSurfaceArt` used consistently. ✓
- **Deferred (not in this plan):** `/features`/`/docs` + MDX + HowTo/FAQ (5C); `/`↔`/features` crossfade (5C); landing analytics events + custom domain (Phase 6).
