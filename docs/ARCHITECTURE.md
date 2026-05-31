# Architecture

record-me is a pnpm + Turborepo monorepo with **one deployed app** and
**three internal packages**. See
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 5 for the full
rationale.

## Workspace shape

```
record-me/
├── apps/web/                # Next.js 15 App Router · the only deployed surface
├── packages/recorder/       # @record-me/recorder · framework-agnostic engine
├── packages/ui/             # @record-me/ui · shadcn + Twilight tokens + brand primitives
└── packages/config/         # @record-me/config · tsconfig · eslint · tailwind preset
```

## Package responsibilities

| Package               | Depends on          | Responsibility                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@record-me/recorder` | `@record-me/config` | Framework-agnostic recording engine. State machine + acquire + composer (RAF) + cursor highlights + MediaRecorder + pluggable chunk storage (in-memory or IndexedDB). **No React import.** Unit-tested in jsdom with MediaStream / MediaRecorder / canvas / IDB mocks. Public API: `createRecorder`, `supportedMimeType`, `probeCapabilities`, `RecorderError`, `suggestedFilename`. |
| `@record-me/ui`       | `@record-me/config` | shadcn/ui + Twilight tokens + brand primitives (RecDot, ModeCard, StudioShell, MetaChip, WordMark, Button). Does not import `recorder`; UI consumes it via `apps/web` hooks only.                                                                                                                                                                                                    |
| `@record-me/config`   | ∅                   | Shared TypeScript, ESLint, Prettier, Tailwind v4 preset with full token set.                                                                                                                                                                                                                                                                                                         |
| `apps/web`            | All three packages  | Next.js 15 App Router. Single deployed surface for studio (`/record`), marketing, and dashboards. Wires recorder + UI + design tokens.                                                                                                                                                                                                                                               |

## Dependency rules

| Package               | Depends on                                                  | Forbidden imports                                                    |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/web`            | `@record-me/ui`, `@record-me/recorder`, `@record-me/config` | —                                                                    |
| `@record-me/recorder` | `@record-me/config`                                         | **React** (must stay framework-agnostic)                             |
| `@record-me/ui`       | `@record-me/config`                                         | `@record-me/recorder` (UI consumes recorder via apps/web hooks only) |
| `@record-me/config`   | ∅                                                           | Anything                                                             |

## Why this shape

- Isolating `recorder` allows unit-testing in jsdom without Next.js.
- Cleaner ownership boundaries for the multi-agent team (see § 11 of the spec).
- Single deploy target keeps Vercel config simple.

## Adding a new package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, `src/`.
2. Add to `pnpm-workspace.yaml` (already covered by `packages/*` glob).
3. Add a `path` reference to root `tsconfig.json`.
4. If consumed by `apps/web`, add to its `transpilePackages` in `next.config.ts`.
5. Update this doc.

## Build pipeline

`turbo.json` defines: `dev` (parallel, persistent), `build`, `test`, `test:e2e`,
`typecheck`, `lint`, `clean`. Each task declares `dependsOn` for correct ordering
(packages build before app; tests depend on builds).

## MDX content pipeline (Phase 5C)

The `/features` and `/docs` content surface is **build-time, static MDX** —
prerendered HTML, no runtime eval, CSP-safe (no header change).

**Body render — `@next/mdx` (webpack, build time)**, wired in
`apps/web/next.config.ts`:

- `pageExtensions: ['ts','tsx','md','mdx']` + `createMDX({ extension: /\.mdx?$/ })` (the `mdx?` regex makes the advertised `.md` support honest — `createMDX` defaults to `.mdx`-only).
- remark: `remark-frontmatter` (FIRST — strips the leading YAML `---` block from the compiled body so it doesn't render as visible text), then `remark-gfm`.
- rehype: `rehype-slug` (heading ids), `rehype-autolink-headings` (`{ behavior: 'wrap' }`), `rehype-pretty-code` (Shiki, **single** `github-dark-default` theme). Single-theme mode emits a **resolved inline** `style="color:#…"` per token — no `--shiki-*` var pair, no client highlighter chunk, 0 `eval()` — so it is CSP-safe under the existing `style-src 'unsafe-inline'` with no `script-src` change. The app is dark-only; do **not** switch to dual-theme.
- The root `mdx-components.tsx` file convention supplies the component map at compile time (no `MDXProvider`). `@mdx-js/loader` is a required (optional-peer) dep of `@next/mdx`'s webpack path.
- **Dev and build are both webpack — never add `--turbopack`.** `@next/mdx` cannot pass function-form remark/rehype plugins to Turbopack (rehype-pretty-code options aren't fully serializable → highlighting silently stripped).

**Structure — the typed registry (`lib/content/`)** is the single source of truth
for everything _structured_, kept **separate** from the `@next/mdx` body render:

```
content/docs/*.mdx ──gray-matter──▶ frontmatter ──zod (schema.ts)──▶ typed FeatureFrontmatter / DocFrontmatter
   _content/*.mdx                         │                                    │
        │                                 └─ loader.ts (validate, slug-guard,  └─ registry.ts: allFeatures / allDocs /
        │                                    drop drafts in prod, github-slugger        docsBySection / routeList /
        │                                    TOC heading ids)                            prevNext / dedupeFaq
        ▼                                                                                    │
   FEATURE_BODY / DOC_BODY (static import maps)                                              ▼
        ▼                                                          generateStaticParams · generateMetadata · sitemap ·
   <Prose><Body/></Prose>  (the rendered body)                    nav (Toc/Breadcrumbs/DocsSidebar) · HowTo/FAQ/Breadcrumb JSON-LD
```

The registry — not the MDX bodies — drives routing/metadata/sitemap/nav/JSON-LD.
MDX bodies never export `metadata`/`frontmatter` consts (review rule). The zod
parse at module load **fails the build** on malformed/incomplete frontmatter.
`github-slugger` is a direct dep (used by `loader.ts` to mirror `rehype-slug`'s
heading ids for the static TOC).

## Adding a new app

For v1 the only app is `apps/web`. Phase 2+ may add `apps/extension` (Chrome
extension for cursor highlights, v2 hook).
