# Phase 2 · Design System & Brand Primitives — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. When spawned by `/spawn-record-me-team` the dispatch loop handles task routing and review gates automatically.

**Goal:** Land the Twilight design system in `@record-me/ui`: full token set canonicalised in `tokens.css`, `next/font` wiring for Instrument Serif + Geist + Geist Mono, shadcn `Button` ported as the baseline interactive primitive, and the five brand primitives (`<RecDot>`, `<WordMark>`, `<MetaChip>`, `<ModeCard>`, `<StudioShell>`) shipped with unit tests and a Playwright-MCP-verified `/dev/primitives` showcase.

**Architecture:** One canonical token source (`packages/ui/src/tokens.css` — raw `:root { --bg: ... }` per spec § 9.1) referenced by Tailwind v4's `@theme` block (`packages/config/tailwind/theme.css`), which generates both utility classes (`bg-bg`, `text-ivory`) and reactive theme variables. Brand primitives live in `packages/ui/src/components/`, are React Server Components by default, use CVA for variants and `cn()` for class merging, and re-export through `packages/ui/src/index.ts`. Visual verification ships as a dev-only `/dev/primitives` route guarded by `NODE_ENV !== 'production'`.

**Tech Stack:** Tailwind v4 (`@theme`), CVA (`class-variance-authority`), `clsx + tailwind-merge` (via `cn()`), Radix `@radix-ui/react-slot` (for shadcn Button `asChild`), `lucide-react` (icon set), `next/font/google` (Instrument Serif + Geist + Geist Mono), Vitest + `@testing-library/react` + jsdom for unit tests, Playwright MCP for ad-hoc visual verification.

**Issue:** Closes phase-2 epic [#2](https://github.com/carlomigueldy/record-me/issues/2). Per-task issues are created by the staff agent during dispatch.

**Conventional commits:** Use `feat(ui):`, `feat(web):`, `chore(deps):`, `docs:`, `test(ui):`, `style:` as appropriate. No LLM attribution footers — per root `CLAUDE.md` git conventions.

**Branching:** Single feature branch `phase-2-design-system` off `main`. Per-task commits, squash-merge at the end via `/pr`.

---

## File Structure

### Created

| Path                                              | Owner       | Purpose                                                                           |
| ------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `packages/ui/src/lib/cn.ts`                       | sr-frontend | `cn()` helper — `clsx + tailwind-merge`                                           |
| `packages/ui/src/lib/cn.test.ts`                  | sr-frontend | unit tests for `cn()`                                                             |
| `packages/ui/src/components/Button.tsx`           | sr-frontend | shadcn Button (CVA variants: `primary`/`secondary`/`ghost`, sizes `sm`/`md`/`lg`) |
| `packages/ui/src/components/Button.test.tsx`      | sr-frontend | unit tests for Button                                                             |
| `packages/ui/src/components/WordMark.tsx`         | sr-frontend | "record _me_" wordmark, Instrument Serif italic                                   |
| `packages/ui/src/components/WordMark.test.tsx`    | sr-frontend | unit tests for WordMark                                                           |
| `packages/ui/src/components/MetaChip.tsx`         | sr-frontend | mono uppercase pill, tone variants                                                |
| `packages/ui/src/components/MetaChip.test.tsx`    | sr-frontend | unit tests for MetaChip                                                           |
| `packages/ui/src/components/RecDot.tsx`           | sr-frontend | pulsing amber indicator with halo                                                 |
| `packages/ui/src/components/RecDot.test.tsx`      | sr-frontend | unit tests for RecDot                                                             |
| `packages/ui/src/components/ModeCard.tsx`         | sr-frontend | triptych card (label, title, description, stage slot)                             |
| `packages/ui/src/components/ModeCard.test.tsx`    | sr-frontend | unit tests for ModeCard                                                           |
| `packages/ui/src/components/StudioShell.tsx`      | sr-frontend | framed shell wrapping a recording surface                                         |
| `packages/ui/src/components/StudioShell.test.tsx` | sr-frontend | unit tests for StudioShell                                                        |
| `packages/ui/vitest.config.ts`                    | sr-frontend | Vitest config for `@record-me/ui` (jsdom + RTL)                                   |
| `packages/ui/src/test/setup.ts`                   | sr-frontend | jest-dom matcher registration                                                     |
| `apps/web/src/app/dev/primitives/page.tsx`        | sr-frontend | visual showcase, dev-only                                                         |
| `apps/web/src/app/dev/layout.tsx`                 | sr-frontend | 404 in production for any `/dev/*` route                                          |

### Modified

| Path                                 | Change                                                                                                                                                                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/ui/src/tokens.css`         | Replace 3-var placeholder with the full Twilight token set per spec § 9.1 (raw `:root { --bg: ... }` definitions, spec naming)                                                                                                                                                 |
| `packages/config/tailwind/theme.css` | Re-author `@theme` block to reference `var(--bg)` etc. from `tokens.css` (single source of truth) — no hex literals here                                                                                                                                                       |
| `packages/ui/src/index.ts`           | Re-export `cn`, `Button`, `WordMark`, `MetaChip`, `RecDot`, `ModeCard`, `StudioShell`                                                                                                                                                                                          |
| `packages/ui/package.json`           | Add deps: `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot`, `lucide-react`. Add devDeps: `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`, `jsdom`. Add `test` script (already present), `typecheck` already present. |
| `apps/web/src/app/layout.tsx`        | Wire `next/font/google` for Instrument Serif, Geist, Geist Mono; expose CSS vars on `<html>`; remove the `<body>` inline style now that `globals.css` carries it                                                                                                               |
| `apps/web/src/app/page.tsx`          | Replace inline-styled scaffold with `<WordMark>` + `<MetaChip>` + Tailwind classes — proves tokens, fonts, primitives are wired end-to-end                                                                                                                                     |
| `apps/web/tests/e2e/smoke.spec.ts`   | Retarget the assertion from `getByRole('heading', { name: 'record me' })` (no longer exists — `<h1>` removed) to `getByLabelText('record me')` (WordMark's `aria-label`)                                                                                                       |
| `apps/web/src/app/globals.css`       | Reorder imports (tokens before theme); use `var(--bg)` / `var(--ivory)` (spec names) instead of `var(--color-bg)`                                                                                                                                                              |
| `apps/web/package.json`              | No new deps — `next/font` is built into Next 15                                                                                                                                                                                                                                |
| `docs/DESIGN.md`                     | Replace the "Phase 2" stub with the shipped reality: tokens table updated, brand primitives marked shipped with file paths and prop shapes                                                                                                                                     |
| `docs/FRONTEND.md`                   | Add `/dev/primitives` route entry + component inventory for `@record-me/ui` exports                                                                                                                                                                                            |
| `docs/PROGRESS.md`                   | Tick every Phase 2 milestone, link this plan and the merged PR                                                                                                                                                                                                                 |
| `docs/CODEBASE_MAP.md`               | Insert new `packages/ui/src/components/**` + `packages/ui/src/lib/**` entries under sr-frontend ownership                                                                                                                                                                      |

### Deleted

| Path                                 | Reason                                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/config/tailwind/preset.ts` | Tailwind v4 has no JS preset concept; `theme.css` is the preset. Vestigial Phase-1 file. Remove the export from `packages/config/package.json` too. |

---

## Section A · Token & Theme Consolidation

### Task A1: Populate `tokens.css` with the full Twilight token set

**Files:**

- Modify: `packages/ui/src/tokens.css`

- [ ] **Step 1: Replace the placeholder file**

```css
/*
 * @record-me/ui · Twilight design tokens
 * Canonical source for the design system per
 * docs/superpowers/specs/2026-05-27-record-me-design.md § 9.1
 *
 * Naming convention is spec-faithful: --bg, --ivory, --amber, etc.
 * Tailwind utility names (bg-bg, text-ivory) are wired by
 * @record-me/config/tailwind/theme.css which references these vars
 * via @theme { --color-bg: var(--bg); ... }
 */

:root {
  /* Surface */
  --bg: #0f1115;
  --bg-2: #12151b;
  --surface: #171b22;
  --surface-2: #1f242c;
  --line: #262c36;
  --line-soft: #1b2028;

  /* Ink */
  --ivory: #ede6d6;
  --ivory-dim: #b5afa2;
  --ivory-mut: #7a766d;
  --ivory-low: #54514a;

  /* Signal & state */
  --amber: #e5a24a;
  --amber-hi: #f1b768;
  --amber-lo: #c88a38;
  --success: #9bb28f;
  --danger: #c8675a;
}
```

- [ ] **Step 2: Verify it parses**

Run: `cd /Users/carlomigueldy/personal/record-me && pnpm --filter @record-me/web build`
Expected: build succeeds (CSS imports validate at build time). If it fails on missing var references, that is fine for this task — Task A2 fixes the theme.css consumer.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/tokens.css
git commit -m "feat(ui): populate twilight tokens.css with full token set"
```

---

### Task A2: Refactor `theme.css` to reference `tokens.css` via `var()`

**Files:**

- Modify: `packages/config/tailwind/theme.css`
- Delete: `packages/config/tailwind/preset.ts`
- Modify: `packages/config/package.json` (remove the `./tailwind/preset` export)

- [ ] **Step 1: Rewrite `theme.css`**

```css
/*
 * @record-me/config · Tailwind v4 theme tokens
 * Maps the Twilight palette + Pairing A typography into Tailwind theme variables.
 * Single source of truth lives in @record-me/ui/tokens.css; this file references
 * those vars via var(...) so we never duplicate hex values.
 * Consumed by apps/web/src/app/globals.css. Full token list in spec § 9.1.
 */

@theme {
  /* Surface */
  --color-bg: var(--bg);
  --color-bg-2: var(--bg-2);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-line: var(--line);
  --color-line-soft: var(--line-soft);

  /* Ink */
  --color-ivory: var(--ivory);
  --color-ivory-dim: var(--ivory-dim);
  --color-ivory-mut: var(--ivory-mut);
  --color-ivory-low: var(--ivory-low);

  /* Signal & state */
  --color-amber: var(--amber);
  --color-amber-hi: var(--amber-hi);
  --color-amber-lo: var(--amber-lo);
  --color-success: var(--success);
  --color-danger: var(--danger);

  /* Typography (next/font assigns the actual families via CSS vars on <html>) */
  --font-serif: var(--font-instrument-serif), 'Iowan Old Style', Georgia, serif;
  --font-sans: var(--font-geist), -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace;
}
```

- [ ] **Step 2: Delete the vestigial preset.ts**

Run: `rm /Users/carlomigueldy/personal/record-me/packages/config/tailwind/preset.ts`

- [ ] **Step 3: Remove the preset export from `packages/config/package.json`**

Find the `exports` block and delete the `"./tailwind/preset": "./tailwind/preset.ts"` line. Leave the `"./tailwind/theme.css"` export intact.

Final `exports` block:

```json
"exports": {
  "./tsconfig/base.json": "./tsconfig/base.json",
  "./tsconfig/next.json": "./tsconfig/next.json",
  "./tsconfig/package.json": "./tsconfig/package.json",
  "./eslint": "./eslint/index.js",
  "./prettier": "./prettier/index.js",
  "./tailwind/theme.css": "./tailwind/theme.css"
}
```

- [ ] **Step 4: Update `apps/web/src/app/globals.css` import order**

Replace the file contents with:

```css
@import '@record-me/ui/tokens.css';
@import 'tailwindcss';
@import '@record-me/config/tailwind/theme.css';

html,
body {
  background: var(--bg);
  color: var(--ivory);
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}
```

Order: tokens first (so `--bg` exists when theme.css evaluates `var(--bg)`), then Tailwind, then theme.css. The body styles now use spec-named vars (`--bg`, `--ivory`).

- [ ] **Step 5: Verify the web app still builds**

Run: `pnpm --filter @record-me/web build`
Expected: build succeeds. The home page renders with the Twilight background (it already used `var(--color-bg)` and `var(--color-ivory)`, both of which still resolve to the same hex via the new `var(--bg)` chain).

- [ ] **Step 6: Commit**

```bash
git add packages/config/tailwind/theme.css packages/config/tailwind/preset.ts packages/config/package.json apps/web/src/app/globals.css
git commit -m "refactor(config): single-source tokens via tokens.css; drop vestigial preset.ts"
```

---

## Section B · Typography wiring

### Task B1: Wire `next/font` for Instrument Serif, Geist, Geist Mono

**Files:**

- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Rewrite `layout.tsx`**

```tsx
import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'record me — record your screen, beautifully',
  description:
    'An editorial browser screen recorder. Screen, camera, cursor. No accounts. No upload. Free.',
};

export const viewport: Viewport = {
  themeColor: '#0F1115',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body className="font-sans">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify font load**

Run: `pnpm --filter @record-me/web dev`
Open `http://localhost:3000` in a browser (Playwright MCP recommended — `browser_navigate` then `browser_take_screenshot`). Confirm headings would render in serif when applied (the placeholder home page still shows Georgia; Task C-onwards swaps it). Inspect computed styles on `<html>` — the three CSS variables should be set to font family stacks ending in `__Instrument_Serif_...`, `__Geist_...`, `__Geist_Mono_...`.

Run the type/lint gate:

```bash
pnpm --filter @record-me/web typecheck
pnpm --filter @record-me/web lint
```

Expected: green.

Stop the dev server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(web): wire next/font for instrument serif, geist, geist mono"
```

---

## Section C · UI deps, `cn()`, and Vitest setup

### Task C1: Install design-system runtime + test dependencies in `@record-me/ui`

**Files:**

- Modify: `packages/ui/package.json`

- [ ] **Step 1: Add new dependencies**

Run, from repo root:

```bash
pnpm --filter @record-me/ui add \
  class-variance-authority \
  clsx \
  tailwind-merge \
  @radix-ui/react-slot \
  lucide-react

pnpm --filter @record-me/ui add -D \
  @testing-library/react \
  @testing-library/jest-dom \
  @vitejs/plugin-react \
  @vitest/coverage-v8 \
  jsdom
```

- [ ] **Step 2: Confirm the resulting `package.json`**

After the install, `packages/ui/package.json` `dependencies` should include:

- `@radix-ui/react-slot`
- `@record-me/config: workspace:*` (already present)
- `class-variance-authority`
- `clsx`
- `lucide-react`
- `tailwind-merge`

`devDependencies` should add:

- `@testing-library/jest-dom`
- `@testing-library/react`
- `@vitejs/plugin-react`
- `@vitest/coverage-v8`
- `jsdom`

Also swap the `test` script to enable coverage (spec § 12.3 sets ui ≥ 70%):

```json
"scripts": {
  "build": "echo 'no-op (consumed as source)'",
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "lint": "eslint .",
  "test": "vitest run --coverage --passWithNoTests",
  "clean": "rm -rf .turbo dist coverage"
}
```

Versions: accept whatever pnpm resolves (latest at install time). The lockfile will pin them.

- [ ] **Step 3: Verify install**

Run: `pnpm install` (idempotent re-resolve)
Expected: no errors. `pnpm-lock.yaml` updated.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/package.json pnpm-lock.yaml
git commit -m "chore(ui): add cva, clsx, tailwind-merge, radix slot, lucide, RTL/jsdom for vitest"
```

---

### Task C2: Vitest config + jest-dom setup for `@record-me/ui`

**Files:**

- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/src/test/setup.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.turbo'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/index.ts', 'src/tokens.css'],
      thresholds: {
        // Spec § 12.3 — ui ≥ 70%
        lines: 70,
        statements: 70,
        branches: 70,
        functions: 70,
      },
    },
  },
});
```

- [ ] **Step 2: Write `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Verify Vitest boots with zero tests (bypass coverage threshold)**

The `test` script now includes `--coverage`, and the config sets a 70% threshold. With zero tests, that threshold would block. For this one bootstrap check, run vitest directly without coverage:

```bash
pnpm --filter @record-me/ui exec vitest run --passWithNoTests
```

Expected: "no test files found" message, exits 0. From Task C3 onwards, use the normal `pnpm --filter @record-me/ui test` — by then there are tests and coverage clears 70% easily for `cn.ts` (every line exercised).

- [ ] **Step 4: Commit**

```bash
git add packages/ui/vitest.config.ts packages/ui/src/test/setup.ts
git commit -m "test(ui): bootstrap vitest with jsdom + RTL"
```

---

### Task C3: `cn()` helper with tests

**Files:**

- Create: `packages/ui/src/lib/cn.ts`
- Create: `packages/ui/src/lib/cn.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/ui/src/lib/cn.test.ts
import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins multiple class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('resolves conflicting tailwind classes (later wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-ivory', 'text-amber')).toBe('text-amber');
  });

  it('accepts conditional objects (clsx semantics)', () => {
    expect(cn('a', { b: true, c: false }, ['d'])).toBe('a b d');
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm --filter @record-me/ui test`
Expected: FAIL with "Failed to resolve import './cn'" (or equivalent).

- [ ] **Step 3: Implement `cn`**

```ts
// packages/ui/src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `pnpm --filter @record-me/ui test`
Expected: 4 tests pass.

- [ ] **Step 5: Re-export from the package surface**

Modify `packages/ui/src/index.ts`:

```ts
// @record-me/ui · public surface
export { cn } from './lib/cn';
```

(The old `UI_PACKAGE_VERSION` export and its comment can be deleted — it was a Phase-1 marker.)

- [ ] **Step 6: Typecheck the package**

Run: `pnpm --filter @record-me/ui typecheck`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/lib/cn.ts packages/ui/src/lib/cn.test.ts packages/ui/src/index.ts
git commit -m "feat(ui): add cn() helper (clsx + tailwind-merge) with tests"
```

---

## Section D · shadcn Button (baseline interactive primitive)

### Task D1: Port shadcn Button via CVA with the Twilight palette

**Files:**

- Create: `packages/ui/src/components/Button.tsx`
- Create: `packages/ui/src/components/Button.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/ui/src/components/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders a button with the children text', () => {
    render(<Button>Start recording</Button>);
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
  });

  it('applies the primary variant by default (amber background)', () => {
    render(<Button>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button.className).toMatch(/bg-amber\b/);
    expect(button.className).not.toMatch(/bg-surface\b/);
  });

  it('applies the secondary variant when requested', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const button = screen.getByRole('button', { name: 'Cancel' });
    expect(button.className).toMatch(/bg-surface\b/);
  });

  it('applies the ghost variant when requested', () => {
    render(<Button variant="ghost">Discard</Button>);
    const button = screen.getByRole('button', { name: 'Discard' });
    expect(button.className).toMatch(/text-ivory-dim/);
  });

  it('forwards arbitrary className through cn() (later wins)', () => {
    render(<Button className="px-12">Wide</Button>);
    const button = screen.getByRole('button', { name: 'Wide' });
    expect(button.className).toMatch(/px-12/);
    expect(button.className).not.toMatch(/px-4 px-12/); // tailwind-merge collapses conflicts
  });

  it('renders as a Slot when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/record">Studio</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Studio' });
    expect(link).toHaveAttribute('href', '/record');
    expect(link.tagName).toBe('A');
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm --filter @record-me/ui test`
Expected: FAIL with "Failed to resolve import './Button'".

- [ ] **Step 3: Implement Button**

```tsx
// packages/ui/src/components/Button.tsx
'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'text-sm font-medium font-sans',
    'transition-colors duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-amber text-bg hover:bg-amber-hi active:bg-amber-lo',
        secondary: 'bg-surface text-ivory border border-line hover:bg-surface-2 active:bg-surface',
        ghost: 'bg-transparent text-ivory-dim hover:text-ivory hover:bg-surface',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
```

- [ ] **Step 4: Re-export from `index.ts`**

```ts
// packages/ui/src/index.ts
export { cn } from './lib/cn';
export { Button, buttonVariants, type ButtonProps } from './components/Button';
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `pnpm --filter @record-me/ui test`
Expected: 6 Button tests + 4 cn tests = 10 passing.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/Button.tsx packages/ui/src/components/Button.test.tsx packages/ui/src/index.ts
git commit -m "feat(ui): port shadcn Button with twilight palette and CVA variants"
```

---

## Section E · Brand primitives

Each task in this section follows the same TDD shape: write the test (red), implement the component (green), export it from `index.ts`, commit. The order is deliberate — simplest primitives first so later ones can compose them.

### Task E1: `<WordMark>` — "record _me_" wordmark

**Files:**

- Create: `packages/ui/src/components/WordMark.tsx`
- Create: `packages/ui/src/components/WordMark.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/ui/src/components/WordMark.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordMark } from './WordMark';

describe('WordMark', () => {
  it('renders the wordmark with an accessible name', () => {
    render(<WordMark />);
    expect(screen.getByLabelText('record me')).toBeInTheDocument();
  });

  it('renders "record" in roman and "me" in italic', () => {
    render(<WordMark />);
    expect(screen.getByText('record')).toBeInTheDocument();
    const italicMe = screen.getByText('me');
    expect(italicMe.tagName).toBe('EM');
  });

  it('uses the serif typeface', () => {
    const { container } = render(<WordMark />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/font-serif/);
  });

  it('supports md (default), sm, and lg sizes', () => {
    const { container: smContainer } = render(<WordMark size="sm" />);
    expect((smContainer.firstChild as HTMLElement).className).toMatch(/text-xl/);

    const { container: mdContainer } = render(<WordMark />);
    expect((mdContainer.firstChild as HTMLElement).className).toMatch(/text-3xl/);

    const { container: lgContainer } = render(<WordMark size="lg" />);
    expect((lgContainer.firstChild as HTMLElement).className).toMatch(/text-6xl/);
  });

  it('forwards className', () => {
    const { container } = render(<WordMark className="text-amber" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/text-amber/);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm --filter @record-me/ui test`
Expected: FAIL on import.

- [ ] **Step 3: Implement WordMark**

```tsx
// packages/ui/src/components/WordMark.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const wordMarkVariants = cva('inline-flex items-baseline font-serif leading-none text-ivory', {
  variants: {
    size: {
      sm: 'text-xl',
      md: 'text-3xl',
      lg: 'text-6xl',
    },
  },
  defaultVariants: { size: 'md' },
});

export interface WordMarkProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof wordMarkVariants> {}

export const WordMark = React.forwardRef<HTMLSpanElement, WordMarkProps>(
  ({ size, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        aria-label="record me"
        className={cn(wordMarkVariants({ size }), className)}
        {...props}
      >
        <span aria-hidden="true">record&nbsp;</span>
        <em aria-hidden="true" className="italic text-amber">
          me
        </em>
      </span>
    );
  },
);
WordMark.displayName = 'WordMark';
```

Note: the `not-italic-fallback` class is intentionally absent from the theme — it is a no-op safety class to make the intent explicit. Tailwind's `italic` utility drives the italic. The amber on `me` is the spec's editorial accent.

- [ ] **Step 4: Re-export**

```ts
// packages/ui/src/index.ts
export { cn } from './lib/cn';
export { Button, buttonVariants, type ButtonProps } from './components/Button';
export { WordMark, type WordMarkProps } from './components/WordMark';
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `pnpm --filter @record-me/ui test`
Expected: cn (4) + Button (6) + WordMark (5) = 15 passing.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/WordMark.tsx packages/ui/src/components/WordMark.test.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add WordMark — 'record me' with italic amber accent on 'me'"
```

---

### Task E2: `<MetaChip>` — mono uppercase metadata pill

**Files:**

- Create: `packages/ui/src/components/MetaChip.tsx`
- Create: `packages/ui/src/components/MetaChip.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/ui/src/components/MetaChip.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetaChip } from './MetaChip';

describe('MetaChip', () => {
  it('renders children inside a span', () => {
    render(<MetaChip>1080p · 30fps</MetaChip>);
    expect(screen.getByText('1080p · 30fps')).toBeInTheDocument();
  });

  it('applies mono font and uppercase styling', () => {
    const { container } = render(<MetaChip>MP4</MetaChip>);
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).toMatch(/font-mono/);
    expect(chip.className).toMatch(/uppercase/);
    expect(chip.className).toMatch(/tracking-wider/);
  });

  it('defaults to the muted tone', () => {
    const { container } = render(<MetaChip>x</MetaChip>);
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).toMatch(/text-ivory-mut/);
  });

  it('supports amber, success, and danger tones', () => {
    const { container: amber } = render(<MetaChip tone="amber">REC</MetaChip>);
    expect((amber.firstChild as HTMLElement).className).toMatch(/text-amber/);

    const { container: success } = render(<MetaChip tone="success">OK</MetaChip>);
    expect((success.firstChild as HTMLElement).className).toMatch(/text-success/);

    const { container: danger } = render(<MetaChip tone="danger">ERR</MetaChip>);
    expect((danger.firstChild as HTMLElement).className).toMatch(/text-danger/);
  });

  it('forwards className', () => {
    const { container } = render(<MetaChip className="ml-2">x</MetaChip>);
    expect((container.firstChild as HTMLElement).className).toMatch(/ml-2/);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm --filter @record-me/ui test`
Expected: FAIL on import.

- [ ] **Step 3: Implement MetaChip**

```tsx
// packages/ui/src/components/MetaChip.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const metaChipVariants = cva(
  [
    'inline-flex items-center gap-1.5 px-2 py-0.5',
    'rounded-sm font-mono uppercase tracking-wider text-[10px] leading-none',
    'border border-line-soft',
  ].join(' '),
  {
    variants: {
      tone: {
        muted: 'text-ivory-mut bg-transparent',
        amber: 'text-amber bg-amber/5 border-amber/30',
        success: 'text-success bg-success/5 border-success/30',
        danger: 'text-danger bg-danger/5 border-danger/30',
      },
    },
    defaultVariants: { tone: 'muted' },
  },
);

export interface MetaChipProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof metaChipVariants> {}

export const MetaChip = React.forwardRef<HTMLSpanElement, MetaChipProps>(
  ({ tone, className, children, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(metaChipVariants({ tone }), className)} {...props}>
        {children}
      </span>
    );
  },
);
MetaChip.displayName = 'MetaChip';
```

- [ ] **Step 4: Re-export**

Append to `packages/ui/src/index.ts`:

```ts
export { MetaChip, type MetaChipProps } from './components/MetaChip';
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `pnpm --filter @record-me/ui test`
Expected: 15 (previous) + 5 (MetaChip) = 20 passing.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/MetaChip.tsx packages/ui/src/components/MetaChip.test.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add MetaChip — mono uppercase metadata pill with tone variants"
```

---

### Task E3: `<RecDot>` — pulsing amber recording indicator

**Files:**

- Create: `packages/ui/src/components/RecDot.tsx`
- Create: `packages/ui/src/components/RecDot.test.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/src/tokens.css` (add `@keyframes` for the pulse — animations live next to tokens so they're shared)

- [ ] **Step 1: Add the pulse keyframes to `tokens.css`**

Append to `packages/ui/src/tokens.css`:

```css
/*
 * Animations · brand-owned, used by RecDot and any future "live" indicators.
 * Keyframes are always declared, but components reference them via Tailwind's
 * `motion-safe:` modifier so users with `prefers-reduced-motion: reduce`
 * see a still indicator (the dot remains visible — only the motion is paused).
 */
@keyframes record-me-rec-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.92);
    opacity: 0.85;
  }
}

@keyframes record-me-rec-halo {
  0% {
    transform: scale(1);
    opacity: 0.55;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// packages/ui/src/components/RecDot.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecDot } from './RecDot';

describe('RecDot', () => {
  it('renders with role=status and an accessible label', () => {
    render(<RecDot />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-label', 'Recording');
  });

  it('uses the amber palette', () => {
    const { container } = render(<RecDot />);
    expect(container.innerHTML).toMatch(/bg-amber/);
  });

  it('renders a halo ring sibling when active (default)', () => {
    const { container } = render(<RecDot />);
    const halo = container.querySelector('[data-record-me-halo]');
    expect(halo).not.toBeNull();
  });

  it('pauses animation when active=false (data-active="false" + no motion-safe class)', () => {
    const { container } = render(<RecDot active={false} />);
    const status = container.querySelector('[role="status"]') as HTMLElement;
    expect(status.dataset.active).toBe('false');
    expect(status.className).not.toMatch(/motion-safe:animate-\[record-me-rec-pulse/);
  });

  it('opts into motion-safe pulse + halo when active (default)', () => {
    const { container } = render(<RecDot />);
    const status = container.querySelector('[role="status"]') as HTMLElement;
    expect(status.className).toMatch(/motion-safe:animate-\[record-me-rec-pulse/);
    const halo = container.querySelector('[data-record-me-halo]') as HTMLElement;
    expect(halo.className).toMatch(/motion-safe:animate-\[record-me-rec-halo/);
  });

  it('overrides aria-label when label is provided', () => {
    render(<RecDot label="Paused" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Paused');
  });

  it('supports sm / md / lg sizes', () => {
    const { container: sm } = render(<RecDot size="sm" />);
    expect((sm.firstChild as HTMLElement).className).toMatch(/h-2 w-2/);

    const { container: md } = render(<RecDot />);
    expect((md.firstChild as HTMLElement).className).toMatch(/h-3 w-3/);

    const { container: lg } = render(<RecDot size="lg" />);
    expect((lg.firstChild as HTMLElement).className).toMatch(/h-4 w-4/);
  });
});
```

- [ ] **Step 3: Run the test, confirm it fails**

Run: `pnpm --filter @record-me/ui test`
Expected: FAIL on import.

- [ ] **Step 4: Implement RecDot**

```tsx
// packages/ui/src/components/RecDot.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const recDotVariants = cva('relative inline-block rounded-full bg-amber', {
  variants: {
    size: {
      sm: 'h-2 w-2',
      md: 'h-3 w-3',
      lg: 'h-4 w-4',
    },
  },
  defaultVariants: { size: 'md' },
});

// Tailwind arbitrary-animation values (spaces → underscores). The `motion-safe:`
// modifier compiles to `@media (prefers-reduced-motion: no-preference)`, so users
// who opt out of motion get a still amber dot instead of a pulse.
const PULSE = 'motion-safe:animate-[record-me-rec-pulse_1.4s_ease-in-out_infinite]';
const HALO = 'motion-safe:animate-[record-me-rec-halo_1.6s_ease-out_infinite]';

export interface RecDotProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof recDotVariants> {
  active?: boolean;
  label?: string;
}

export const RecDot = React.forwardRef<HTMLSpanElement, RecDotProps>(
  ({ size, active = true, label = 'Recording', className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        role="status"
        aria-label={label}
        data-active={active}
        className={cn(recDotVariants({ size }), active && PULSE, className)}
        {...props}
      >
        <span
          data-record-me-halo
          aria-hidden="true"
          className={cn('absolute inset-0 rounded-full bg-amber', active && HALO)}
        />
      </span>
    );
  },
);
RecDot.displayName = 'RecDot';
```

- [ ] **Step 5: Re-export**

Append to `packages/ui/src/index.ts`:

```ts
export { RecDot, type RecDotProps } from './components/RecDot';
```

- [ ] **Step 6: Run the tests, confirm they pass**

Run: `pnpm --filter @record-me/ui test`
Expected: 20 (previous) + 7 (RecDot) = 27 passing.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components/RecDot.tsx packages/ui/src/components/RecDot.test.tsx packages/ui/src/tokens.css packages/ui/src/index.ts
git commit -m "feat(ui): add RecDot — pulsing amber indicator with halo, prefers-reduced-motion-safe"
```

---

### Task E4: `<ModeCard>` — triptych card with stage slot

**Files:**

- Create: `packages/ui/src/components/ModeCard.tsx`
- Create: `packages/ui/src/components/ModeCard.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/ui/src/components/ModeCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModeCard } from './ModeCard';

describe('ModeCard', () => {
  it('renders eyebrow, title, and description', () => {
    render(
      <ModeCard
        eyebrow="Mode A"
        title="Screen, camera & cursor"
        description="The full recital, with picture-in-picture camera and click highlights."
      />,
    );
    expect(screen.getByText('Mode A')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Screen, camera & cursor' })).toBeInTheDocument();
    expect(
      screen.getByText(/The full recital, with picture-in-picture camera/),
    ).toBeInTheDocument();
  });

  it('renders the stage slot when children are passed', () => {
    render(
      <ModeCard eyebrow="A" title="t" description="d">
        <div data-testid="stage">stage</div>
      </ModeCard>,
    );
    expect(screen.getByTestId('stage')).toBeInTheDocument();
  });

  it('renders a footer slot when provided', () => {
    render(
      <ModeCard
        eyebrow="A"
        title="t"
        description="d"
        footer={<a href="/features/screen-camera-cursor">Learn more</a>}
      />,
    );
    expect(screen.getByRole('link', { name: 'Learn more' })).toBeInTheDocument();
  });

  it('applies the accent ring when accent is true', () => {
    const { container } = render(<ModeCard accent eyebrow="A" title="t" description="d" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/ring-amber/);
  });

  it('uses semantic <article> as the root', () => {
    render(<ModeCard eyebrow="A" title="t" description="d" />);
    // <article> has role="article" implicitly, but RTL prefers querying by tag for landmarks
    const article = document.querySelector('article');
    expect(article).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm --filter @record-me/ui test`
Expected: FAIL on import.

- [ ] **Step 3: Implement ModeCard**

```tsx
// packages/ui/src/components/ModeCard.tsx
import * as React from 'react';
import { cn } from '../lib/cn';
import { MetaChip } from './MetaChip';

export interface ModeCardProps extends React.HTMLAttributes<HTMLElement> {
  eyebrow: string;
  title: string;
  description: string;
  footer?: React.ReactNode;
  accent?: boolean;
}

export const ModeCard = React.forwardRef<HTMLElement, ModeCardProps>(
  ({ eyebrow, title, description, footer, accent = false, className, children, ...props }, ref) => {
    return (
      <article
        ref={ref}
        className={cn(
          'group relative flex flex-col gap-6 rounded-xl border bg-surface p-6',
          'border-line transition-colors duration-200',
          accent ? 'ring-1 ring-amber/40 border-amber/30' : 'hover:border-line-soft',
          className,
        )}
        {...props}
      >
        {children ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line-soft bg-bg-2">
            {children}
          </div>
        ) : null}

        <header className="flex flex-col gap-2">
          <MetaChip tone={accent ? 'amber' : 'muted'}>{eyebrow}</MetaChip>
          <h3 className="font-serif text-2xl leading-tight text-ivory">{title}</h3>
        </header>

        <p className="text-sm leading-relaxed text-ivory-dim">{description}</p>

        {footer ? <footer className="mt-auto pt-2 text-sm">{footer}</footer> : null}
      </article>
    );
  },
);
ModeCard.displayName = 'ModeCard';
```

- [ ] **Step 4: Re-export**

Append to `packages/ui/src/index.ts`:

```ts
export { ModeCard, type ModeCardProps } from './components/ModeCard';
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `pnpm --filter @record-me/ui test`
Expected: 27 (previous) + 5 (ModeCard) = 32 passing.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/ModeCard.tsx packages/ui/src/components/ModeCard.test.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add ModeCard — triptych card with eyebrow, title, stage slot, accent variant"
```

---

### Task E5: `<StudioShell>` — framed shell for the live recording surface

**Files:**

- Create: `packages/ui/src/components/StudioShell.tsx`
- Create: `packages/ui/src/components/StudioShell.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/ui/src/components/StudioShell.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudioShell } from './StudioShell';

describe('StudioShell', () => {
  it('renders the slotted chrome (header) and stage (children)', () => {
    render(
      <StudioShell header={<span>chrome</span>}>
        <div data-testid="stage">live preview</div>
      </StudioShell>,
    );
    expect(screen.getByText('chrome')).toBeInTheDocument();
    expect(screen.getByTestId('stage')).toBeInTheDocument();
  });

  it('renders an optional footer', () => {
    render(
      <StudioShell header={<span>chrome</span>} footer={<span>00:00:00</span>}>
        <div />
      </StudioShell>,
    );
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
  });

  it('uses semantic <section> as the root with an aria-label', () => {
    render(
      <StudioShell header={<span>chrome</span>} aria-label="Recording studio">
        <div />
      </StudioShell>,
    );
    expect(screen.getByRole('region', { name: 'Recording studio' })).toBeInTheDocument();
  });

  it('uses elevated surface tokens for the frame', () => {
    const { container } = render(
      <StudioShell header={<span>chrome</span>}>
        <div />
      </StudioShell>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/bg-surface-2/);
    expect(root.className).toMatch(/border-line/);
  });

  it('forwards className', () => {
    const { container } = render(
      <StudioShell className="max-w-5xl" header={<span>chrome</span>}>
        <div />
      </StudioShell>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/max-w-5xl/);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm --filter @record-me/ui test`
Expected: FAIL on import.

- [ ] **Step 3: Implement StudioShell**

```tsx
// packages/ui/src/components/StudioShell.tsx
import * as React from 'react';
import { cn } from '../lib/cn';

export interface StudioShellProps extends React.HTMLAttributes<HTMLElement> {
  header: React.ReactNode;
  footer?: React.ReactNode;
}

export const StudioShell = React.forwardRef<HTMLElement, StudioShellProps>(
  ({ header, footer, className, children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-2xl border bg-surface-2 border-line',
          'shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_24px_64px_-24px_rgba(0,0,0,0.6)]',
          className,
        )}
        {...props}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line-soft bg-surface px-4 py-3">
          {header}
        </header>

        <div className="relative flex-1 bg-bg">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-between gap-4 border-t border-line-soft bg-surface px-4 py-3 text-xs text-ivory-mut">
            {footer}
          </footer>
        ) : null}
      </section>
    );
  },
);
StudioShell.displayName = 'StudioShell';
```

- [ ] **Step 4: Re-export**

Append to `packages/ui/src/index.ts`:

```ts
export { StudioShell, type StudioShellProps } from './components/StudioShell';
```

Final `packages/ui/src/index.ts`:

```ts
// @record-me/ui · public surface
export { cn } from './lib/cn';
export { Button, buttonVariants, type ButtonProps } from './components/Button';
export { WordMark, type WordMarkProps } from './components/WordMark';
export { MetaChip, type MetaChipProps } from './components/MetaChip';
export { RecDot, type RecDotProps } from './components/RecDot';
export { ModeCard, type ModeCardProps } from './components/ModeCard';
export { StudioShell, type StudioShellProps } from './components/StudioShell';
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `pnpm --filter @record-me/ui test`
Expected: 32 (previous) + 5 (StudioShell) = 37 passing.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/StudioShell.tsx packages/ui/src/components/StudioShell.test.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add StudioShell — framed surface with header, stage, optional footer"
```

---

## Section F · Visual verification (`/dev/primitives` + Playwright MCP)

### Task F1: Dev-only `/dev` route layout guarded by NODE_ENV

**Files:**

- Create: `apps/web/src/app/dev/layout.tsx`

- [ ] **Step 1: Write the layout**

```tsx
// apps/web/src/app/dev/layout.tsx
import { notFound } from 'next/navigation';

export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return (
    <div className="min-h-dvh bg-bg text-ivory">
      <div className="mx-auto max-w-6xl px-6 py-12">{children}</div>
    </div>
  );
}
```

This guarantees any `/dev/*` route returns a 404 on the deployed Vercel build. In development (and Playwright's local dev runs), the route renders.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/dev/layout.tsx
git commit -m "feat(web): add /dev layout that 404s in production"
```

---

### Task F2: `/dev/primitives` showcase page

**Files:**

- Create: `apps/web/src/app/dev/primitives/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// apps/web/src/app/dev/primitives/page.tsx
import { Button, MetaChip, ModeCard, RecDot, StudioShell, WordMark } from '@record-me/ui';

export default function PrimitivesShowcase() {
  return (
    <main className="flex flex-col gap-16">
      <header className="flex items-baseline justify-between">
        <h1 className="font-serif text-4xl">Brand primitives</h1>
        <MetaChip>phase 2 · /dev/primitives</MetaChip>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">WordMark</h2>
        <div className="flex items-baseline gap-8">
          <WordMark size="sm" />
          <WordMark />
          <WordMark size="lg" />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">RecDot</h2>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <RecDot size="sm" />{' '}
            <span className="font-mono text-xs text-ivory-mut">sm · active</span>
          </div>
          <div className="flex items-center gap-2">
            <RecDot /> <span className="font-mono text-xs text-ivory-mut">md · active</span>
          </div>
          <div className="flex items-center gap-2">
            <RecDot size="lg" />{' '}
            <span className="font-mono text-xs text-ivory-mut">lg · active</span>
          </div>
          <div className="flex items-center gap-2">
            <RecDot active={false} label="Paused" />{' '}
            <span className="font-mono text-xs text-ivory-mut">paused</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">MetaChip</h2>
        <div className="flex flex-wrap items-center gap-3">
          <MetaChip>1080p · 30fps</MetaChip>
          <MetaChip>mp4 · h.264</MetaChip>
          <MetaChip tone="amber">REC · 00:00:42</MetaChip>
          <MetaChip tone="success">saved</MetaChip>
          <MetaChip tone="danger">mic blocked</MetaChip>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Button</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Start recording</Button>
          <Button variant="secondary">Pick a mode</Button>
          <Button variant="ghost">Discard</Button>
          <Button size="sm">small</Button>
          <Button size="lg">large</Button>
          <Button disabled>disabled</Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">ModeCard triptych</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ModeCard
            eyebrow="Mode A"
            title="Screen, camera & cursor"
            description="The full recital. Picture-in-picture camera, click highlights."
            footer={
              <a className="text-amber hover:text-amber-hi" href="#">
                Learn more →
              </a>
            }
            accent
          >
            <div className="grid h-full place-items-center text-xs text-ivory-mut">stage A</div>
          </ModeCard>
          <ModeCard
            eyebrow="Mode B"
            title="Screen & cursor"
            description="Just the work. Clean walk-throughs and demos."
            footer={
              <a className="text-amber hover:text-amber-hi" href="#">
                Learn more →
              </a>
            }
          >
            <div className="grid h-full place-items-center text-xs text-ivory-mut">stage B</div>
          </ModeCard>
          <ModeCard
            eyebrow="Mode C"
            title="Camera only"
            description="Talking-head async updates, round-framed and centered."
            footer={
              <a className="text-amber hover:text-amber-hi" href="#">
                Learn more →
              </a>
            }
          >
            <div className="grid h-full place-items-center text-xs text-ivory-mut">stage C</div>
          </ModeCard>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">StudioShell</h2>
        <StudioShell
          aria-label="Recording studio preview"
          header={
            <>
              <div className="flex items-center gap-3">
                <RecDot />
                <MetaChip tone="amber">REC · 00:00:12</MetaChip>
              </div>
              <div className="flex items-center gap-3">
                <MetaChip>1080p · 30fps</MetaChip>
                <MetaChip>~ 4.2 MB</MetaChip>
              </div>
            </>
          }
          footer={
            <>
              <span>cap 10:00</span>
              <span>mp4 · h.264 · aac</span>
            </>
          }
        >
          <div className="grid aspect-video w-full place-items-center text-ivory-mut">
            live preview slot
          </div>
        </StudioShell>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Confirm typecheck/lint pass**

Run:

```bash
pnpm --filter @record-me/web typecheck
pnpm --filter @record-me/web lint
```

Expected: green.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/dev/primitives/page.tsx
git commit -m "feat(web): add /dev/primitives showcase for visual verification"
```

---

### Task F3: Refresh the home page to use brand primitives end-to-end

**Files:**

- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/tests/e2e/smoke.spec.ts`

> **Why both files:** The Phase-1 smoke spec asserts `page.getByRole('heading', { name: 'record me' })`. The new home page replaces the `<h1>` with `<WordMark>` (semantically a labelled `<span>`, not a heading — Phase 5 introduces a real content `<h1>`). The smoke spec must be retargeted in the same task or Playwright CI will go red.

- [ ] **Step 1: Replace the inline-styled scaffold**

```tsx
// apps/web/src/app/page.tsx
import { WordMark, MetaChip } from '@record-me/ui';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-24">
      <WordMark size="lg" />
      <p className="max-w-prose text-base leading-relaxed text-ivory-dim">
        Phase 2 scaffold. The editorial landing ships in Phase 5 per spec § 8.7. Until then, this
        page proves the design system is wired: Twilight tokens, Instrument Serif headlines, Geist
        body, Geist Mono for the technical bits.
      </p>
      <div className="flex flex-wrap gap-2">
        <MetaChip>twilight palette</MetaChip>
        <MetaChip>instrument serif</MetaChip>
        <MetaChip>geist · geist mono</MetaChip>
        <MetaChip tone="amber">phase 2 live</MetaChip>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Retarget the smoke spec to the new accessible structure**

Replace `apps/web/tests/e2e/smoke.spec.ts` with:

```ts
import { expect, test } from '@playwright/test';

test('landing page renders the wordmark and metadata chips', async ({ page }) => {
  await page.goto('/');
  // WordMark exposes its brand name via aria-label; the rendered <em> for "me"
  // is hidden from AT, so accessible name is "record me" on the wrapping span.
  await expect(page.getByLabelText('record me')).toBeVisible();
  await expect(page.getByText('phase 2 live')).toBeVisible();
  await expect(page).toHaveTitle(/record me/);
});
```

- [ ] **Step 3: Verify the page**

Run: `pnpm --filter @record-me/web dev` (background OK).
Use Playwright MCP:

```
browser_navigate { url: "http://localhost:3000" }
browser_snapshot
browser_take_screenshot
browser_console_messages
```

Confirm:

- The wordmark is rendered in Instrument Serif with italic amber "me".
- Body copy uses Geist (sans).
- MetaChips render in Geist Mono uppercase with the muted line border and amber tinted final chip.
- Console is clean (no warnings, no errors).

Stop the dev server.

- [ ] **Step 4: Run the smoke spec headless to confirm it still passes**

```bash
pnpm --filter @record-me/web test:e2e -- smoke.spec.ts
```

Expected: 1 passing. If it fails, fix the spec or page until both pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/tests/e2e/smoke.spec.ts
git commit -m "feat(web): wire brand primitives into home; retarget smoke spec to wordmark"
```

---

### Task F4: Playwright-MCP visual verification of `/dev/primitives`

**Files:** none modified — verification only.

> **Server hygiene:** dev and prod both bind port 3000. Stop one before starting the other or the second call will fail to bind. When running the dev/prod servers in the background via the Bash tool, use `run_in_background: true` and kill the returned PID (or `lsof -i :3000` then `kill`) before starting the other.

- [ ] **Step 1: Boot dev server**

Run in background: `pnpm --filter @record-me/web dev`. Wait until the dev server logs "Ready in …".

- [ ] **Step 2: Navigate and capture**

Use Playwright MCP:

```
browser_navigate { url: "http://localhost:3000/dev/primitives" }
browser_snapshot
browser_take_screenshot { filename: "phase-2-primitives.png" }
browser_console_messages
```

Verify visually:

- Each section heading is in Instrument Serif (looks like a serif, not Georgia fallback).
- `WordMark sm/md/lg` shows three sizes; "me" is italic amber in all three.
- `RecDot` shows three sizes plus a paused state; active dots have an expanding halo ring.
- `MetaChip` shows muted, amber, success, danger tones — chips are small caps, mono, with tinted backgrounds and matching borders.
- `Button` shows primary (amber), secondary (surface + line), ghost (text only), small/large sizes, and a disabled state at 50% opacity with no hover response.
- `ModeCard triptych` renders three cards side-by-side on md+ with Mode A carrying the amber accent ring; each has eyebrow chip, serif title, body copy, and "Learn more →" link.
- `StudioShell` shows a framed surface with REC dot + amber timer in the header, mono metadata in the right header slot, a dark stage slot in the body, and footer text in mono ivory-mut.

Console must be empty — no React warnings, no Tailwind warnings, no font-loading errors.

- [ ] **Step 3: Stop the dev server before starting prod**

Kill the dev process. If unsure: `lsof -i :3000` → identify the next/pnpm process → `kill <pid>`. Confirm with `lsof -i :3000` returning empty.

- [ ] **Step 4: Build and start the production server**

```bash
pnpm --filter @record-me/web build
```

Then in background: `NODE_ENV=production pnpm --filter @record-me/web start`. Wait for "ready - started server on … :3000".

- [ ] **Step 5: Verify the production guard**

Navigate via Playwright MCP to `http://localhost:3000/dev/primitives` — expect a 404 page. Confirm with `browser_snapshot` (should show Next's default 404 chrome). Also confirm `http://localhost:3000/` still renders (the home page must work in prod).

- [ ] **Step 6: Stop the production server**

Kill the prod process. Confirm `lsof -i :3000` is empty.

- [ ] **Step 7: No commit — verification only**

If anything is off (clipped layouts, missing animation, console warnings, /dev/primitives accessible in prod) loop back to the relevant task before proceeding. Otherwise advance to Section G.

---

## Section G · Docs, holistic gate, PR

### Task G1: Update `docs/DESIGN.md` with shipped reality

**Files:**

- Modify: `docs/DESIGN.md`

- [ ] **Step 1: Replace the "Phase 2 placeholder" framing**

Replace the entire "Brand primitives (Phase 2)" section at the bottom with:

```markdown
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

## Visual verification

Use `/dev/primitives` (dev-only — returns 404 in production via the layout guard at
`apps/web/src/app/dev/layout.tsx`) as the showcase canvas. Verify via Playwright MCP
(`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`)
on every change to a primitive.
```

- [ ] **Step 2: Commit**

```bash
git add docs/DESIGN.md
git commit -m "docs(design): replace phase-2 stub with shipped brand primitive inventory"
```

---

### Task G2: Update `docs/FRONTEND.md` + `docs/CODEBASE_MAP.md` + `docs/PROGRESS.md`

**Files:**

- Modify: `docs/FRONTEND.md`
- Modify: `docs/CODEBASE_MAP.md`
- Modify: `docs/PROGRESS.md`

- [ ] **Step 1: Read each file first**

Before editing, read each file to understand its current shape so you can splice in the new rows correctly. The scribe agent owns these — when running under `/spawn-record-me-team` the dispatch loop routes this task to scribe automatically.

- [ ] **Step 2: `docs/FRONTEND.md` — add the `/dev/primitives` route and the `@record-me/ui` exports**

Locate the route inventory table and insert (alphabetic by path):

```markdown
| `/dev/primitives` | RSC | sr-frontend | Dev-only showcase for brand primitives. 404 in production via `/dev/layout.tsx`. |
```

Locate the component inventory table (or create one if missing) and add:

```markdown
| `<WordMark>` | `@record-me/ui` | Brand wordmark — italic amber "me" |
| `<RecDot>` | `@record-me/ui` | Pulsing amber recording indicator with halo |
| `<MetaChip>` | `@record-me/ui` | Mono uppercase metadata pill |
| `<ModeCard>` | `@record-me/ui` | Triptych card with eyebrow, serif title, stage slot |
| `<StudioShell>`| `@record-me/ui` | Framed shell for the live recording surface |
| `<Button>` | `@record-me/ui` | shadcn-style Button with Twilight CVA variants |
| `cn()` | `@record-me/ui` | clsx + tailwind-merge helper |
```

- [ ] **Step 3: `docs/CODEBASE_MAP.md` — insert sr-frontend ownership rows**

Under the sr-frontend ownership block:

```markdown
- `packages/ui/src/lib/cn.ts` — clsx + tailwind-merge helper
- `packages/ui/src/components/Button.tsx` — shadcn Button (Twilight CVA)
- `packages/ui/src/components/WordMark.tsx` — brand wordmark
- `packages/ui/src/components/MetaChip.tsx` — mono metadata pill
- `packages/ui/src/components/RecDot.tsx` — recording indicator
- `packages/ui/src/components/ModeCard.tsx` — triptych card
- `packages/ui/src/components/StudioShell.tsx` — recording surface frame
- `packages/ui/src/test/setup.ts` — jest-dom matcher setup
- `packages/ui/vitest.config.ts` — vitest jsdom + RTL
- `apps/web/src/app/dev/layout.tsx` — dev-only layout (404 in prod)
- `apps/web/src/app/dev/primitives/page.tsx` — brand primitives showcase
```

- [ ] **Step 4: `docs/PROGRESS.md` — tick every Phase 2 milestone**

Replace the Phase 2 block with:

```markdown
## Phase 2 · Design system & brand primitives · complete

Plan: `docs/superpowers/plans/2026-05-28-record-me-phase-2-design-system.md`
Epic: #2 (closed)
Completed: 2026-05-28

- [x] Tailwind v4 preset extended with full token set
- [x] shadcn/ui components installed in `@record-me/ui` (Button baseline)
- [x] Brand primitives: RecDot, ModeCard, StudioShell, MetaChip, WordMark
- [x] Unit tests for brand primitives
- [x] Storybook-free visual verification via Playwright MCP
```

Leave Phase 3+ untouched.

- [ ] **Step 5: Commit**

```bash
git add docs/FRONTEND.md docs/CODEBASE_MAP.md docs/PROGRESS.md
git commit -m "docs: mark phase 2 complete, refresh frontend + codebase map inventories"
```

---

### Task G3: Run the holistic gate

**Files:** none — gate run only.

- [ ] **Step 1: Run the full holistic check from repo root**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected: all four green. If any step fails, fix the failure in the relevant section above (loop back, don't paper over).

- [ ] **Step 2: Run E2E smoke if applicable**

```bash
pnpm test:e2e
```

The Phase 1 baseline E2E (if any) should still pass. Phase 2 doesn't introduce new E2E specs — visual verification lives in Playwright MCP, not the committed test suite.

- [ ] **Step 3: Confirm holistic gate**

If everything is green, proceed to Task G4. Otherwise stop and fix the failures.

---

### Task G4: Open the PR via `/pr`

**Files:** none — orchestration only.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin phase-2-design-system
```

- [ ] **Step 2: Invoke `/pr`**

Run the `/pr` slash command. It will:

1. Aggregate the commit history,
2. Compose a PR body that follows the record-me PR template (Summary · Changes · Test plan · Closes #2),
3. Open the PR against `main`.

- [ ] **Step 3: Verify the PR**

- PR title: `feat(phase-2): design system & brand primitives`
- PR body references plan path and `Closes #2`.
- CI green: typecheck, lint, test, build (and lhci if wired).

- [ ] **Step 4: Hand off to the principal review gate**

When dispatched via `/spawn-record-me-team`, the principal runs the `[REVIEW_RESULT] APPROVED` decision over the entire diff. Address any CRITICAL or MAJOR findings before merge.

- [ ] **Step 5: Squash-merge**

After approval, squash-merge the PR. Delete the remote branch.

- [ ] **Step 6: Close the epic checkbox**

The phase-2 epic (#2) closes automatically via the `Closes #2` footer on the squash commit. If the auto-close doesn't fire, close it manually:

```bash
gh issue close 2 --reason completed --comment "Phase 2 complete — see PR for full inventory."
```

---

## Self-review notes

**Spec coverage (§ 9):**

- § 9.1 tokens → Task A1 (full token set) + A2 (Tailwind mapping).
- § 9.2 typography (Pairing A) → Task B1 (`next/font`) + the theme.css typography vars (already in place from Phase 1; re-validated in A2).
- § 9.3 conventions (RSC default, CVA, `cn`, `forwardRef`) → enforced in every primitive task in Section E and the Button task in Section D.
- § 9.4 brand primitives → Tasks E1–E5 cover WordMark, MetaChip, RecDot, ModeCard, StudioShell. Each ships with unit tests and exports.

**Phase 2 milestone coverage (PROGRESS.md):**

- Tailwind v4 preset extended with full token set → A1 + A2.
- shadcn/ui components installed in `@record-me/ui` → D1 (Button, with CVA + Slot + lucide deps). Phase 2 ships the baseline; later phases lazy-add components when their consumer arrives.
- Brand primitives (5) → E1–E5.
- Unit tests for brand primitives → each E task is TDD; final test count ≥ 37 (cn 4 + Button 6 + WordMark 5 + MetaChip 5 + RecDot 7 + ModeCard 5 + StudioShell 5).
- Storybook-free visual verification via Playwright MCP → F1–F4.

**Type consistency check:**

- All primitives use `React.HTMLAttributes<...>` + `VariantProps<typeof xxxVariants>` where they have CVA variants. `<ModeCard>` and `<StudioShell>` have no CVA (simple variant surface) so they just take `React.HTMLAttributes<HTMLElement>` and explicit props.
- `cn` is the only utility used by every component. Imported as `import { cn } from '../lib/cn'`.
- Re-exports flow into a single `index.ts` — final inventory: `cn`, `Button`, `buttonVariants`, `ButtonProps`, `WordMark`, `WordMarkProps`, `MetaChip`, `MetaChipProps`, `RecDot`, `RecDotProps`, `ModeCard`, `ModeCardProps`, `StudioShell`, `StudioShellProps`.

**Open risks for the executor:**

- **`@record-me/web` consuming `@record-me/ui` source.** `apps/web/next.config.ts` already has `transpilePackages: ['@record-me/ui', '@record-me/recorder']`, so the source-import setup keeps working.
- **`use client` boundary.** Only Button needs it (because of `onClick` semantics). Every other primitive can stay RSC. If TypeScript complains in `apps/web/src/app/page.tsx` (RSC) when importing `Button`, the fix is to import it from a client-component leaf, not to mark page.tsx `'use client'`.
- **Animation + reduced motion.** The RecDot pulse and halo are gated by Tailwind's `motion-safe:` modifier (compiles to `@media (prefers-reduced-motion: no-preference)`). Users who opt out of motion get a still amber dot, which is the correct default for status indicators. Verify with Playwright MCP by toggling the OS reduced-motion preference (macOS: System Settings → Accessibility → Display → Reduce motion) if you want to spot-check.
- **Font loading on the home page.** `next/font/google` fetches fonts at build time (cached). Verify in Task B1 by inspecting `<html>` className — the three `--font-*` variables must resolve.
