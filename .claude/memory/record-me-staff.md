---
name: record-me-staff
description: Per-agent memory for staff. Recording engine + workspace plumbing learnings.
metadata:
  type: pattern
  owner: record-me-staff
---

# record-me-staff memory

## Phase 1 baseline

- `@record-me/recorder` has no React import. Hooks live in `apps/web`.
- Vitest's jsdom env doesn't ship `MediaRecorder`/`getDisplayMedia` — tests
  must mock them on `globalThis`.
- Codec preference order is frozen by spec § 7.4. If a new format is needed,
  update the spec first, then the code.

## Phase 4 (2026-05-29) — recorder consumer hooks

- **`exactOptionalPropertyTypes: true` is on.** An optional field typed
  `subject?: PermissionSubject` does NOT accept `undefined` as a value. If you
  assign a `PermissionSubject | undefined` expression to it (e.g. in a
  `toJSON()` return shape that reads `this.subject`), tsc errors with TS2375.
  Fix: type the field `subject: PermissionSubject | undefined` (explicit
  union), not `subject?`. Unit tests pass regardless — this only surfaces under
  `pnpm typecheck`. Lesson: ALWAYS run workspace typecheck after recorder
  changes; Vitest green is not sufficient.
- **Vitest `toEqual` treats `{ x: undefined }` as equal to `{}`** (unlike
  `toStrictEqual`). So adding an always-present `subject` key to `toJSON()`
  output did NOT break the existing `errors.test.ts` `toEqual` assertion.
- **One result channel for stop().** `onResult` fires inside `stop()` right
  before the return, so manual-stop AND auto-stop (whose `stop()` return value
  is discarded by the auto-stop timer) both deliver the result to the consumer.
  Don't try to deliver it only via the return value.
- **`onPreviewReady` gets a video-ONLY stream:** wrap
  `new MediaStream(composer.captureStream().getVideoTracks())` — never include
  the mic track in the preview (echo + privacy).
- `PermissionSubject` canonical home is now `types.ts` (was `errors.ts`),
  re-exported from the package root. `errors.ts` imports it as a type.

## Phase 5A (2026-05-30) — SEO foundation infra (next.config.ts)

- **Git worktrees break `next build` page-data collection.** A worktree has its
  own `pnpm-lock.yaml` AND the parent repo has one → Next infers the PARENT repo
  as the workspace root and `next build` fails non-deterministically during
  "Collecting page data" with `Cannot find module for page: <random route>`
  (target shifts every run; sometimes a synthetic `/_document`). Dev (`next dev`)
  is unaffected — all routes serve 200. Fix: set
  `outputFileTracingRoot: path.join(import.meta.dirname, '../..')` in
  `apps/web/next.config.ts` (monorepo root). Without it, page-collection fails
  deterministically on the dual-lockfile inference.
- **`next build` is flaky here ONLY under process contention.** After the
  tracing-root fix, residual intermittent failures (page-collection ENOENT, or a
  stale-compiled OG `route.js` throwing `Failed to parse URL from
/_next/static/media/*.ttf`, or `.next/types/link.d.ts` ENOENT from
  `typedRoutes`) were all caused by killing `next dev`/`next start` mid-flight or
  clobbering `.next` concurrently. Reliable recipe: kill all next procs + free
  port 3000 + `rm -rf apps/web/.next` + ONE `pnpm --filter @record-me/web build`,
  no competing process. 3 consecutive clean builds passed. Not code defects.
- **CSP must gate `'unsafe-eval'` to dev only.** `headers()` applies in ALL
  envs. Next's dev client (webpack HMR / React Refresh) calls `eval()`, so a
  prod-grade `script-src` without `'unsafe-eval'` hard-crashes `next dev` with an
  EvalError pageerror + a `securitypolicyviolation` (directive=script-src,
  blocked=eval) — breaks hydration AND the interactive playwright e2e (webServer
  = `pnpm dev`). Pattern: `const isDev = process.env.NODE_ENV !== 'production';`
  then append `" 'unsafe-eval'"` to script-src only when `isDev`. Prod stays
  strict (verified: prod CSP has no eval; full e2e 9/9 green in dev).
- **`outputFileTracingIncludes` globs are PROJECT-relative, NOT
  tracing-root-relative.** Verified in Next 15.5 `dist/build/collect-build-traces.js`:
  include globs run through `glob(pattern, { cwd: dir })` where `dir` is the
  project dir (`apps/web`), independent of `outputFileTracingRoot`. So even with
  `outputFileTracingRoot` = monorepo root, the glob is `src/app/_og/fonts/**`
  (an `apps/web/`-prefixed glob traces 0 files). Keys are page paths
  (`'/opengraph-image'`) matched via picomatch `{ contains: true }`. Why it
  matters: OG routes read `.ttf` via `fs + process.cwd()` (because
  `fetch(new URL(import.meta.url))` is broken in static prerender — Next #66244),
  which `@vercel/nft` can't trace → tofu OG on Vercel unless force-included.
  Verify by grepping each `<route>.js.nft.json` for the `.ttf` paths (should
  list both fonts; default trace only has Next's noto-sans fallback).
- **Vercel Analytics on a LOCAL prod build logs harmless errors.** `next start`
  off-Vercel: the SDK loads its script from the same-origin proxy
  `/_vercel/insights/script.js` (+ speed-insights), which only Vercel's edge
  serves; locally it 404s as `text/html` and `X-Content-Type-Options: nosniff`
  (NOT CSP) refuses to execute it → "Refused to execute script (MIME type)" +
  "Failed to load script" console lines. These are NOT CSP violations
  (`securitypolicyviolation` count = 0). The CDN host `va.vercel-scripts.com` is
  allow-listed, so analytics loads cleanly in production.
- **Verifying CSP without Playwright MCP:** I lack the `browser_*` MCP tools, so
  I run a headless chromium check via the app's own `@playwright/test` install,
  listening on the `securitypolicyviolation` DOM event (the authoritative
  signal) + `pageerror`. The script MUST live inside `apps/web/` (or be invoked
  with cwd there) for ESM to resolve `@playwright/test` — a `/tmp` script can't
  resolve it.

## Phase 5C (2026-05-31) — MDX toolchain (next.config.ts, @next/mdx)

- **`@next/mdx` needs `@mdx-js/loader` for the webpack path — it's an OPTIONAL
  peer, so pnpm installs nothing and emits NO warning, and the build hard-fails
  without it: `Cannot find module '@mdx-js/loader'`.** The 5C plan listed 9 deps
  and explicitly said "no @mdx-js/react" — that's correct (App Router uses the
  root `mdx-components.tsx` file convention, no `MDXProvider`), but the loader is
  a SEPARATE package that `createMDX` delegates to under webpack. Real dep count
  is 10. `@mdx-js/react` stays correctly absent.
- **`pnpm add @next/mdx` pulls v16 (its `latest` tag) even on a Next-15 app.**
  Next 15.5.18 here; `@next/mdx@16` targets Next 16. No HARD peer conflict (its
  only peers are the optional `@mdx-js/*`), but there's a `backport` dist-tag at
  exactly `15.5.18` — pin to that (`@next/mdx@15.5.18`) to match the Next minor
  and avoid toolchain skew. Always `npm view @next/mdx dist-tags` before trusting
  `latest`.
- **A leading-underscore folder is a Next App Router PRIVATE folder, excluded
  from routing.** The 5C plan's probe path `app/_mdxprobe/page.mdx` builds green
  but NEVER appears as a route (so it silently fails to prove MDX is routable).
  Probe with a non-underscore path (`app/mdxprobe/page.mdx`) to actually verify
  `○ Static` prerender, then delete. (Doesn't affect the real design: features/
  docs are TSX pages that IMPORT .mdx bodies; `_content` MDX files are fragments,
  not routable `page.mdx`.)
- **rehype-pretty-code SINGLE-theme (`theme: 'github-dark-default'`) emits a
  RESOLVED inline `style="color:#…"` per token — verified `#FF7B72`/`#79C0FF` in
  built HTML, ZERO `--shiki-*` vars, NO client highlighter/onig chunk in
  `.next/static`, 0 `eval()`.** All CSP-safe with the EXISTING `style-src
'unsafe-inline'` — no header change needed, prod `script-src` stays eval-free.
  Wrapper attr is `data-rehype-pretty-code-figure` (style the wrapper, leave
  token spans untouched). Do NOT go dual-theme `{dark,light}` unless a real
  `data-theme='dark'` lands on `<html>` (it would default to LIGHT tokens →
  light-on-dark).
- **pnpm writes `pnpm-lock.yaml` in a form prettier wants to reformat.** CI runs
  `pnpm format:check` (ci.yml:41) over `**/*.{...,yaml,...}` and `pnpm-lock.yaml`
  is NOT in `.prettierignore` → any dep change makes the lockfile a format-check
  FAIL that blocks the merge (the original lockfile on `main` passes; mutating it
  breaks it). After `pnpm add`, run `npx prettier --write pnpm-lock.yaml`, then
  confirm it's still valid with `pnpm install --frozen-lockfile`. Reformatting
  keeps it pnpm-valid.
- **@next/mdx does NOT strip YAML frontmatter by default — you MUST add
  `remark-frontmatter` (first in `remarkPlugins`).** Without it, an MDX body with
  a leading `---` block renders the raw `slug:/mode:/title:` YAML as VISIBLE text
  (a thematic-break `<hr>` + paragraph) inside `<Body/>`. `gray-matter` reads the
  same frontmatter INDEPENDENTLY for the typed registry — the two paths don't
  conflict; remark-frontmatter only governs what @next/mdx renders. Verify on a
  probe that imports a real frontmattered fragment: grep built HTML for the YAML
  keys (want 0) AND `<hr` (want 0). My Task 1 probe had NO frontmatter, so this
  bug didn't surface until Task 2 fragments landed — ALWAYS probe with a
  representative frontmattered body, not a bare one.
- **`createMDX`'s `extension` defaults to `/\.mdx$/` — if `pageExtensions`
  advertises `'md'` too, add `extension: /\.mdx?$/`** or a bare `.md` page
  ROUTES-BUT-DOESN'T-COMPILE (the MDX loader never claims it). Verified: a
  `.md` probe only renders to HTML after the regex widens to `mdx?`.
- **A DYNAMIC OG route's nft trace nests under an extra `[__metadata_id__]`
  segment.** Static OG routes (`/docs`, `/privacy`) trace at
  `.../opengraph-image/route.js.nft.json`, but a dynamic one (`/features/[mode]`)
  is at `.../opengraph-image/[__metadata_id__]/route.js.nft.json`. Grep
  RECURSIVELY for `*opengraph-image*/**/route.js.nft.json` when verifying font
  inclusion — assuming a flat path makes a working route look like 0-fonts/tofu.
  Also: `outputFileTracingIncludes` keys with literal `[...]` are matched by
  picomatch `{contains:true}` and DO match the bracketed route id (the brackets
  are read as a char-class but still match), so a key like
  `/features/[mode]/opengraph-image` works. A removed route leaves an ORPHANED
  key tracing 0 files — when a route id changes (e.g. catch-all per-doc OG → one
  shared `/docs/opengraph-image`), update the key or the new route gets tofu.
- **A direct `import` backed only by a TRANSITIVE dep breaks Vitest + clean
  installs.** `loader.ts` imported `github-slugger` (to mirror rehype-slug's TOC
  ids) but it was only present transitively via rehype-slug — Vitest's Vite
  resolver threw `Failed to resolve import 'github-slugger'` for ANY test that
  imports the registry (sitemap, registry, etc.), and a fresh `pnpm install`
  would too. Fix: declare it as a DIRECT dep (`github-slugger@^2`, runtime →
  `dependencies`). Rule: any package you `import` by name must be a direct dep,
  never relied on transitively. (Dep management is staff's lane even when the
  import lives in another agent's file — add the package.json dep, don't edit
  their file.)
- **Registry-driven sitemap pattern:** `sitemap.ts` spreads
  `registry.routeList()` onto the static 5A/5B routes
  (`[...STATIC_ROUTES, ...routeList()]`) so the sitemap and `generateStaticParams`
  share ONE source and can't diverge. `routeList()` returns
  `{path,priority,changeFrequency}[]` — the exact shape sitemap's map consumes.

## Future entries

(Append below.)
