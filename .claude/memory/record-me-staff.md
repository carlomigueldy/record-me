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

## Future entries

(Append below.)
