# Phase 5C · MDX Content System (`/features` + `/docs`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **UI tasks MUST invoke `frontend-design` before writing component code** (per CLAUDE.md) and MUST visually verify with Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`). Each `### Task N` becomes ONE GitHub issue via `/spawn-record-me-team` and is independently shippable & reviewable.

**Goal:** Ship the **MDX content system** — three statically-generated `/features/[mode]` deep pages (`HowTo` JSON-LD + per-mode OG) and a `/docs` index + six `/docs/[...slug]` docs (`FAQPage` JSON-LD + static TOC/sidebar) — driven by one zod-validated typed content registry, with build-time MDX (no runtime eval, CSP-safe, prerendered static HTML) and Lighthouse ≥ 90 (and the global ≥ 0.95 a11y/bp/seo, CLS ≤ 0.05, LCP ≤ 1800 ms) on the new routes. Also lands the 5B-deferred `/`↔`/features` View-Transition.

**Architecture:** The **body** is compiled by first-party `@next/mdx` at build time; **everything structured** (params, metadata, sitemap, breadcrumbs, docs index/sidebar, HowTo/FAQ/Breadcrumb JSON-LD) is driven by a single zod-validated typed registry under `lib/content/`. Body renderer and registry are kept separate — `gray-matter` reads YAML frontmatter, a zod schema validates+types it, and that validated frontmatter is the **only** metadata source (MDX bodies never export `metadata`/`frontmatter` consts). All routes export `generateStaticParams()` + `export const dynamicParams = false` → prerendered static HTML, unknown slugs 404. SEO surface reuses the 5A `lib/seo` helpers — extended, never forked.

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, TypeScript, `@next/mdx` (component map via the root `mdx-components.tsx` file convention — no `@mdx-js/react`/`MDXProvider` in the App Router path), `gray-matter`, `zod`, `rehype-pretty-code` (Shiki, build-time, single dark theme), `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, Tailwind v4, `next/og`, Vitest + Testing Library, Playwright, Lighthouse CI.

**Spec:** `docs/superpowers/specs/2026-05-31-record-me-phase-5c-mdx-design.md`
**Continuity:** 5A SEO foundation (`lib/seo/*`, `sitemap.ts`, `robots.ts`) — extend, do not fork. 5B landing (`TransitionLink`, `lib/motion`, `::view-transition` CSS in `globals.css` L20-37) — lands the deferred `/`↔`/features` crossfade.

**Verified codebase facts (do NOT re-derive — confirmed at plan time):**

- `RecordMode = 'screen+cam+cursor' | 'screen+cursor' | 'cam-only'` (`packages/recorder/src/types.ts` L4). URL slugs differ → **pinned** map required.
- Production CSP: `script-src 'self' 'unsafe-inline' …` with **no** `'unsafe-eval'` (next.config.ts L29-31); `style-src 'self' 'unsafe-inline'` (L49). Build-time MDX + per-token inline `--shiki-*` vars are both CSP-safe with **no header change**.
- `dev` is `next dev --port 3000`, `build` is `next build` — both webpack, **neither passes `--turbopack`** (package.json L7,10).
- Root title template is `'%s — record me'` (layout.tsx L44). Pass **bare** title segments to `buildMetadata`.
- `_og/template.tsx` exports `ogImage({ title, caption })` + `SIZE`; OG routes declare `size`/`contentType`/`alt`, **no** `runtime` export (Node default), fonts via `fs`+`process.cwd`.
- `<JsonLd data={Ld | Ld[]} />`; `buildMetadata({ title, description, path, og? })` returns `Metadata`.
- `@record-me/ui` exports: `cn, Button, WordMark, MetaChip, RecDot, ModeCard, StudioShell`.
- Vitest discovers `src/**/*.test.{ts,tsx}`, jsdom, `@/` → `./src`; e2e excluded.

---

## File structure

**Create:**
`apps/web/src/lib/content/{schema,loader,features,registry}.ts` + `{schema,loader,registry}.test.ts` + `__fixtures__/` ·
`apps/web/src/mdx-components.tsx` + `mdx-components.test.tsx` ·
`apps/web/src/app/_components/content/{Prose,Toc,Breadcrumbs,DocsSidebar}.tsx` + `*.test.tsx` ·
`apps/web/src/app/features/layout.tsx` · `apps/web/src/app/features/[mode]/{page,opengraph-image}.tsx` + `page.test.tsx` ·
`apps/web/src/app/features/[mode]/_content/{screen-camera-cursor,screen-cursor,camera-only}.mdx` ·
`apps/web/src/app/docs/{layout,page,opengraph-image}.tsx` + `page.test.tsx` · `apps/web/src/app/docs/[...slug]/{page,opengraph-image}.tsx` + `page.test.tsx` ·
`apps/web/src/content/docs/{getting-started,permissions,codecs,safari,browser-support,troubleshooting}.mdx` ·
`apps/web/src/lib/content/doc-bodies.ts` (static `DOC_BODY` import map — mirrors `FEATURE_BODY`) ·
`apps/web/tests/e2e/content.spec.ts`

**Modify:**
`apps/web/next.config.ts` (createMDX + pageExtensions + 2 OG globs + inline no-`--turbopack` comment) ·
`apps/web/package.json` (9 deps) ·
`apps/web/src/lib/seo/json-ld.ts` (+3 builders) + `json-ld.test.ts` ·
`apps/web/src/lib/seo/metadata.ts` (+ optional `robots`) + `metadata.test.ts` ·
`apps/web/src/app/sitemap.ts` (registry-driven) + `sitemap.test.ts` ·
`apps/web/src/app/globals.css` (Shiki var selectors + code-wrapper Twilight tokens) ·
`apps/web/src/app/_components/landing/ModeTriptych.tsx` (+ "Learn more →" `TransitionLink`) + `ModeTriptych.test.tsx` ·
`lighthouserc.json` (+1 features + 1 docs url) ·
`docs/{FRONTEND,SEO,ARCHITECTURE,PROGRESS,CODEBASE_MAP}.md`.

**Naming contract (consistent across all tasks):**

- Schema/types: `FeatureFrontmatter`, `DocFrontmatter`, `frontmatterSchema` (zod) → `FeatureEntry`, `DocEntry`.
- Loader: `getModeFrontmatter(slug)`, `getDocFrontmatter(slug)`, `getAllDocSlugs()`.
- Registry: `allFeatures`, `allDocs`, `docsBySection`, `routeList`, `getFeatureBySlug(slug)`, `getDocBySlug(slug)`, `prevNext(slug)`, `dedupeFaq(faqs)`.
- Feature map: `FEATURE_SLUG_TO_MODE` (pinned), `FEATURE_BODY` (static import map).
- Docs body map: `DOC_BODY` in `doc-bodies.ts` (static import map keyed by `slug.join('-')` — no dynamic `import()`).
- JSON-LD builders: `howToLd`, `faqPageLd`, `breadcrumbLd` (all return `Ld`).
- MDX seam: `useMDXComponents` in root `mdx-components.tsx`.

---

### Task 1: MDX toolchain — deps + `next.config.ts` (createMDX, pageExtensions, OG tracing)

**Files:** Modify `apps/web/package.json`, `apps/web/next.config.ts`. Add a throwaway probe `apps/web/src/app/_mdxprobe/page.mdx` (deleted at the end of the step).

- [ ] **Step 1: Add the dependencies**

Run:

```bash
pnpm --filter @record-me/web add zod
pnpm --filter @record-me/web add -D @next/mdx @types/mdx gray-matter rehype-pretty-code shiki remark-gfm rehype-slug rehype-autolink-headings
pnpm install
```

Expected: `zod` in dependencies; the 8 build-time packages in devDependencies; lockfile updated. (`zod` confirmed not previously in the lockfile.)

> **No `@mdx-js/react`.** The Next App Router applies the component map through the **root `mdx-components.tsx` file convention** at compile time (per Next's official MDX guide — the root `mdx-components` file is required, and there is no `MDXProvider` in the App Router path). `mdx-components.tsx` imports nothing from `@mdx-js/react`, so the package would be dead weight. (`mdx-components.test.tsx` calls `useMDXComponents` directly, which works regardless.) Total: **9 new deps**.

- [ ] **Step 2: Wrap `next.config.ts` with `createMDX`** (compose over the existing tuned `type:module` config — do NOT touch `outputFileTracingRoot` or `headers()`)

```ts
// apps/web/next.config.ts
import path from 'node:path';
import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Allow .md/.mdx files to be treated as routable/importable pages.
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  outputFileTracingIncludes: {
    '/opengraph-image': ['src/app/_og/fonts/**'],
    '/privacy/opengraph-image': ['src/app/_og/fonts/**'],
    '/changelog/opengraph-image': ['src/app/_og/fonts/**'],
    // 5C OG routes — same computed-path tofu risk (see comment above on the
    // /opengraph-image entry). Keys MUST match Next's traced route ids; verify
    // against the .next build manifest on a preview deploy (Task 10).
    '/features/[mode]/opengraph-image': ['src/app/_og/fonts/**'],
    '/docs/[...slug]/opengraph-image': ['src/app/_og/fonts/**'],
  },
  transpilePackages: ['@record-me/ui', '@record-me/recorder'],
  async headers() {
    /* …unchanged… */
  },
};

// IMPORTANT: never add `--turbopack` to the `dev` script. @next/mdx cannot pass
// function-form remark/rehype plugins to Turbopack and rehype-pretty-code's
// options are not fully serializable — Turbopack would silently strip
// highlighting. Both `next dev` and Vercel `next build` are webpack here; keep
// it that way.
const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap' }],
      [
        rehypePrettyCode,
        {
          keepBackground: false,
          // SINGLE dark theme — this app is dark-only (no theme toggle, no
          // data-theme/class on <html>, no ThemeProvider; verified empty grep
          // for data-theme/prefers-color-scheme/ThemeProvider in apps/web/src;
          // layout.tsx sets only font-variable classes). Single-theme mode emits
          // a resolved inline `style="color:#…"` per token (NO --shiki-light /
          // --shiki-dark var pair, NO multi-value data-theme), so code renders
          // correctly on the Twilight surface with one honest path and no dead
          // CSS. Do NOT switch to dual-theme `{ dark, light }` unless a real
          // data-theme='dark' is first added on <html> (out of 5C scope) — dual
          // theme would default to the LIGHT token colors here (light-on-dark).
          theme: 'github-dark-default',
        },
      ],
    ],
  },
});

export default withMDX(config);
```

> Keep the existing `headers()` body verbatim. The two new `outputFileTracingIncludes` entries are the only additions to that object.

- [ ] **Step 3: Probe a static MDX page builds.** Create `apps/web/src/app/_mdxprobe/page.mdx` with a heading + a fenced ```ts code block. Run `pnpm --filter @record-me/web build`. Expected: `/\_mdxprobe` listed as a **static** (`○`/prerendered) route in the build output, build green.

- [ ] **Step 4: Confirm CSP/header output is byte-identical + no new eval.** Inspect the built page HTML (`.next/server/app/_mdxprobe.html`) — under the single dark theme each highlighted token carries a **resolved inline** `style="color:#…"` (Shiki-emitted; NO `--shiki-light`/`--shiki-dark` var pair, NO multi-value `data-theme`) and ships **no** client highlighter chunk. Confirm `next.config.ts headers()` is unchanged (prod `script-src` has no `'unsafe-eval'`; `style-src 'unsafe-inline'` is what already permits the inline token color). Delete `apps/web/src/app/_mdxprobe/`.

- [ ] **Step 5: Commit.** `git add apps/web/package.json apps/web/next.config.ts ../../pnpm-lock.yaml && git commit -m "chore(content): add MDX toolchain + wire next.config (createMDX, pageExtensions, OG tracing)"`

---

### Task 2: zod frontmatter schema + gray-matter loader + typed registry

**Files:** Create `apps/web/src/lib/content/{schema,loader,features,registry}.ts`, `{schema,loader,registry}.test.ts`, and `__fixtures__/` (`feature-a.mdx`, `doc-getting-started.mdx`, `doc-permissions.mdx`, `doc-draft.mdx`).

- [ ] **Step 1: Write failing schema test**

```ts
// apps/web/src/lib/content/schema.test.ts
import { describe, expect, it } from 'vitest';
import { featureFrontmatterSchema, docFrontmatterSchema } from './schema';

describe('frontmatter schemas', () => {
  it('accepts a valid feature frontmatter', () => {
    const fm = featureFrontmatterSchema.parse({
      slug: 'screen-camera-cursor',
      mode: 'screen+cam+cursor',
      title: 'Mode A — Screen, Camera & Cursor',
      deck: 'The full recital.',
      eyebrow: '§ Mode A',
      order: 1,
      howToSteps: [{ name: 'Pick the mode', text: 'Choose Screen + Camera + Cursor.' }],
      faq: [{ question: 'Is it free?', answer: 'Yes — MIT.' }],
      related: ['permissions'],
    });
    expect(fm.mode).toBe('screen+cam+cursor');
  });

  it('rejects an invalid RecordMode', () => {
    expect(() =>
      featureFrontmatterSchema.parse({
        slug: 'x',
        mode: 'camera-only', // engine value is cam-only — must reject the slug
        title: 't',
        deck: 'd',
        eyebrow: 'e',
        order: 1,
        howToSteps: [{ name: 'a', text: 'b' }],
        faq: [],
        related: [],
      }),
    ).toThrow();
  });

  it('rejects a doc description over 160 chars', () => {
    expect(() =>
      docFrontmatterSchema.parse({
        title: 't',
        description: 'x'.repeat(161),
        slug: ['permissions'],
        section: 'recording',
        order: 1,
      }),
    ).toThrow();
  });

  it('defaults draft to false', () => {
    const fm = docFrontmatterSchema.parse({
      title: 'Getting started',
      description: 'How to record.',
      slug: ['getting-started'],
      section: 'getting-started',
      order: 1,
    });
    expect(fm.draft).toBe(false);
  });
});
```

- [ ] **Step 2: Run → fail** (`cannot find module ./schema`).

- [ ] **Step 3: Implement `schema.ts`**

```ts
// apps/web/src/lib/content/schema.ts
import { z } from 'zod';

// Engine values — single source of truth is packages/recorder/src/types.ts.
export const recordModeSchema = z.enum(['screen+cam+cursor', 'screen+cursor', 'cam-only']);

const qaSchema = z.object({ question: z.string().min(1), answer: z.string().min(1) });
const stepSchema = z.object({ name: z.string().min(1), text: z.string().min(1) });

export const featureFrontmatterSchema = z.object({
  slug: z.string().min(1),
  mode: recordModeSchema,
  title: z.string().min(1),
  deck: z.string().min(1),
  eyebrow: z.string().min(1),
  order: z.number().int(),
  howToSteps: z.array(stepSchema).min(1),
  faq: z.array(qaSchema),
  related: z.array(z.string()),
});

export const docFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).max(160),
  slug: z.array(z.string().min(1)).min(1),
  section: z.string().min(1),
  order: z.number().int(),
  faq: z.array(qaSchema).optional(),
  draft: z.boolean().default(false),
  updated: z.string().optional(),
});

export type FeatureFrontmatter = z.infer<typeof featureFrontmatterSchema>;
export type DocFrontmatter = z.infer<typeof docFrontmatterSchema>;
export type Qa = z.infer<typeof qaSchema>;
export type HowToStep = z.infer<typeof stepSchema>;
```

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Write failing loader test (fixture-anchored under `src`)**

```ts
// apps/web/src/lib/content/loader.test.ts
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { getDocFrontmatter, getAllDocSlugs, getModeFrontmatter } from './loader';

const FIXTURES = path.join(__dirname, '__fixtures__');

describe('content loader', () => {
  it('parses + validates a feature fixture', () => {
    const fm = getModeFrontmatter('feature-a', FIXTURES);
    expect(fm.mode).toBe('screen+cam+cursor');
    expect(fm.howToSteps.length).toBeGreaterThan(0);
  });

  it('lists doc slugs and drops drafts in production', () => {
    const slugs = getAllDocSlugs(FIXTURES);
    // doc-draft.mdx has draft:true → excluded; doc-getting-started + doc-permissions remain.
    expect(slugs).toEqual(expect.arrayContaining([['getting-started'], ['permissions']]));
    expect(slugs).not.toContainEqual(['draft-doc']);
  });

  it('throws on a slug not present (security-relevant guard)', () => {
    expect(() => getDocFrontmatter(['../../etc/passwd'], FIXTURES)).toThrow();
  });
});
```

- [ ] **Step 6: Run → fail.**

- [ ] **Step 7: Implement `loader.ts`** — pure functions, base-path-anchored reads (default to the real content dirs; tests pass `FIXTURES`). `getAllDocSlugs` enumerates `*.mdx` in the docs dir, parses frontmatter, drops `draft` when `NODE_ENV === 'production'`, and is the **allow-list** that the catch-all import validates against (slug-guard). `getDocFrontmatter` joins the slug array to a filename and **must** verify the resolved path stays inside the base dir before reading (reject traversal).

```ts
// apps/web/src/lib/content/loader.ts
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  docFrontmatterSchema,
  featureFrontmatterSchema,
  type DocFrontmatter,
  type FeatureFrontmatter,
} from './schema';

const FEATURE_DIR = path.join(process.cwd(), 'src/app/features/[mode]/_content');
const DOCS_DIR = path.join(process.cwd(), 'src/content/docs');

function read(dir: string, file: string): string {
  const full = path.resolve(dir, file);
  // Path-traversal guard — the resolved file must stay inside the base dir.
  if (!full.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error(`Illegal content path: ${file}`);
  }
  if (!fs.existsSync(full)) throw new Error(`Content not found: ${file}`);
  return fs.readFileSync(full, 'utf8');
}

export function getModeFrontmatter(slug: string, dir = FEATURE_DIR): FeatureFrontmatter {
  const { data } = matter(read(dir, `${slug}.mdx`));
  return featureFrontmatterSchema.parse(data);
}

export function getDocFrontmatter(slug: string[], dir = DOCS_DIR): DocFrontmatter {
  const file = `${slug.join('-')}.mdx`;
  const { data } = matter(read(dir, file));
  return docFrontmatterSchema.parse(data);
}

export function getAllDocSlugs(dir = DOCS_DIR): string[][] {
  const isProd = process.env.NODE_ENV === 'production';
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => docFrontmatterSchema.parse(matter(read(dir, f)).data))
    .filter((fm) => !(isProd && fm.draft))
    .map((fm) => fm.slug);
}
```

> **Build-cwd assumption (explicit).** `FEATURE_DIR`/`DOCS_DIR` are anchored to `process.cwd()`, which is **`apps/web`** at both `next build` and `next start` — the same assumption the existing `_og/fonts` loader relies on (Vercel Root Directory = `apps/web`, verified). The `read()` guard uses `path.resolve(dir, file)` + a `startsWith(path.resolve(dir) + path.sep)` traversal check; the literal `[mode]` segment in `FEATURE_DIR` is read **verbatim** (no glob, no normalization concern — `path.resolve` treats the brackets as ordinary path chars). The fixture-based tests (which pass `FIXTURES` explicitly) de-risk the read independently of cwd; keep them.
>
> The schema/loader filename↔slug convention: **v1 ships only flat single-segment slugs mapped to flat files** — a doc's `slug: ['getting-started']` lives at `getting-started.mdx`, read via `slug.join('-')`. This is correct and unambiguous for the 6 flat v1 docs (bodies render via the static `DOC_BODY` import map in `doc-bodies.ts`, keyed by `slug.join('-')` — **not** a dynamic `import()`). A **nested** URL slug such as `['recording', 'codecs']` would resolve under this `'-'` join to the **flat** key `recording-codecs` — i.e. directory nesting is **not** supported as written, and a future flat doc literally named `recording-codecs` would collide. So nested `/docs/<section>/<slug>` URLs are **not** zero-rework: they require a slug→file convention change (low effort — e.g. join with `/` and read nested dirs, or a slug→path map). That change is **deferred** (out of v1 scope). Optionally add a unit assertion that every v1 doc slug is length-1 so the `'-'` join stays unambiguous.

- [ ] **Step 8: Run → pass.**

- [ ] **Step 9: Implement `features.ts`** — the **pinned** slug↔mode map + the fixed 3-key static body import map (no globbing).

```ts
// apps/web/src/lib/content/features.ts
import type { RecordMode } from '@record-me/recorder';

// PINNED — URL slug → engine RecordMode. The off-by-one this exists to prevent:
// 'camera-only' (URL) maps to 'cam-only' (engine), NOT 'camera-only'.
export const FEATURE_SLUG_TO_MODE = {
  'screen-camera-cursor': 'screen+cam+cursor',
  'screen-cursor': 'screen+cursor',
  'camera-only': 'cam-only',
} as const satisfies Record<string, RecordMode>;

export type FeatureSlug = keyof typeof FEATURE_SLUG_TO_MODE;
export const FEATURE_SLUGS = Object.keys(FEATURE_SLUG_TO_MODE) as FeatureSlug[];

// Fixed static import map for the 3 colocated bodies (statically analyzable).
import ScreenCameraCursor from '@/app/features/[mode]/_content/screen-camera-cursor.mdx';
import ScreenCursor from '@/app/features/[mode]/_content/screen-cursor.mdx';
import CameraOnly from '@/app/features/[mode]/_content/camera-only.mdx';

export const FEATURE_BODY: Record<FeatureSlug, typeof ScreenCameraCursor> = {
  'screen-camera-cursor': ScreenCameraCursor,
  'screen-cursor': ScreenCursor,
  'camera-only': CameraOnly,
};
```

> The `.mdx` body imports will not resolve until the fragments exist (Task 6); until then keep `FEATURE_BODY` behind the import and let the registry expose only frontmatter-derived data. Sequence: registry/routing/JSON-LD (this task + Tasks 3, 6) consume frontmatter; `FEATURE_BODY` is wired in Task 6 when the fragments land.

- [ ] **Step 10: Write failing registry test** (covers `dedupeFaq` + `routeList`)

```ts
// apps/web/src/lib/content/registry.test.ts
import { describe, expect, it } from 'vitest';
import { dedupeFaq, routeList } from './registry';

describe('registry', () => {
  it('dedupes FAQ by question (keeps first)', () => {
    const out = dedupeFaq([
      { question: 'Is it free?', answer: 'Yes.' },
      { question: 'Is it free?', answer: 'Yes, MIT.' },
      { question: 'Does it upload?', answer: 'No.' },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].answer).toBe('Yes.'); // first wins
  });

  it('routeList includes the 3 features and the docs index', () => {
    const paths = routeList().map((r) => r.path);
    expect(paths).toContain('/features/screen-camera-cursor');
    expect(paths).toContain('/features/camera-only');
    expect(paths).toContain('/docs');
  });
});
```

- [ ] **Step 11: Run → fail.**

- [ ] **Step 12: Implement `registry.ts`** — aggregates loader output into `allFeatures`/`allDocs`/`docsBySection`/`routeList`/`getFeatureBySlug`/`getDocBySlug`/`prevNext` + `dedupeFaq`. `routeList()` returns `{ path, priority, changeFrequency }[]` consumed by both `sitemap.ts` and `generateStaticParams`. `dedupeFaq` keeps the first occurrence per `question` (the explicit unique-question aggregation that keeps `FAQPage` valid).

```ts
// apps/web/src/lib/content/registry.ts (excerpt)
import type { MetadataRoute } from 'next';
import { FEATURE_SLUGS, FEATURE_SLUG_TO_MODE, type FeatureSlug } from './features';
import { getAllDocSlugs, getDocFrontmatter, getModeFrontmatter } from './loader';
import type { DocFrontmatter, FeatureFrontmatter, Qa } from './schema';

export function dedupeFaq(faqs: Qa[]): Qa[] {
  const seen = new Set<string>();
  return faqs.filter((f) => (seen.has(f.question) ? false : (seen.add(f.question), true)));
}

export const allFeatures = (): (FeatureFrontmatter & { slug: FeatureSlug })[] =>
  FEATURE_SLUGS.map((slug) => ({ ...getModeFrontmatter(slug), slug }));

export const allDocs = (): DocFrontmatter[] =>
  getAllDocSlugs()
    .map((slug) => getDocFrontmatter(slug))
    .sort((a, b) => a.section.localeCompare(b.section) || a.order - b.order);

export function routeList(): {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}[] {
  return [
    ...FEATURE_SLUGS.map((s) => ({
      path: `/features/${s}`,
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    })),
    { path: '/docs', priority: 0.6, changeFrequency: 'monthly' },
    ...allDocs().map((d) => ({
      path: `/docs/${d.slug.join('/')}`,
      priority: 0.6,
      changeFrequency: 'monthly' as const,
    })),
  ];
}
// + docsBySection(), getFeatureBySlug(slug), getDocBySlug(slug), prevNext(slug)
```

> `FEATURE_SLUG_TO_MODE` is consumed where a page needs the engine mode (cross-links into `/record`, copy). Keep `dedupeFaq`/`routeList`/`prevNext` names verbatim — Tasks 3, 7, 9 import them by these names.

- [ ] **Step 13: Run → pass** (all three test files). Confirm `pnpm --filter @record-me/web typecheck` is green.

- [ ] **Step 14: Commit.** `feat(content): zod frontmatter schema + gray-matter loader + typed registry`

---

### Task 3: SEO builders — `howToLd` + `faqPageLd` + `breadcrumbLd` + `buildMetadata` robots field

**Files:** Modify `apps/web/src/lib/seo/json-ld.ts`, `json-ld.test.ts`, `metadata.ts`, `metadata.test.ts`.

- [ ] **Step 1: Write failing JSON-LD tests** (append to `json-ld.test.ts`, mirroring the existing style)

```ts
import { howToLd, faqPageLd, breadcrumbLd } from './json-ld';

describe('content json-ld builders', () => {
  it('howToLd emits HowTo + HowToStep', () => {
    const ld = howToLd({
      name: 'Record screen + camera + cursor',
      step: [{ name: 'Pick the mode', text: 'Choose Screen + Camera + Cursor.' }],
    });
    expect(ld['@type']).toBe('HowTo');
    expect((ld.step as { '@type': string }[])[0]['@type']).toBe('HowToStep');
  });

  it('faqPageLd emits FAQPage with Question/acceptedAnswer', () => {
    const ld = faqPageLd([{ question: 'Is it free?', answer: 'Yes — MIT.' }]);
    expect(ld['@type']).toBe('FAQPage');
    const q = (ld.mainEntity as { '@type': string; acceptedAnswer: { text: string } }[])[0];
    expect(q['@type']).toBe('Question');
    expect(q.acceptedAnswer.text).toBe('Yes — MIT.');
  });

  it('breadcrumbLd emits BreadcrumbList with ABSOLUTE item urls', () => {
    const ld = breadcrumbLd([
      { name: 'Docs', path: '/docs' },
      { name: 'Permissions', path: '/docs/permissions' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    const items = ld.itemListElement as { position: number; item: string }[];
    expect(items[0].position).toBe(1);
    expect(items[1].item).toBe(`${siteConfig.url}/docs/permissions`); // absolute
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement (append to `json-ld.ts`)** — same `Ld` type, no fork.

```ts
export function howToLd(input: {
  name: string;
  description?: string;
  step: { name: string; text: string }[];
}): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    step: input.step.map((s) => ({ '@type': 'HowToStep', name: s.name, text: s.text })),
  };
}

export function faqPageLd(faq: { question: string; answer: string }[]): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: new URL(it.path, siteConfig.url).toString(), // ABSOLUTE — Google ignores relative
    })),
  };
}
```

> **PR note:** `breadcrumbLd`/`BreadcrumbList` is an **intentional additive** enhancement — it is NOT in spec § 8.4 (which lists only HowTo on features + FAQPage on /docs). Flag it in the PR body so gatekeeper/scribe don't treat it as scope creep.

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Add `robots` to `buildMetadata`** (additive, optional — 5C routes are all indexed so they won't set it; this completes the helper)

```ts
// metadata.test.ts (append)
it('passes a robots directive through when provided', () => {
  const m = buildMetadata({
    title: 'X',
    description: 'y',
    path: '/x',
    robots: { index: false, follow: false },
  });
  expect((m.robots as { index?: boolean })?.index).toBe(false);
});
```

```ts
// metadata.ts — extend BuildMetadataInput + thread through
type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
  og?: string;
  robots?: Metadata['robots'];
};
// in the returned object:  ...(robots ? { robots } : {}),
```

- [ ] **Step 6: Run → pass.** `pnpm --filter @record-me/web test src/lib/seo` → all green.

- [ ] **Step 7: Commit.** `feat(seo): howToLd + faqPageLd + breadcrumbLd builders + buildMetadata robots field`

---

### Task 4: Root `mdx-components.tsx` + `Prose` wrapper + single-theme Shiki code styling

**Files:** Create `apps/web/src/mdx-components.tsx`, `mdx-components.test.tsx`, `apps/web/src/app/_components/content/Prose.tsx`, `Prose.test.tsx`. Modify `apps/web/src/app/globals.css`.

- [ ] **Step 1: `frontend-design`** — invoke the `frontend-design` skill for the brand seam: how `h1–h6`, `p`, `a`, `ul/ol/li`, `blockquote`, `inline code`, `pre`, `img`, `hr` render in the Twilight palette (Instrument Serif headings, Geist body, Geist Mono code). Token-only, **no raw hex** in the TSX. Reference `@record-me/ui` primitives + existing token CSS-vars (`var(--color-…)`, `var(--font-…)`). The **only** legitimate hex in 5C lives inside the Shiki-emitted **resolved inline** per-token `style="color:#…"` (single `github-dark-default` theme; a documented build-time boundary, like `_og/template.tsx`) — never `--shiki-*` vars (those belong to dual-theme, which this dark-only app does not use).

- [ ] **Step 2: Write failing test**

```tsx
// apps/web/src/mdx-components.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMDXComponents } from './mdx-components';

describe('useMDXComponents', () => {
  const map = useMDXComponents({});

  it('renders an internal link through TransitionLink (real anchor)', () => {
    const A = map.a!;
    render(<A href="/docs/permissions">Permissions</A>);
    const link = screen.getByRole('link', { name: 'Permissions' });
    expect(link).toHaveAttribute('href', '/docs/permissions');
  });

  it('maps headings to brand-styled elements with ids preserved', () => {
    const H2 = map.h2!;
    render(<H2 id="setup">Setup</H2>);
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'setup');
  });
});
```

- [ ] **Step 3: Run → fail.**

- [ ] **Step 4: Implement `mdx-components.tsx`** (sole brand seam) — `useMDXComponents` mapping per the frontend-design output. Internal `href` (starts with `/` or `#`) → `TransitionLink`; external → plain `<a target="_blank" rel="noreferrer">`. `img` → `next/image` with explicit `width`/`height` (CLS-safe). Headings keep the `id` injected by `rehype-slug` (TOC targets). `code`/`pre` are left structurally intact so the rehype-pretty-code single-theme **resolved inline** per-token `style="color:#…"` survives untouched — only the **wrapper** gets Twilight token classes.

```tsx
// apps/web/src/mdx-components.tsx
import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import { TransitionLink } from '@/components/TransitionLink';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href = '', children, ...rest }) => {
      const internal = href.startsWith('/') || href.startsWith('#');
      return internal ? (
        <TransitionLink href={href} {...rest}>
          {children}
        </TransitionLink>
      ) : (
        <a href={href} target="_blank" rel="noreferrer" {...rest}>
          {children}
        </a>
      );
    },
    img: ({ src = '', alt = '', width, height }) => (
      <Image src={src} alt={alt} width={Number(width) || 1200} height={Number(height) || 675} />
    ),
    // h1–h6/p/ul/ol/li/blockquote/code/pre/hr → token-classed elements per
    // frontend-design. code/pre keep Shiki's resolved inline per-token
    // style="color:#…" intact (single dark theme — no --shiki-* vars).
    ...components,
  };
}
```

- [ ] **Step 5: Implement `Prose.tsx`** — a token-based wrapper (`className` applying Instrument Serif headings / Geist body / Geist Mono code via token vars) that the route pages wrap the MDX body in. The code-block **wrapper** (`pre`/`figure` background, border, radius, padding) uses Twilight tokens; per-token foreground stays Shiki-inline.

- [ ] **Step 6: Add the code-block wrapper CSS to `globals.css`** (append — single dark theme, wrapper-only)

```css
/* MDX syntax highlighting (rehype-pretty-code, build-time Shiki, SINGLE dark
   theme). Per-token foreground is a RESOLVED inline `style="color:#…"` emitted
   by Shiki at build — there is NO --shiki-light/--shiki-dark var pair and NO
   selector here picks a variant. CSP-safe: style-src already allows
   'unsafe-inline'. This block tokenizes the code-block WRAPPER ONLY; we do NOT
   recolor per-token foreground (Shiki already resolved it for the dark theme). */
figure[data-rehype-pretty-code-figure] pre {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 12px;
  padding: 16px 18px;
  overflow-x: auto;
}
```

> The app is dark-only — there is no theme toggle, no `data-theme`/class on
> `<html>`, no `ThemeProvider` (verified: `layout.tsx` sets only font-variable
> classes; `globals.css` uses fixed `var(--bg)`/`var(--ivory)`; grep for
> `data-theme`/`prefers-color-scheme`/`ThemeProvider` in `apps/web/src` is empty).
> So there is intentionally **no** `[data-theme='dark']` selector and **no**
> `--shiki-*` var selection: the single `github-dark-default` Shiki theme resolves
> each token to a final dark-tuned hex at build, and the wrapper above mounts it
> on the Twilight `--color-surface`/`--color-line` (validated to exist as `@theme`
> aliases over `--surface`/`--line`). Re-introduce a variant selector ONLY if a
> real `data-theme='dark'` lands on `<html>` and the config goes dual-theme.

- [ ] **Step 7: Run → pass.**

- [ ] **Step 8: Visual-verify (Playwright MCP) — single-theme acceptance.** On a scratch route or the Task-6/7 pages, confirm:
  - (a) production CSP needs **no** `'unsafe-eval'` and none is present;
  - (b) **no** client highlighter JS chunk ships (Shiki ran at build only);
  - (c) a rendered code block carries Shiki-emitted **resolved inline** per-token `style="color:#…"` at **AA contrast** against the Twilight wrapper background (`--color-surface`);
  - console clean.
    Do **NOT** assert the presence of `--shiki-light`/`--shiki-dark` vars or a multi-value `data-theme` — those are dual-theme artifacts and are **absent** under the single `github-dark-default` theme (the trap this plan avoids in reverse).

- [ ] **Step 9: Commit.** `feat(content): root mdx-components + Prose wrapper + single-theme Shiki code styling`

---

### Task 5: Static `Toc` + `Breadcrumbs` + `DocsSidebar` (RSC, no scroll-spy)

**Files:** Create `apps/web/src/app/_components/content/{Toc,Breadcrumbs,DocsSidebar}.tsx` + `*.test.tsx`.

- [ ] **Step 1: `frontend-design`** — the static on-page TOC (anchor list to `rehype-slug` ids, sticky aside), the breadcrumb trail, and the section-grouped docs sidebar. Token-only, no raw hex, **reserved dimensions** (min-width on the aside, min-height on the TOC list) so they don't shift layout (CLS ≤ 0.05). No client JS — no scroll-spy in v1.

- [ ] **Step 2: Write failing tests**

```tsx
// Toc.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Toc } from './Toc';

describe('Toc', () => {
  it('renders anchor links to heading ids', () => {
    render(<Toc headings={[{ id: 'setup', text: 'Setup', level: 2 }]} />);
    expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute('href', '#setup');
  });
});
```

```tsx
// Breadcrumbs.test.tsx — renders a nav with the trail, last item is current
// DocsSidebar.test.tsx — groups the docs by section, marks the active slug
```

- [ ] **Step 3: Run → fail.**

- [ ] **Step 4: Implement** all three as RSC. `Toc` takes a `headings: { id; text; level }[]` prop (the page extracts headings from frontmatter or a lightweight server-side parse of the body's `## `/`### ` lines — keep it static, no runtime DOM). `Breadcrumbs` takes `{ name; href }[]`. `DocsSidebar` consumes `docsBySection()` + the active slug. Each root has the reserved-dimension classes.

- [ ] **Step 5: Run → pass.**

- [ ] **Step 6: Visual-verify (Playwright MCP)** on a scratch composition — sticky aside, on-brand, no console errors, no layout shift on load.

- [ ] **Step 7: Commit.** `feat(content): static Toc + Breadcrumbs + DocsSidebar (RSC)`

---

### Task 6: `/features/[mode]` pages + `_content` MDX + per-mode OG + HowTo/Breadcrumb JSON-LD

**Files:** Create `apps/web/src/app/features/[mode]/_content/{screen-camera-cursor,screen-cursor,camera-only}.mdx`, `apps/web/src/app/features/layout.tsx`, `apps/web/src/app/features/[mode]/{page,opengraph-image}.tsx`, `page.test.tsx`. Wire `FEATURE_BODY` in `features.ts` (Task 2).

- [ ] **Step 1: `frontend-design`** — invoke `frontend-design` for the feature deep-page layout: `features/layout.tsx` chrome (masthead + footer, 1280 shell, reuse `WordMark`/landing nav idiom) and the `[mode]/page.tsx` composition (eyebrow + serif headline + deck, use-case narrative, a "How it works" numbered sequence sourced from `howToSteps[]`, cross-links to `/record` + related `/docs`). Token-only.

- [ ] **Step 2: Author the 3 `_content/*.mdx` fragments** with valid frontmatter (`featureFrontmatterSchema`) and accurate copy. The slug↔mode pairing is pinned: `screen-camera-cursor → screen+cam+cursor`, `screen-cursor → screen+cursor`, `camera-only → cam-only`. **The `title:` frontmatter MUST be the exact master-spec § 8.2 segment, verbatim — do NOT paraphrase** (the segment is the bare title; the root template appends `— record me`):

| slug                   | `title:` (verbatim § 8.2 segment)  |
| ---------------------- | ---------------------------------- |
| `screen-camera-cursor` | `Mode A — Screen, Camera & Cursor` |
| `screen-cursor`        | `Mode B — Screen & Cursor`         |
| `camera-only`          | `Mode C — Camera Only`             |

These three strings are contractual (master spec § 8.2 + the e2e "unique title" expectation). A paraphrase like "Mode C — Camera-only recording" breaks the § 8.2 contract — use the table above exactly. **Codec copy must be `MP4 · H.264 (AAC)`, WebM/VP9 fallback — never VP9-first.** Example frontmatter (Mode A):

```mdx
---
slug: screen-camera-cursor
mode: screen+cam+cursor
title: Mode A — Screen, Camera & Cursor
deck: The full recital — screen capture with a picture-in-picture camera and amber cursor pulses.
eyebrow: § Mode A
order: 1
howToSteps:
  - name: Pick the mode
    text: Open /record and choose Screen + Camera + Cursor.
  - name: Grant permissions
    text: Allow screen share and camera access when the browser prompts.
  - name: Record and download
    text: Press record; when you stop, the MP4 (H.264 + AAC) downloads to disk.
faq:
  - question: Is anything uploaded?
    answer: No — recording is fully client-side and never leaves your machine.
related:
  - permissions
  - codecs
---

## How it works

…body…
```

> Review the rendered title: the § 8.2 segment already contains an em dash, so the template yields "Mode A — Screen, Camera & Cursor — record me" (double em-dash). If it reads poorly, shorten the **segment** at authoring, not the template.

- [ ] **Step 3: Write failing page test**

```tsx
// apps/web/src/app/features/[mode]/page.test.tsx
import { describe, expect, it } from 'vitest';
import { generateStaticParams, generateMetadata } from './page';

describe('features/[mode]', () => {
  it('generateStaticParams returns the 3 pinned slugs', async () => {
    const params = await generateStaticParams();
    expect(params.map((p) => p.mode)).toEqual([
      'screen-camera-cursor',
      'screen-cursor',
      'camera-only',
    ]);
  });

  // The bare title MUST equal the master-spec § 8.2 segment verbatim (the root
  // title.template appends ' — record me' at render — asserted in e2e). Guards
  // against a paraphrased title diverging from the § 8.2 contract.
  it.each([
    ['screen-camera-cursor', 'Mode A — Screen, Camera & Cursor'],
    ['screen-cursor', 'Mode B — Screen & Cursor'],
    ['camera-only', 'Mode C — Camera Only'],
  ])('generateMetadata title for %s is the exact § 8.2 segment', async (mode, segment) => {
    const md = await generateMetadata({ params: Promise.resolve({ mode }) });
    expect(md.title).toBe(segment);
  });
});
```

- [ ] **Step 4: Run → fail.**

- [ ] **Step 5: Implement `[mode]/page.tsx`** (RSC):
  - `export const dynamicParams = false;`
  - `generateStaticParams()` → `FEATURE_SLUGS.map((mode) => ({ mode }))`.
  - `generateMetadata({ params })` → `buildMetadata({ title: fm.title /* bare segment */, description: fm.deck, path: \`/features/${slug}\` })`. Unknown slug → `notFound()`.
  - Body: `const Body = FEATURE_BODY[slug]; return <Prose><Body /></Prose>;` (the root `mdx-components.tsx` file convention applies the element map at compile time — no provider needed).
  - JSON-LD: `<JsonLd data={[howToLd({ name: fm.title, step: fm.howToSteps }), breadcrumbLd([{ name: 'Features', path: '/features' }, { name: fm.title, path: \`/features/${slug}\` }])]} />`.
  - Wire `FEATURE_BODY` in `features.ts` now that the fragments exist.

- [ ] **Step 6: Implement `[mode]/opengraph-image.tsx`** — reuse `ogImage({ title, caption })` + `SIZE`/`contentType`/`alt`, **no** `runtime` export (Node default). `title` = the mode headline, `caption` = the deck or "record your screen, beautifully".

```tsx
// apps/web/src/app/features/[mode]/opengraph-image.tsx
import { ogImage, SIZE } from '@/app/_og/template';
import { getFeatureBySlug } from '@/lib/content/registry';

export const size = SIZE;
export const contentType = 'image/png';
export function generateImageMetadata() {
  /* per-mode alt */
}
export default function Og({ params }: { params: { mode: string } }) {
  const fm = getFeatureBySlug(params.mode);
  return ogImage({ title: fm.title, caption: fm.deck.slice(0, 60) });
}
```

- [ ] **Step 7: Run page test → pass.** Build: `pnpm --filter @record-me/web build` → the 3 `/features/*` routes are **static** (`●`/prerendered). Curl one OG route after `start` → `200 image/png 1200×630`.

- [ ] **Step 8: Visual-verify (Playwright MCP)** each `/features/<slug>` at 1440×900 + 390 — on-brand (Twilight, Instrument Serif/Geist), HowTo sequence renders, code blocks AA-contrast, console clean, View-Transition `<a>` links work.

- [ ] **Step 9: Commit.** `feat(features): /features/[mode] pages + _content MDX + per-mode OG + HowTo/Breadcrumb json-ld`

---

### Task 7: `/docs` index + `/docs/[...slug]` pages + docs MDX + per-doc OG + FAQPage/Breadcrumb JSON-LD

**Files:** Create `apps/web/src/content/docs/{getting-started,permissions,codecs,safari,browser-support,troubleshooting}.mdx`, `apps/web/src/app/docs/{layout,page,opengraph-image}.tsx`, `apps/web/src/app/docs/[...slug]/{page,opengraph-image}.tsx`, `docs/page.test.tsx`, `docs/[...slug]/page.test.tsx`.

- [ ] **Step 1: `frontend-design`** — invoke `frontend-design` for the docs layout: `docs/layout.tsx` chrome with the static `DocsSidebar`; `docs/page.tsx` (section-grouped index + a visible FAQ block); `[...slug]/page.tsx` (article column + static `Toc` aside + prev/next). Token-only.

- [ ] **Step 2: Author the 6 docs** under `content/docs/` with valid `docFrontmatterSchema` frontmatter (`description ≤ 160`). Sections: getting-started → `getting-started`; permissions + codecs → `recording`; safari + browser-support → `browser-support`; troubleshooting → `troubleshooting`. **`codecs.mdx` carries the contract verbatim: MP4 · H.264 (AAC), WebM/VP9 fallback.** Put real Q&A in `faq[]` on the docs that warrant it (permissions, codecs, safari, troubleshooting) — these aggregate into the `/docs` FAQPage.

- [ ] **Step 3: Write failing tests**

```tsx
// docs/[...slug]/page.test.tsx
import { describe, expect, it } from 'vitest';
import { generateStaticParams } from './page';
import { DOC_BODY } from '@/lib/content/doc-bodies';

describe('docs/[...slug]', () => {
  it('generateStaticParams returns one entry per non-draft doc', async () => {
    const params = await generateStaticParams();
    expect(params).toContainEqual({ slug: ['permissions'] });
    expect(params).toContainEqual({ slug: ['codecs'] });
  });

  // v1 invariant: every doc slug is a single segment, so the loader's
  // `slug.join('-')` → flat-file mapping is unambiguous (no nesting/collision).
  // Drop/relax this only when the slug→file convention is changed to support
  // nested URLs (deferred).
  it('all v1 doc slugs are single-segment (flat-file invariant)', async () => {
    const params = await generateStaticParams();
    for (const p of params) expect(p.slug).toHaveLength(1);
  });

  // Parity: every filesystem doc slug (getAllDocSlugs, the routing source of
  // truth) has a static DOC_BODY body. Guarantees the fs-driven param list and
  // the hand-maintained static import map never drift — a doc on disk with no
  // DOC_BODY entry would 404 its own body, which this fails loudly at test time.
  it('every doc slug has a static DOC_BODY entry (no orphan body)', async () => {
    const params = await generateStaticParams();
    for (const p of params) expect(DOC_BODY).toHaveProperty(p.slug.join('-'));
  });
});
```

```tsx
// docs/page.test.tsx — renders grouped sections + a visible FAQ whose questions
// match dedupeFaq(allDocs faq[]); asserts NO 'VP9'-first wording in the index.
```

- [ ] **Step 4: Run → fail.**

- [ ] **Step 5: Implement `docs/page.tsx`** (index): `<JsonLd data={[faqPageLd(dedupeFaq(faqs)), breadcrumbLd([{ name: 'Docs', path: '/docs' }])]} />` where `faqs = allDocs().flatMap((d) => d.faq ?? [])`. Render the **visible** matching Q&A block (must mirror the deduped set exactly) + the section-grouped list from `docsBySection()`. `generateMetadata` via `buildMetadata`.

- [ ] **Step 6: Implement `docs/[...slug]/page.tsx`** (catch-all, RSC):
  - `export const dynamicParams = false;`
  - First implement `doc-bodies.ts` — the static `DOC_BODY` import map (6 fixed `import … from '@/content/docs/*.mdx'`, keyed by `slug.join('-')`), mirroring `FEATURE_BODY`. **No dynamic `import()`** of interpolated input: an aliased `import(\`@/content/docs/${…}.mdx\`)`is a webpack dynamic-context footgun (the`@/`alias prefix can fail to generate the context → build error or runtime`MODULE_NOT_FOUND` for every doc) **and** a code-injection seam. The static map is fully analyzable and prerenders cleanly.
  - `generateStaticParams()` → `getAllDocSlugs().map((slug) => ({ slug }))`.
  - **Static body lookup, double-guarded** — validate `params.slug` against `getAllDocSlugs()` (the build-time allow-list); on miss → `notFound()`. Then read `const Body = DOC_BODY[slug.join('-')]`; if absent → `notFound()` (parity guard — caught at test time by Step 3's DOC_BODY parity test).
  - `generateMetadata` via `buildMetadata({ title: fm.title, description: fm.description, path })`.
  - Static `Toc` aside; `breadcrumbLd([{ name: 'Docs', path: '/docs' }, { name: fm.title, path }])`; prev/next from `prevNext(slug)`.

```ts
// apps/web/src/lib/content/doc-bodies.ts
// Static, fully analyzable slug → MDX body map (mirrors FEATURE_BODY in features.ts).
// Keyed by `slug.join('-')` (v1 slugs are single-segment). The filesystem-driven
// getAllDocSlugs() stays the source of truth for routing/metadata; this map only
// renders the body. The Step-3 parity test asserts the two never drift.
import GettingStarted from '@/content/docs/getting-started.mdx';
import Permissions from '@/content/docs/permissions.mdx';
import Codecs from '@/content/docs/codecs.mdx';
import Safari from '@/content/docs/safari.mdx';
import BrowserSupport from '@/content/docs/browser-support.mdx';
import Troubleshooting from '@/content/docs/troubleshooting.mdx';

export const DOC_BODY = {
  'getting-started': GettingStarted,
  permissions: Permissions,
  codecs: Codecs,
  safari: Safari,
  'browser-support': BrowserSupport,
  troubleshooting: Troubleshooting,
} as const;

export type DocBodyKey = keyof typeof DOC_BODY;
```

```tsx
// docs/[...slug]/page.tsx (guard excerpt — static body map, no dynamic import)
import { notFound } from 'next/navigation';
import { getAllDocSlugs } from '@/lib/content/loader';
import { DOC_BODY, type DocBodyKey } from '@/lib/content/doc-bodies';

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export default async function DocPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const key = slug.join('-');
  const known = getAllDocSlugs().some((s) => s.join('-') === key);
  if (!known) notFound(); // allow-list guard — never render unknown input
  const Body = DOC_BODY[key as DocBodyKey];
  if (!Body) notFound(); // parity guard — on disk but missing from DOC_BODY (author error)
  // …render <Prose><Body/></Prose> + Toc + Breadcrumbs + prev/next…
}
```

- [ ] **Step 7: Implement `docs/opengraph-image.tsx`** (static index card) + `docs/[...slug]/opengraph-image.tsx` (per-doc, reuses `ogImage`, Node runtime).

- [ ] **Step 8: Run tests → pass.** Build → all `/docs` + `/docs/*` routes **static**; OG routes `200 image/png 1200×630`. **Confirm body rendering** (not just frontmatter): after `next build && next start`, curl `/docs/permissions` and assert the response HTML contains body prose from the `.mdx` (e.g. a heading/paragraph string authored in `permissions.mdx`), proving `DOC_BODY` resolved and the static map did not silently no-op.

- [ ] **Step 9: Visual-verify (Playwright MCP)** `/docs` + a `/docs/<slug>` at 1440×900 + 390 — sidebar, TOC, code blocks AA-contrast, FAQ block matches JSON-LD, console clean.

- [ ] **Step 10: Commit.** `feat(docs): /docs index + /docs/[...slug] pages + docs MDX + per-doc OG + FAQPage/Breadcrumb json-ld`

---

### Task 8: Wire `/`↔`/features` View-Transition + cross-links (ModeTriptych "Learn more →")

**Files:** Modify `apps/web/src/app/_components/landing/ModeTriptych.tsx`, `ModeTriptych.test.tsx`. Add Docs/Features nav+footer entries (`features/layout.tsx`, `docs/layout.tsx`, landing nav/footer as applicable).

- [ ] **Step 1: `frontend-design`** — the "Learn more →" affordance on each `ModeTriptych` card and the features/docs cross-links. Keep it within the existing card token language.

- [ ] **Step 2: Write failing test**

```tsx
// ModeTriptych.test.tsx (append)
it('each card links to its /features/<slug> via TransitionLink', () => {
  render(<ModeTriptych />);
  expect(screen.getByRole('link', { name: /learn more/i, exact: false })).toBeTruthy();
  // assert the three hrefs: /features/screen-camera-cursor, /features/screen-cursor,
  // /features/camera-only — pinned slugs, matching FEATURE_SLUG_TO_MODE.
});
```

- [ ] **Step 3: Run → fail.**

- [ ] **Step 4: Implement** — add a `slug: FeatureSlug` to each entry in the `modes` array and render a `<TransitionLink href={\`/features/${slug}\`}>Learn more →</TransitionLink>`per card. Reuse the existing`TransitionLink`+`::view-transition`CSS (globals.css L20-37) — **no new motion infra**, plain`<a>` fallback preserved, reduced-motion instant. Add Features/Docs entries to the nav + footer.

- [ ] **Step 5: Run → pass.**

- [ ] **Step 6: Visual-verify (Playwright MCP)** — navigate `/` → `/features/screen-camera-cursor` via the card link: crossfade where supported, clean navigation otherwise; `emulateMedia({ reducedMotion: 'reduce' })` → instant swap; console clean.

- [ ] **Step 7: Commit.** `feat(content): wire / to /features view-transition + cross-links (ModeTriptych learn more)`

---

### Task 9: Extend sitemap (registry-driven) + Lighthouse CI urls

**Files:** Modify `apps/web/src/app/sitemap.ts`, `sitemap.test.ts`, `lighthouserc.json`. (`robots.ts` unchanged.)

- [ ] **Step 1: Write failing sitemap test** (append)

```ts
it('includes the 3 feature routes at 0.8 and each doc at 0.6', () => {
  const entries = sitemap();
  const byUrl = Object.fromEntries(entries.map((e) => [e.url, e]));
  const base = siteConfig.url;
  expect(byUrl[`${base}/features/screen-camera-cursor`].priority).toBe(0.8);
  expect(byUrl[`${base}/docs`].priority).toBe(0.6);
  expect(byUrl[`${base}/docs/permissions`].priority).toBe(0.6);
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** — drive `sitemap.ts` from `routeList()` merged with the existing hand list (`/`, `/record`, `/changelog`, `/privacy`), so the registry and `generateStaticParams` cannot diverge. `changeFrequency: 'monthly'` for the 5C routes.

```ts
// sitemap.ts (excerpt)
import { routeList } from '@/lib/content/registry';
const BASE_ROUTES = [
  { path: '/', priority: 1.0, changeFrequency: 'monthly' as const },
  { path: '/record', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/changelog', priority: 0.5, changeFrequency: 'weekly' as const },
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' as const },
];
const ROUTES = [...BASE_ROUTES, ...routeList()];
```

- [ ] **Step 4: Run → pass.** Confirm `robots.test` still green (no change).

- [ ] **Step 5: Add lhci urls** to `lighthouserc.json` `collect.url`: `http://localhost:3000/features/screen-camera-cursor` + `http://localhost:3000/docs/permissions`. (Assertions are global — the new routes must clear **0.95 a11y / 0.95 best-practices / 0.95 SEO** plus **0.90 performance, CLS ≤ 0.05, LCP ≤ 1800 ms**.)

- [ ] **Step 6: Run lhci on a clean build** — `pnpm --filter @record-me/web build && pnpm lhci` (clean `.next`, no competing next process — per the 5A staff note; run via `zsh -lic` for the pnpm/node PATH). Confirm the new routes clear every assertion, not just performance. The single `github-dark-default` theme already renders dark-tuned token colors on the dark surface (the correct path); if a11y is still marginal, tune the wrapper background/contrast or swap to another Twilight-tuned **dark** Shiki theme.

- [ ] **Step 7: Commit.** `chore(seo): extend sitemap (registry-driven) + lighthouse ci urls for new routes`

---

### Task 10: E2E smoke + OG tracing verification + full gate + docs

**Files:** Create `apps/web/tests/e2e/content.spec.ts`. Modify `docs/{FRONTEND,SEO,ARCHITECTURE,PROGRESS,CODEBASE_MAP}.md`.

- [ ] **Step 1: Write `content.spec.ts`** (reuse `playwright.config.ts` baseURL/webServer):
  - `/features/screen-camera-cursor` + `/docs` + `/docs/permissions` load `200`.
  - Unique `<title>` + canonical per route (no silent inheritance). Assert each feature page's rendered `<title>` equals its **exact § 8.2 segment + ` — record me`** (e.g. `/features/camera-only` → `Mode C — Camera Only — record me`, `/features/screen-cursor` → `Mode B — Screen & Cursor — record me`, `/features/screen-camera-cursor` → `Mode A — Screen, Camera & Cursor — record me`) — guards the § 8.2 title contract end-to-end.
  - `HowTo` JSON-LD present on a feature page; `FAQPage` JSON-LD present on `/docs`.
  - The visible `/docs` FAQ block matches the FAQPage questions (no duplicates).
  - console has **zero** errors on each route.
  - **NOTE — do _not_ assert the `dynamicParams=false` → `404` here.** Playwright's `webServer` is `pnpm dev` (verified `playwright.config.ts`), and in dev App Router compiles dynamic segments on demand and does **not** reliably hard-404 unknown params the way the production prerender does. The unknown-slug 404 is verified against the **production** server in Step 3 instead.

```ts
// apps/web/tests/e2e/content.spec.ts (excerpt)
// NOTE: the unknown-slug `dynamicParams=false → 404` check is NOT here — this suite
// runs against `pnpm dev`, which compiles dynamic segments on demand and won't hard-404
// unknown params. That assertion lives in Step 3 against `next build && next start`.
test('HowTo on a feature page, FAQPage on /docs', async ({ page }) => {
  await page.goto('/features/screen-camera-cursor');
  expect(await page.locator('script[type="application/ld+json"]').allInnerTexts()).toEqual(
    expect.arrayContaining([expect.stringContaining('"HowTo"')]),
  );
  await page.goto('/docs');
  expect(await page.locator('script[type="application/ld+json"]').allInnerTexts()).toEqual(
    expect.arrayContaining([expect.stringContaining('"FAQPage"')]),
  );
});
```

- [ ] **Step 2: Run e2e** — `pnpm --filter @record-me/web test:e2e content.spec.ts` (3× for stability) → all pass.

- [ ] **Step 3: Production-build verification** (`next build && next start` — the `dynamicParams=false` and OG checks require the prerendered build, not `pnpm dev`):
  - **Unknown-slug 404 (`dynamicParams=false`):** curl `/features/does-not-exist` and `/docs/nope` → both return HTTP `404`. (This is the prerender-enforced hard-404 that dev does not reliably produce — hence verified here, not in the Step-1 e2e suite.)
  - **OG tracing-include KEYS vs the `.next` build manifest:** inspect the route ids in `.next/` (e.g. the app paths manifest) and confirm the two new `outputFileTracingIncludes` keys (`/features/[mode]/opengraph-image`, `/docs/[...slug]/opengraph-image`) **exactly match** the traced route ids. A mismatched key silently no-ops → tofu on Vercel (the 5A failure, faa8d01). Curl both OG routes → `200 image/png 1200×630` with real glyphs (no tofu); re-confirm on a preview deploy.

- [ ] **Step 4: Full gate** (clean `.next` first; no competing next process; run via `zsh -lic` for the pnpm/node PATH):

```
pnpm -w typecheck && pnpm -w lint && pnpm -w test \
  && pnpm --filter @record-me/web build \
  && pnpm --filter @record-me/web test:e2e \
  && pnpm lhci \
  && pnpm format:check
```

Confirm: every `/features/*` + `/docs/*` route is **static**; production CSP/header output byte-identical (no new eval, no header change); lhci ≥ 90 performance **and** ≥ 0.95 a11y/bp/seo, CLS ≤ 0.05, LCP ≤ 1800 ms on the new routes; `format:check` clean (prettier blocks CI — **format all new `.mdx`/`.ts`/`.tsx` before pushing**, per memory).

- [ ] **Step 5: Update docs** — `FRONTEND.md` (add `/features/[mode]`, `/docs`, `/docs/[...slug]` to the route table; add `mdx-components`, `lib/content/*`, `_components/content/*` to the inventory); `SEO.md` (HowTo/FAQPage/Breadcrumb builders + the 5C OG routes + sitemap entries); `ARCHITECTURE.md` (the MDX pipeline + typed-registry data flow + the no-`--turbopack` constraint); `PROGRESS.md` (Slice 5C complete; mirror epic #5); `CODEBASE_MAP.md` (new files by owner). Record the MDX **content-authoring workflow** (frontmatter contract, where bodies live, how to add a doc).

- [ ] **Step 6: Commit.** `test(content): e2e smoke + full gate + docs(phase-5c) mark MDX content system shipped`

---

## Self-review notes (coverage check)

- **Spec § 2 decisions** — MDX compiler/build mode → Task 1; typed registry + frontmatter parse → Task 2; syntax highlighting (single `github-dark-default` theme → resolved inline per-token `style="color:#…"`, CSP-safe) → Tasks 1 (wiring) + 4 (wrapper CSS + acceptance); remark/rehype set + no-`--turbopack` → Task 1; content file layout + pinned slug↔mode map → Tasks 2 (map) + 6/7 (files); JSON-LD extend-5A → Task 3; per-route metadata + `robots` → Task 3 (helper) + 6/7 (usage); per-route OG + font tracing → Tasks 1 (includes) + 6/7 (routes) + 10 (key verify); sitemap/robots/lhci → Task 9; MDX rendering + Prose + View-Transition → Tasks 4 (seam) + 5 (chrome) + 8 (VT). ✓
- **Spec § 4 architecture (separation of concerns)** — body via `@next/mdx` (Task 1), structured via zod registry (Task 2). ✓
- **Spec § 5.1 `/features/[mode]`** — Task 6 (3 pinned slugs, `dynamicParams=false`, HowTo+Breadcrumb, per-mode OG, codec accuracy). ✓
- **Spec § 5.2 `/docs` + `/docs/[...slug]`** — Task 7 (index FAQPage from deduped faq[], catch-all **static `DOC_BODY` map** — allow-list + parity double-guarded, no dynamic `import()`, static TOC, prev/next, per-doc OG). ✓
- **Spec § 5.3 content model + MDX mapping** — Task 2 (frontmatter = only metadata source) + Task 4 (brand seam, Prose) + Task 5 (static TOC/sidebar). ✓
- **Spec § 5.4 `/`↔`/features` View-Transition** — Task 8. ✓
- **Spec § 6 SEO & performance** — metadata (Task 3/6/7), JSON-LD (Task 3), OG (Task 1/6/7/10), sitemap (Task 9), CWV/Lighthouse ≥ 90 + global 0.95 (Task 9 lhci + Task 10 gate). ✓
- **Spec § 7 dependencies** — Task 1 (all 9; `@mdx-js/react` dropped — App Router uses the root `mdx-components.tsx` file convention, no provider). ✓
- **Spec § 8 testing** — unit (Tasks 2,3), component (Tasks 4,5,8), e2e (Task 10), visual (Tasks 4,6,7,8), lhci (Task 9), OG tracing (Task 10). ✓
- **Spec § 9 definition of done** — Task 10 (gate, static HTML, no eval, lhci, copy accuracy, JSON-LD, OG no-tofu, VT, sitemap, docs, PROGRESS/epic). ✓
- **Spec § 10 risks** — OG tofu (Tasks 1+10), Turbopack caveat (Task 1 inline comment), inline-style highlighting (Task 4 corrected acceptance), AA contrast (Tasks 4+9), dual-read drift (Task 2 review rule), catch-all body via static `DOC_BODY` map + allow-list/parity guards, no dynamic `import()` (Tasks 2+7+10); unknown-slug 404 verified against the production build, not dev (Task 10 Step 3); CLS (Tasks 4+5), slug↔mode mismatch (Task 2 pinned map), FAQPage validity/dedupe (Tasks 2+7), fixtures+cwd (Task 2), CI prettier (Task 10 `format:check`), breadcrumb scope (Task 3 PR note), lhci false-green (Task 9). ✓
- **Naming consistency** — `FeatureFrontmatter`/`DocFrontmatter`/`frontmatterSchema`, `getModeFrontmatter`/`getDocFrontmatter`/`getAllDocSlugs`, `routeList`/`dedupeFaq`/`prevNext`/`docsBySection`, `FEATURE_SLUG_TO_MODE`/`FEATURE_BODY`, `howToLd`/`faqPageLd`/`breadcrumbLd`, `useMDXComponents` — used verbatim across Tasks 2–10. ✓
- **Copy accuracy** — MP4 · H.264 (AAC), WebM/VP9 fallback (Tasks 6 codec, 7 codecs.mdx + index assert no VP9-first); Free · MIT; client-side, no upload, no accounts. ✓
- **Sequencing** — foundation (1 toolchain → 2 registry → 3 SEO builders → 4 MDX seam → 5 IA chrome) precedes page composition (6 features → 7 docs → 8 VT) then SEO/gate (9 → 10). ✓
- **Deferred (not in this plan):** analytics/events, custom domain (Phase 6); client-side docs search + scroll-spy TOC, nested `/docs/<section>/<slug>` URLs, KaTeX, `i18n`, `updated`-from-git automation (post-v1). ✓
- **Not committed:** this plan file is not git-committed (per the brief). No LLM attribution in any commit message.
