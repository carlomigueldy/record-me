---
name: record-me-principal
description: Per-agent memory for principal. Review patterns + plateau signals.
metadata:
  type: pattern
  owner: record-me-principal
---

# record-me-principal memory

## Phase 1 baseline

- Severity tiers: CRITICAL (blocks merge), MAJOR (blocks unless explicitly
  waived), MINOR (post-merge follow-up).
- Always invoke `/codex:review` first (if available) — your Opus pass
  complements, doesn't duplicate.
- Plateau rule: 2 rounds with zero CRITICAL+MAJOR cleared → escalate.

## Future entries

(Append below.)

## Phase 3 patterns (2026-05-28, recorder engine, 4 review rounds)

### CRITICAL findings (privacy/correctness)

- **Async resource cleanup must be awaited at session boundaries.** When a
  release/dispose path includes async cleanup (IDB clear, URL revoke), the
  caller's contract MUST be async — fire-and-forget `void store.clear()`
  violates privacy contracts that promise "wiped on dispose/stop". Pattern:
  flag any `void asyncFn()` in a cleanup path and ask "what if the user
  closes the tab before this resolves?"
- **Snapshot-based cleanup needs chain semantics, not replace semantics.**
  Snapshotting in-flight async work into a cleanup promise is correct, but
  if cleanup runs more than once (e.g. React StrictMode double-invoke,
  repeated user clicks), each new snapshot must CHAIN the prior cleanup
  via `await prior` rather than overwriting the reference. Otherwise the
  first cleanup's awaitable handle is dropped, leaving start() to barrier
  on the wrong drain.

### MAJOR findings (state machine fidelity)

- **State guards alone don't suffice for stale closures.** When a callback
  closure (e.g. `result.release()`) can be invoked across multiple sessions,
  a `if (state === X)` guard is insufficient because state X is reachable
  from any session. Gate on session-ownership signals instead (matching
  resource refs, session tokens). Easiest pattern: nest the state transition
  INSIDE the ownership guard, since ownership-match implies "still my
  session".
- **Post-permission startup sequences leak tracks on partial failure.**
  Code paths that acquire OS-level resources (camera, mic, screen) and
  then wire downstream consumers (MediaRecorder, encoders) need a single
  try/catch surrounding the wiring so that any wiring failure cleans up
  the acquired resources. Otherwise the user sees a red-dot indicator
  with no recording in progress.

### Coordinate normalization pattern

- **Viewport-relative coordinates need to be normalized for downstream
  rendering at different resolutions.** Storing `clientX/clientY` directly
  and rendering on a fixed-resolution canvas produces misaligned overlays.
  Capture `clientX / innerWidth` (a 0–1 ratio) at event time, multiply by
  the target frame's dimensions at draw time. The decoupling matters
  whenever the source coord system and the render target system differ.

### Plateau detection nuance

- The literal rule is "2 rounds with zero CRIT+MAJOR cleared". The SPIRIT
  is "review is stuck on identical defects". When findings EVOLVE (round 1
  C1 partially closed by round 2 fix, which reveals a related but new
  defect C2 in round 2), that's convergence, not plateau. The right signal
  is: did the FIX make the recorder strictly better? If yes, refining
  findings is part of healthy convergence.

### Codex collaboration

- Codex round-1 often over-classifies UI-layer concerns as MAJOR (cap
  enforcement, opt-out toggles). The spec § 7.5 wording ("UI shows a
  select") clarifies that cap enforcement is a UI policy, not an engine
  policy. Down-classify to MINOR in such cases with the explicit reason.
- Codex DOES catch race conditions I might miss — its deterministic
  step-through of IDB tx ordering surfaced C2 (dispose-mid-append race)
  and M5 (repeated-dispose pendingCleanup overwrite). Run codex EVERY
  round; don't skip it on later rounds even if my own pass found things.

## Phase 4 patterns (2026-05-29, studio /record)

### Task 1 (engine consumer hooks) — codex serialization nit

- **`toJSON()` with `subject: undefined` is a MINOR, not a blocker.** When a
  new optional field is added to a structured-error `toJSON()` return, codex
  (P1) flags that non-device errors now serialize with `subject: undefined`.
  Verify the REAL impact: (1) `JSON.stringify` DROPS undefined-valued keys, so
  the wire shape is byte-identical; (2) Vitest `toEqual` treats
  `subject: undefined` as absent, so the existing exact-match test still
  passes; (3) only `.toJSON()` + `Object.keys()` exposes the literal key, which
  no production code does. Confirm there are zero non-test `toJSON`/
  `JSON.stringify` consumers (`grep`), then down-classify to MINOR with the
  cleaner alt noted (conditional spread `...(subject ? { subject } : {})`).
- **Verify additive engine callbacks fire on EVERY exit path.** For
  `onResult`, the load-bearing check is auto-stop: `start()`'s timeout calls
  `handle.stop()` and DISCARDS the return, so the callback (not the return
  value) is the only delivery channel. Tests must cover both manual stop and
  timer-driven auto-stop. Confirmed present (recorder.test.ts onResult x2).
- **Re-exporting a type from a new module is backward-compat-safe** when the
  string-literal union is structurally identical (`PermissionSubject` moved
  errors.ts → types.ts, re-export source swapped in index.ts). No consumer
  break.

### Task 3 (useRecorder hook) — session-boundary cleanup recurs at the React layer

- **The Phase 3 "session-boundary cleanup must be awaited" pattern recurs one
  layer up, in the React hook.** A hook wrapping createRecorder() has THREE
  session boundaries that each need both dispose() (stop tracks) AND release()
  (revoke blob URL + wipe IDB): reset(), start()-over-a-prior-session, and
  unmount. Round 1 codex caught reset()-not-disposing (CRIT, cam light stays
  on) + start()-orphaning-prior-handle (MAJOR) + unmount-not-releasing (P2).
  Round 2 fixed all three but introduced a NEW related gap: start()-after-ready
  disposes the handle yet clears result/resultRef WITHOUT release() → blob URL
  leaks until page unload (dispose() does NOT revoke the URL; only release()
  does). Classified MAJOR not CRITICAL because the path is latent — shipped
  Studio wires re-record→reset, not →start — but the hook is a reusable public
  API and must be self-consistent. Lesson: when reviewing a cleanup fix, check
  EVERY entry into the boundary, not just the one that was reported. dispose()
  and release() are NOT interchangeable — dispose=tracks, release=URL+IDB.
- **Convergence vs plateau (confirmed in practice):** round 1 → 3 findings,
  round 2 → all 3 cleared + 1 new related finding. This is convergence (the fix
  made it strictly better, the new finding is adjacent), NOT a plateau. Do not
  escalate. Plateau = SAME findings uncleared two rounds running.

### Task 3 round-2 fix introduced an await-ordering race (codex P2)

- **Fixing a cleanup gap by adding an `await` at the TOP of an async entry
  point can introduce an interleaving race on shared refs.** Round-2 fix put
  `await resultRef.current?.release()` as the FIRST statement of start(),
  before snapshotting/nulling handleRef. For an IDB-backed result, release()
  awaits store.clear() and YIELDS. A concurrent start() can then create handle
  B and set handleRef=B; when start() #1 resumes it disposes handleRef.current
  (now B, the NEW handle) and creates C → orphaned/killed capture + duplicate
  permission prompts. Correct shape: snapshot + null the shared refs
  SYNCHRONOUSLY first, THEN await release() on the snapshot, so a concurrent
  call can't interleave. Lesson: when a fix adds an await before mutating
  shared mutable state (refs), check what a second concurrent invocation does
  during the yield. Classified MAJOR (latent — shipped Studio gates start() to
  the setup phase + routes re-record through awaited reset(), so concurrent
  double-start isn't reachable today; but the hook is reusable public API).
- **Process note:** the round-2 fix to one defect was itself reviewed and found
  to carry an adjacent defect — this is still convergence (each round strictly
  better-formed), but watch the count: Task 3 is now round 1 (3 found) → round
  2 (3 cleared, 1 new) → round 3 (pending). If round 3's fix introduces yet
  another adjacent race with nothing cleared, THAT would be the plateau signal.

### Task 3 round-2 final: waiving a latent MAJOR (vs blocking)

- **When to WAIVE a MAJOR instead of blocking another round:** the blocking
  MAJOR (start() URL leak) was resolved + tested. The remaining concurrent-
  double-start race is DOUBLY gated and non-reachable in Phase 4: it needs
  (1) a real IDB-backed result already in resultRef at start() time AND (2) a
  second start() overlapping the release() await. On first-ever start(),
  resultRef is null so `await undefined?.release()` resolves synchronously —
  zero race window. The window only opens on re-record-via-start, but shipped
  Studio routes re-record through reset(), not start(). Decision: APPROVE with
  the race as an EXPLICIT, on-the-record MAJOR follow-up + a GUARD CONDITION
  (Task 8 review must confirm re-record→reset, never →start; if Task 8 wires
  re-record to start(), the race becomes reachable and must be fixed first).
  This is NOT burying a MAJOR in MINOR — it's named as MAJOR and waived with a
  tracked trigger. Blocking a 3rd round on a non-reachable defect in a
  foundational hook would have risked the plateau dynamic + stalled the Task 8
  dependency for negative product value.
- **Gatekeeper-check candidate:** hooks wrapping a resource engine should
  snapshot+null shared mutable refs (handleRef, resultRef) SYNCHRONOUSLY before
  the first await in any async entry point. Worth a lint/review-checklist item.

### Task 3 round 3 → ESCALATE (whack-a-mole on async hook lifecycle)

- **Round 3 cleared the concurrent-start race (guard + sync snapshot, verified:
  handles.length===1 test passes) BUT the snapshot fix introduced a new adjacent
  P1: post-cleanup continuation.** start() now nulls refs then `await`s before
  createRecorder()/handle.start(). `await undefined` STILL yields a microtask,
  so even with priorResult===null there is a cancellation window. If the
  component unmounts (SPA nav) or reset() runs during that window, the unmount
  cleanup sees handleRef===null (no-op), then start()'s continuation creates +
  starts a recorder AFTER unmount → live camera/mic capture with NO mounted hook
  to dispose it. Reachable via fast "Start then navigate away". Genuine MAJOR
  (privacy: cam/mic light stays on), arguably near-CRITICAL.
- **PLATEAU CALL (the spirit, not the letter):** the literal rule ("2 rounds
  with zero CRIT+MAJOR cleared") was NOT met — every round cleared something.
  But this is round 3+ on the SAME file where each lifecycle fix spawns a new
  adjacent lifecycle defect (reset-no-dispose → start-URL-leak → concurrent-race
  → post-cleanup-continuation). That whack-a-mole IS the escalation signal: the
  async-start design needs ONE holistic correctness pass (mounted/generation
  token + create-handle-synchronously-before-await), not another point patch.
  Issued [REVIEW_ESCALATE] alongside CHANGES_NEEDED. Lesson for future: escalate
  when fixes keep birthing siblings in one subsystem, even if the literal
  zero-cleared counter hasn't tripped — chasing them one at a time wastes rounds.
- **The correct design (recommend in escalation):** capture a generation/mounted
  ref (useRef(true) cleared in unmount cleanup + bumped in reset). After every
  await in start(), bail if generation changed or unmounted, disposing anything
  created. Create+store the handle as early as possible. Pin with a test:
  "start() that resolves its release() await AFTER unmount disposes the new
  handle / never starts capture".

### Task 3 round 4 → ESCALATION RESOLVED (holistic redesign converged)

- **The escalation worked.** After 3 rounds of point-patches each spawning a
  sibling lifecycle defect, the prescribed holistic redesign (mountedRef +
  monotonic genRef captured at entry + post-await guards that dispose-and-bail +
  create/store handle BEFORE handle.start()) closed the ENTIRE class in one
  pass. codex — which had found a NEW defect every prior round — returned "no
  blocking correctness issues." Lesson reinforced: when fixes keep birthing
  siblings in one subsystem, escalate for a design pass; don't keep patching.
- **Verification method for an async-lifecycle redesign:** trace every defect
  class to a specific guard (post-unmount→line-78/120 guard; post-reset→genRef
  bump in reset; concurrent→startingRef; original-three→preserved release/
  dispose), THEN hunt for NEW holes the redesign could introduce: remount/
  StrictMode (mountedRef must reset true at effect setup — it does, line 161);
  finally must clear startingRef on bail-return paths (it does); double-dispose
  safety (engine dispose is idempotent); null-priorHandle edge. All clean.
- **Lint-warning ruling (false positive → justified disable for 10/10 bar):**
  react-hooks/exhaustive-deps fired on reading genRef.current in unmount
  cleanup. It's a genuine false positive — the rule guards against stale DOM-
  NODE refs; genRef is a numeric counter and reading the LATEST value at cleanup
  is the explicit intent. CI exits 0 (no --max-warnings 0). Ruling: add
  `eslint-disable-next-line react-hooks/exhaustive-deps` + 1-line rationale,
  matching repo precedent (canvas.ts:74, composer.ts:130 both suppress genuine
  FPs with a comment). Classified MINOR (CI-green already; clean-lint is the
  10/10 polish). Approving conditional on this one-liner.

### Task 8 (Studio orchestrator) — resume double-counts recording_started (MAJOR)

- **Edge-detection on `prev !== 'recording' && state === 'recording'` fires on
  paused→recording too, not just the session-start edge.** The plan's COMMENT
  said "idle/requesting → recording edge" but the CODE only checked "became
  recording", so every pause→resume emits a spurious recording_started. This
  corrupts spec §10.2 analytics: recording_started is the once-per-session
  funnel signal (started→completed→downloaded) + cap-distribution metric;
  double-counting breaks both. Classified MAJOR (analytics/spec-alignment data-
  quality defect, not a correctness/privacy/build break). Fix: per-session
  startedTracked ref (mirror the existing stoppedTracked pattern, reset on
  return to idle) OR gate on prevState ∈ {idle, requesting-permissions}. The
  Studio test missed it because no test exercises pause→resume — REQUIRE a
  "pause→resume fires recording_started exactly once" test with the fix.
- **Pattern for reviewing edge-triggered analytics:** for every track() inside
  a state-edge effect, enumerate ALL transitions INTO the target state and ask
  which should fire. paused→recording (resume), requesting→recording (start),
  and any error-recovery edge all hit "became recording". Comment-says-X but
  code-checks-Y is a classic gap — verify the predicate, not the comment.
- **Scope discipline:** codex also P1'd "Studio not reachable from /record".
  Correct observation but it's TASK 9's deliverable (page.tsx wiring), explicitly
  out of Task 8's scope per the plan + the lead's own request note. Do NOT count
  a next-task deliverable as a this-task defect — note it informationally.

### Codex availability — degrade gracefully

- Codex hit a usage limit mid-Phase-4 (Task 8 r2) and could not run. The
  workflow says "invoke /codex:review IF available" — when it's not, the Opus
  holistic pass stands alone; do NOT block a verdict on codex being down. State
  the unavailability transparently in the verdict so the lead knows the review
  leaned solely on the Opus pass. (Resets ~hourly per the error message.)

### Task 10 (E2E) — environment workarounds + scope discipline

- **audio:false addInitScript workaround is ACCEPTABLE, not a weakened test.**
  macOS headless Chromium hangs on getUserMedia({audio:true}) (no fake audio
  sink) even with --use-fake-device-for-media-stream. Intercepting gUM to force
  audio:false before hydration is idempotent on Linux CI (full fake stream) and
  drops only the audio track locally — the full setup→live→review→download flow
  - the UNWEAKENED filename assertion still run. Distinguish "documented env
    workaround that preserves the assertion" (OK) from "weakened/skipped expect"
    (anti-pattern). Engine audio handling is unit-tested (Phase 3), so no
    meaningful E2E coverage is lost.
- **A/B device-gating does NOT need an E2E.** Desktop headless Chromium HAS
  getDisplayMedia → A/B are available, not gated; gating only fires on
  mobile/no-getDisplayMedia. The plan's Task 10 (+ spec §11) explicitly scopes
  A/B to "UI render level only, must not be faked" and the gating LOGIC is
  already covered by capabilities.test.ts unit tests (mobile / no-gDM drop
  screen modes). An added mobile-emulation E2E is optional, not required —
  don't manufacture scope the plan didn't ask for.
- **Don't run E2E when the screenshot dev server holds :3000.** Checked lsof
  before any run; port busy (concurrent Task 11) → relied on the e2e
  specialist's authoritative 3×=12/12 no-flake report rather than colliding.
  Division of labor: the e2e agent owns running the suite; principal verifies
  the spec quality + assertion integrity.

## Phase 5A patterns (2026-05-30, SEO foundation + thin pages)

### CRITICAL — CSP must gate 'unsafe-eval' to dev only

- **A header-based CSP in `next.config.ts` headers() applies in EVERY env,
  including `next dev`.** Next's dev client (webpack HMR / React Refresh) runs
  on `eval()`. `script-src` with `'unsafe-inline'` but NO `'unsafe-eval'` ⇒
  Chrome throws a hard pageerror ("Evaluating a string as JavaScript violates
  ... 'unsafe-eval' is not an allowed source") and the dev client crashes →
  broken HMR + non-interactive hydration under `pnpm dev`. Production
  (`next start`) is fine — no eval. So lhci (uses `pnpm start`) PASSES and masks
  it; seo-style e2e (static metadata asserts) PASSES and masks it; only an
  INTERACTIVE e2e or a real dev session surfaces it. Verify method that nailed
  it: `pnpm dev` + headless Chromium `page.on('pageerror')` on an interactive
  route. Fix pattern: `script-src` base + `(NODE_ENV !== 'production' ? " 'unsafe-eval'" : '')`.
- **Watch the playwright webServer.command.** If it's `pnpm dev` (it is here),
  the interactive e2e suite (record.spec.ts) runs against the dev client and a
  too-strict CSP breaks it — but a green "e2e N/N" may only be the NEW static
  specs. Always ask WHICH specs ran and whether any assert hydration/click.
- Gatekeeper-check candidate: any CSP touching script-src ⇒ require an
  interactive-page console check under `next dev`, not just `next start`/lhci.

### CRITICAL — public privacy copy must match the ACTUAL cleanup lifecycle

- **Recorder lifecycle (locked, from Phase 3/4 + reconfirmed): `stop()` only
  ASSEMBLES the Blob — it does NOT clear IDB.** IDB `store.clear()` happens in
  `release()` and in dispose/cleanupResources pendingCleanup, NOT in stop().
  So "wiped on stop" is FALSE — a stopped recording in the review pane keeps
  its chunks in IDB until release (reset/unmount/next-start). When a public
  /privacy page makes byte-level claims, diff every claim against recorder.ts.
  This is a CRITICAL (privacy-contract misstatement), not a copy nit.
  codex caught this independently — good corroboration signal.

### MAJOR — contrast-token regression that lhci's aggregate score hides

- **UPDATE 2026-05-31 (Phase 5C Task 4): the Twilight tokens were RETUNED — re-measure, do not trust the 5A hexes.** Current values (packages/ui/src/tokens.css): ivory #ede6d6 (15.20 vs bg), ivory-dim #b5afa2 (8.65), ivory-mut #948f84 (5.87 vs bg / 5.36 vs --surface — now PASSES AA, was #7a766d=4.17 FAIL in 5A), amber #e5a24a (8.64). ALWAYS recompute against the live tokens.css before flagging contrast; the hexes drift between phases.

- **`text-ivory-mut` (#7a766d) on bg (#0f1115) = 4.17:1 — FAILS WCAG AA 4.5:1
  for normal text.** The repo already litigated this: packages/ui
  MetaChip.test.tsx pins ivory-dim and explicitly rejects ivory-mut with the
  ~4.0:1 rationale. Use ivory-dim (#b5afa2 = 8.65:1) for any normal-size text.
  lhci ≥95 does NOT prove no contrast issue — Lighthouse samples nodes and a
  single small low-coverage element (e.g. a `<time>` at text-xs) slips through.
  Review method: grep new pages for `text-ivory-mut`/`text-ivory-low` and
  compute the ratio against the page bg yourself. Contrast ratios for the
  Twilight tokens on #0f1115: ivory 15.20, ivory-dim 8.65, amber 8.64,
  ivory-mut 4.17 (FAIL), [ivory-low even lower].

### MAJOR — OG-font fs read is the spec §9 risk; local `next start` ≠ Vercel

- **`readFile(path.join(process.cwd(), 'src/app/_og/fonts', ...))` with a
  COMPUTED base + non-literal readFile arg is the exact shape @vercel/nft
  static tracing tends to MISS.** `src/` is a source dir, not part of `.next`
  output. Local `next start` has `src/` on disk so it renders — that does NOT
  prove the Vercel traced-lambda bundle includes the fonts. Don't accept
  "OG returns png locally" as proof. Require either a real Vercel preview
  render (serif, not tofu) OR a tracing-robust load: `fetch(new URL(
'./fonts/X.ttf', import.meta.url)).then(r=>r.arrayBuffer())` (single static
  literal nft traces reliably). NOTE: `import.meta.dirname` DOES resolve in
  this codebase (next.config.ts uses it) — so a plan's blanket "import.meta.url
  doesn't resolve in App Router" claim warrants a second look.
- A partial/dev `.next` (no `*.nft.json`, no `required-server-files.json`)
  can't be used to confirm tracing — those only appear in a full `next build`.

### Process note — codex + Opus complementarity held

- codex found both C1 (CSP/dev-eval) and C2 (privacy IDB copy) independently;
  my Opus pass added M1 (contrast, from repo-internal test precedent) and M2
  (font tracing, from spec §9). Neither would have been complete alone. Run
  codex every round; the empirical browser/contrast verification is the Opus
  value-add codex can't do (read-only sandbox).

## Phase 5C patterns (2026-05-31, MDX content system)

### Task 1 (MDX toolchain) — config-advertises-more-than-loader-handles is MINOR when plan-faithful + greenfield

- **codex flagged MAJOR: `pageExtensions: ['ts','tsx','md','mdx']` but `createMDX()`
  passes no `extension` opt → @next/mdx defaults to `/\.mdx$/` (confirmed in its
  source: `const extension = pluginOptions.extension || /\.mdx$/`), so a `.md`
  page would be ROUTED by Next but NOT MDX-compiled.** Real mechanism, but I
  down-classified to MINOR. The deciding factors: (1) NO live trigger — every 5C
  content file is `.mdx` (features/\_content, content/docs, fixtures, probe), zero
  `.md` files exist, build green; (2) failure mode is a HARD BUILD ERROR on a
  future `.md`, not a silent wrong-render — self-announcing, not a privacy/
  correctness landmine; (3) the PLAN ITSELF prescribes `'md'` in pageExtensions,
  so the implementer matched the plan faithfully (not drift). Rule reinforced:
  a config that advertises capability the loader doesn't provide is a footgun
  worth fixing, but it's MINOR (not MAJOR) when there's no live trigger, the
  failure is loud, and the implementer matched the plan. Fix offered: add
  `extension: /\.mdx?$/` to createMDX (keeps advertised .md support honest) OR
  drop 'md'. Don't inflate plan-faithful non-blocking consistency nits to MAJOR.

### Task 1 verification methods that paid off (reuse each round)

- **zod dual-version scare = confirm the IMPORTER block, not just grep.** Lockfile
  showed both `zod@3.23.8` and `zod@4.4.3`. The `apps/web:` importer block
  resolves the DIRECT dep to 4.4.3; the 3.23.8 is a transitive (`{}` snapshot,
  pulled by chromium-bidi). Always check the importer's `specifier/version` pair
  for the package under review before calling a duplicate a regression. Also
  grep-confirmed ZERO pre-existing zod consumers → the v4 major is greenfield.
- **Optional peer ≠ installed.** `@mdx-js/react` appeared in the lockfile only as
  an `optional: true` peerDependenciesMeta entry INSIDE @next/mdx's package def —
  no top-level `@mdx-js/react@...:` snapshot node = not installed. Don't read a
  peer-decl line as proof of a forbidden install.
- **Verify a Shiki theme string is real before trusting the build.** `find`
  node_modules for `github-dark-default` (present in @shikijs/themes@4.1.0). A
  typo'd theme string would fail at build, not lint — worth a 1-line check.
- **CSP byte-identical is the load-bearing 5C check (per 5A C1).** Confirmed
  headers()/script-src unchanged: no 'unsafe-eval' added to prod. This is THE
  regression to guard every 5C round that touches next.config.ts.

### Task 3 (SEO builders) — two codex MAJORs → MINOR; "validation lives upstream" + "optional schema.org prop"

- **codex MAJOR "builders accept empty arrays and still emit roots" → MINOR
  because the inputs are STRUCTURALLY UNREACHABLE.** howToLd is fed
  `fm.howToSteps`, which the zod schema enforces `z.array(stepSchema).min(1)`
  (schema.ts) — an empty steps array fails the BUILD at parse, the correct
  upstream layer (the spec's fail-fast-at-build decision). faqPageLd is fed
  `dedupeFaq(allDocs faq[])` (content-guaranteed non-empty; and an empty
  FAQPage is benign markup, not an error). breadcrumbLd call sites all pass
  non-empty literals. Rule: when a "missing input guard" finding targets a
  defensive case that a typed/validated UPSTREAM layer already makes
  impossible, it's MINOR (redundant hardening), not a reachable defect. Verify
  by tracing the actual call sites + the schema `.min()` constraints before
  accepting the severity.
- **codex MAJOR "HowToStep lacks 1-indexed position" → MINOR (optional
  schema.org property).** `position` is OPTIONAL on HowToStep — schema.org
  conveys step order via ARRAY ORDER, which the builder preserves. The plan's
  own reference impl omits position; the implementer matched it verbatim;
  Google DEPRECATED HowTo rich results in 2023, so this is valid-(non-erroring)-
  markup territory, not a rich-result requirement. A "this list type doesn't
  expose explicit ordering like the others" consistency note is MINOR, not a
  correctness/spec defect. Lesson: check whether a schema.org property is
  required vs optional (and whether the rich result still exists) before
  treating its absence as a defect.
- **`new URL(rootRelativePath, base)` is trailing-slash-robust — verify once,
  trust the pattern.** For breadcrumb/canonical absolute URLs, a root-relative
  path ('/docs') REPLACES the base path, so `new URL('/docs','https://x.app')`
  and `...'https://x.app/'` both yield 'https://x.app/docs' (no double-slash).
  resolveSiteUrl() also strips trailing slash. The absolute-URL contract holds
  in every env (explicit/Vercel/localhost). Confirmed with a node one-liner.
- **Process: down-classifying BOTH codex findings in one task is fine when each
  has a concrete reason** (unreachable-input / optional-property). This is NOT
  rubber-stamping — it's the Phase-3 lesson (codex over-classifies; verify the
  REAL impact) applied twice. Both findings still recorded as MINOR follow-ups,
  not buried.

### Task 2 (zod schema + loader + registry) — TWO MAJORs masked by local worktree state (round 1)

- **MAJOR #1 — clean-checkout ENOENT (local-green ≠ clean-clone-green).** An empty
  content dir (`src/content/docs/`) that exists ON DISK in the worktree makes
  `fs.readdirSync(dir)` succeed locally, but git DOES NOT TRACK EMPTY DIRS — so a
  fresh `git checkout <sha>` / CI clone has no such dir and readdirSync throws
  ENOENT, breaking routeList()/registry.test/sitemap/generateStaticParams. The
  full local suite (132/132) + `next build` were BOTH green and masked it.
  Detection method that nailed it: `git ls-files <dir>` (empty → untracked) +
  confirm git can't track empty dirs + `node -e readdirSync(missing)` throws
  ENOENT. Reuse rule: any `fs.readdirSync`/`existsSync`-free directory read in a
  loader is suspect — verify the dir is TRACKED (has ≥1 committed file), not just
  present on disk. Cheapest fix: `if (!fs.existsSync(dir)) return []`. This is the
  same family as the Phase-5A "local next start ≠ Vercel traced bundle" trap —
  local filesystem state lies about what a clean environment has.
  GATEKEEPER-CHECK CANDIDATE: grep loaders for readdirSync without an existsSync
  guard; require the read dir to contain a tracked file or a .gitkeep.

- **MAJOR #2 — dual-read drift: slug≠filename draft-leak (spec §10 named risk).**
  `getAllDocSlugs()` draft-filters each file by ITS OWN frontmatter then returns
  the frontmatter `slug`; `allDocs()` RE-READS via `getDocFrontmatter(slug)` which
  derives the filename from `slug.join('-')`.mdx. Two independent reads keyed
  differently (one by filename-on-disk, one by frontmatter-slug) → if any file's
  slug ≠ its filename, they target DIFFERENT files: a draft (draft:true) file can
  be read+published in prod, or the wrong doc routed. Latent (v1 docs are
  filename===slug, so unreachable with correct authoring) but it SILENTLY breaks
  the production draft-drop contract — classified MAJOR not MINOR because (a) it's
  a privacy/correctness contract (draft must not publish), (b) the spec §10
  EXPLICITLY lists "dual-read drift" as a risk, (c) nothing enforces the
  convention the plan relies on. Fix: enforce `basename === slug.join('-')` at
  discovery (throw on mismatch) OR return parsed records from discovery so the
  second read is eliminated. Lesson: when a loader reads the same content TWICE
  via DIFFERENT keys (filename vs frontmatter field), check that the keys are
  provably identical; if a convention links them but nothing enforces it, that's
  a MAJOR drift seam, not a nit.

- **codex was strong here (run it every round — confirmed again).** codex
  independently found BOTH MAJORs + the prevNext idx===-1 off-by-one + the
  symlink-lexical-guard note, AND correctly cleared the things it could (path
  guard robust vs lexical attacks, camera-only→cam-only, mdxStub no prod leak).
  My Opus value-add was severity calibration (ENOENT→MAJOR via the git-untracked-
  empty-dir mechanism; slug-drift→MAJOR via the spec §10 privacy framing) +
  verifying the §8.2 titles/codec copy/pinned map that codex's security-scoped
  prompt didn't cover. Symlink escape → MINOR (first-party in-repo build-time
  content, no attacker-writable path). prevNext → MINOR (catch-all pre-validates
  slug, unreachable in prod).

- **Severity discipline: this is the FIRST CHANGES_NEEDED of 5C.** Tasks 1+3 were
  APPROVE-with-MINOR (I down-classified codex over-calls). Task 2 has GENUINE
  MAJORs — the difference is reachability + contract: Task-3's "empty array" was
  unreachable AND benign; Task-2's slug-drift is unreachable-today but breaks a
  privacy contract the moment authoring drifts, and the ENOENT is reachable on
  the very next clean clone. Don't let a streak of down-classifications bias the
  next call — judge each on reachability × contract-severity.

### Task 4 (mdx-components + Prose + Shiki CSS) + Task 12 (next.config) — APPROVED w/ MINOR

- **MDX element-map `code` override hits BLOCK code too (codex MAJOR → MINOR).**
  An MDX `useMDXComponents` `code` entry has NO inline-vs-block guard, so
  rehype-pretty-code's block `<code>` (structure: figure[data-rehype-pretty-
  code-figure]>pre>code>span(per-token inline color)) ALSO receives it. Verified
  the real impact before sizing: per-token foreground SURVIVES (child <span>
  inline color beats the parent <code>'s `color`); the bg is the SAME --surface
  as the pre wrapper (invisible); the only true effect is fontSize:0.875em →
  block code renders ~11.4px vs the intended 13px + a tiny inset. Render correct +
  Playwright-verified → MINOR, not MAJOR. But the comment "Only applied to bare
  code NOT inside a pre" is FALSE (no guard) — flag the lying comment + the
  font-shrink. Fix: inline-only via CSS `:not(pre) > code`, or guard block nodes
  (data-language) returning plain <code {...rest}>. Lesson: when an element-map
  styles a tag that a rehype plugin ALSO emits inside a wrapper, trace where the
  per-token styles actually live (child spans here) before sizing the impact —
  "override" doesn't always mean "broken render."
- **Two link-safety MINORs in the same map (codex Low, agreed MINOR):** (1)
  href.startsWith('/') mis-classifies protocol-relative `//example.com` as
  internal (routes via TransitionLink, no target/rel) — reject '//'. (2) external
  <a> spreads {...rest} AFTER target/rel, so a raw-<a>-JSX author could strip the
  noreferrer — put fixed target/rel AFTER the spread. KEY SIZING FACTOR: 5C MDX is
  FIRST-PARTY in-repo content (no untrusted/user MDX), so neither is attacker-
  reachable — they need a first-party author to write the bad link. Defensive
  hardening, not a live hole → MINOR. (Had it been user-supplied MDX, the
  rest-after-rel ordering would be a genuine security MAJOR — the threat model
  determines the tier.)
- **Token-only audit method that worked:** grep `#[0-9a-fA-F]{3,8}` across the
  TSX + the APPENDED globals.css lines (git diff +lines only) → zero. Then
  enumerate every `var(--x)` and confirm each resolves in tokens.css/theme.css
  (loop with grep) → no typo'd vars. Then recompute AA contrast against BOTH the
  page bg AND --surface (code/blockquote sit on surface) with a node luminance
  one-liner. This three-step (no-hex / vars-resolve / contrast) is the full
  no-raw-hex + a11y gate for any 5C UI task.
- **Task 12: remark-frontmatter MUST be first in remarkPlugins** to strip the
  leading --- YAML from the compiled body (else @next/mdx renders raw YAML as an
  hr+paragraph). gray-matter reads frontmatter independently, so the typed
  registry is unaffected — the plugin only changes what <Body/> renders.
  extension:/\.mdx?$/ closes the Task-1 'md'-pageExtensions MINOR. CSP byte-
  identical (verified the diff touches only the createMDX block).

### codex stdin footgun (workaround)

- **`codex exec` in background can swallow stdin → empty "Reading additional
  input from stdin..." output.** Fix: append `< /dev/null` to the codex command
  to close stdin. Re-ran clean and got a strong review. Don't conclude codex is
  down on an empty-output run — retry with stdin closed first.

### Task 2 round 2 — CONVERGED (both MAJORs fixed cleanly, no siblings)

- **The round-1 prescriptions landed exactly.** ENOENT → `existsSync` guard
  before readdirSync + tracked .gitkeep (the gitkeep correctly excluded from
  parsing via `f.endsWith('.mdx') && f !== '.gitkeep'`). Dual-read drift →
  refactored to a TRUE single-read: getAllDocs() is the sole fs enumeration
  returning DocFrontmatter[], allDocs/docsBySection/prevNext consume it
  directly, AND a `basename === slug.join('-')` invariant throws at discovery.
  Verified no new adjacent defect: the only surviving getDocFrontmatter(slug)
  caller is getDocBySlug (a legit single-doc accessor, not the aggregation
  drift path). This is convergence (round1: 2MAJ+4MIN → round2: all cleared,
  strictly better, ZERO new siblings), the opposite of the Phase-4 whack-a-mole
  that triggered escalation. The difference: a structural refactor (eliminate
  the second read) closes the whole class, vs a point-patch that births a sibling.
- **Residual coverage nit worth naming (MINOR, didn't block):** an invariant
  that THROWS but has no fixture exercising the throw path is untested — a
  regression deleting the throw passes all tests. Flag it, don't block, when the
  invariant logic is correct and the trigger needs malformed authoring that v1
  content doesn't contain. Suggested the 1-line mismatch fixture.
- **When to skip re-running codex on a re-review (judgment, not a rule):** for a
  TIGHT, well-bounded fix diff where every round-1 codex finding maps 1:1 to a
  visible fix I can trace + re-verify by reading the diff and running the suite,
  the Opus pass alone is sufficient and I say so transparently + offer to run
  codex if the lead wants. This is NOT skipping codex on substantive new code —
  it's a focused fix verification. (Contrast: always run codex on a fresh task's
  novel code per the every-round rule.)

### Task 5 (static Toc/Breadcrumbs/DocsSidebar) — REJECTED a codex MAJOR (requirement misread)

- **codex MAJOR "TransitionLink is 'use client', violates no-client-JS" → NOT A
  FINDING.** The phrase "no client JS / static RSC" in the plan Task 5 is
  SCOPE-LIMITED to scroll-spy (the literal next clause: "no scroll-spy in v1";
  non-goal list confirms "scroll-spy → post-v1"). The SPEC (line 53) AFFIRMATIVELY
  requires "TransitionLink for internal links" + calls the components "zero JS" in
  the SAME sentence — i.e. "zero JS" = no NEW interactive/scroll-spy code, NOT
  "zero client-component leaves". TransitionLink is a progressive-enhancement
  anchor (renders a real <a href>, works JS-disabled) and is the foundation of the
  entire 5C View-Transition design — the SAME pattern already approved in Task-4
  mdx-components. Lesson: when codex flags a "violates requirement X" MAJOR, read
  the requirement's EXACT scope in plan AND spec before accepting — "no client JS"
  almost always means "no new client interactivity," not "no client component
  anywhere," especially when the spec affirmatively mandates a shared client leaf.
  Reject with the spec citation; don't down-classify to MINOR (it's not a defect
  at all).
- **Reachability gate on key-collision nits:** codex's slug.join('-') key-collision
  MINOR is real in theory but UNREACHABLE in v1 — the Task-2 invariant + Task-7
  test pin all v1 doc slugs to single-segment (nested URLs deferred). Multi-segment
  collision can't occur. Kept it MINOR (reusable-component safety) but flagged the
  unreachability so it's not treated as urgent. Same class as the registry's own
  '-'-join keying.
- **"Comment lies about behavior" recurs (3rd time in 5C):** Task-4 `code`
  ("inline only" but no guard), Task-5 Toc ("collapsed to 3" but math is
  (level-2)\*12). Pattern: implementers write an intent comment then the code drifts.
  Always diff the comment's CLAIM against the actual code. MINOR each, but worth a
  gatekeeper-check: flag comments that assert a behavior the adjacent code doesn't
  enforce.
- **Decorative-element contrast exemption (confirmed correct usage):** ivory-low
  (#54514a = 2.39:1, FAILS AA-normal) is acceptable HERE because it's used ONLY on
  the breadcrumb '/' separator marked aria-hidden="true" — WCAG exempts purely
  decorative, AT-hidden content from contrast. Good that the implementer paired the
  low-contrast token WITH aria-hidden. Check: any sub-3:1 token must be on an
  aria-hidden/decorative element, never on informational text.

### Task 6 (/features/[mode] pages) — APPROVED clean (page-composition checklist)

- **The §8.2 title contract held end-to-end:** generateMetadata passes the BARE
  fm.title (no brand suffix), the test pins all 3 segments verbatim, root template
  appends ' — record me'. Verify the page passes the bare segment AND that the
  bodies/frontmatter carry the exact segment (cross-checked Task-2 + Task-6).
- **Page-composition gating checklist (reuse for Task 7):** (1) dynamicParams=false
  - generateStaticParams = pinned set; (2) notFound() on unknown slug BEFORE
    reading body, metadata returns {} (belt path); (3) single <h1> from the page,
    MDX bodies start at ## (correct outline — grep `^# ` in bodies must be empty);
    (4) bodies export NO metadata/frontmatter const (gray-matter is sole source);
    (5) JSON-LD shapes from validated frontmatter; (6) OG route at the path matching
    the Task-1 tracing key, Node runtime (no edge export — fs font read), reuses
    ogImage/SIZE; (7) codec copy MP4·H.264(AAC)-first; (8) token-only no-raw-hex
    across ALL route files incl. layout.
- **Cross-task dependency note (informational, not a defect):** feature pages'
  related-docs links (/docs/permissions, /docs/codecs) 404 until Task 7 lands the
  docs. Both are real v1 slugs → expected in-progress state. Don't flag a forward
  cross-link to an in-flight sibling task as a defect; note it informationally.
- **codex ran INCOMPLETE (ended mid-.next-manifest-inspection, no Findings block).**
  Per the Phase-4 rule: when codex can't deliver a verdict, the Opus pass stands
  alone — state it transparently + offer a re-run. Did NOT burn a second full codex
  cycle since every contract check was independently confirmed. (Distinct from the
  stdin-swallow footgun — that was fixable with `< /dev/null`; this was a
  mid-investigation stop.)

### Task 7 (/docs) — MAJOR: a SPECIFIED deliverable stubbed out (empty TOC); CONTRACT_CHANGE accepted

- **MAJOR — empty TOC (`headings: []`) is a stubbed-out spec deliverable, not a
  deferral.** The page hard-coded `headings: TocHeading[] = []` with a "too
  complex, defer to post-v1" comment. But the populated static TOC was a NAMED
  deliverable (plan L173/L179/L245 "static Toc aside from rehype-slug heading ids",
  spec goal "static TOC + sidebar on each doc"), rehype-slug/autolink were
  installed FOR it, AND the plan prescribed the exact method ("lightweight
  server-side parse of the body's ## / ### lines — keep it static"). The loader
  already readFileSync's the body, so the extraction is low-effort. Rule: when an
  implementer defers a deliverable as "too complex," CHECK whether the plan named
  a simple method + whether the infra (here rehype-slug) was installed for it —
  if so, it's an under-delivery (MAJOR), not a legitimate deferral. The "defer to
  post-v1" comment is a tell to verify against the plan's scope.
- **Severity nuance — invisible stub vs broken UI:** the empty TOC is NOT CRITICAL
  because Toc only renders the "Contents" label when headings>0, so it ships an
  INVISIBLE empty <nav>, not a visibly-broken affordance (no a11y/build/CLS break).
  That's the line between MAJOR (missing in-scope feature, blocks 10/10) and
  CRITICAL (breaks the page). Check what the stub actually RENDERS before sizing.
- **Catch-all join-collision (codex Medium → MINOR):** `slug.join('-')` guard means
  /docs/getting/started aliases to getting-started.mdx. GATED IN PROD by
  dynamicParams=false (Next 404s param arrays not in generateStaticParams;
  ['getting','started'] ≠ ['getting-started']). So NO prod exploit — only a dev-time
  wrong-render of first-party content. → MINOR (defense-in-depth: the guard should
  enforce slug.length===1 itself, not lean on the router). Lesson: a guard that
  "relies on dynamicParams=false" is correct in prod but not self-sufficient; the
  exactness check is cheap and matches the spec's "double-guarded" intent. Sized as
  MINOR because reachability is dev-only + content is first-party.
- **CONTRACT_CHANGE ruling method (per-doc OG → single docs OG):** ACCEPTED. Verified
  (1) the framework constraint is REAL (Next 15: metadata route after [...slug] →
  "Catch-all must be the last part of the URL"), (2) the dropped thing is NOT a hard
  spec requirement (§8.4 lists only HowTo+FAQPage, not per-doc OG), (3) the kept
  thing IS the spec's chosen direction (nested-URL via [...slug], deferred not
  rejected), (4) cleanup done (stale file removed, tracing key fixed by staff). When
  all 4 hold, accept the framework-forced change. The alternative ([slug] refactor)
  would trade a spec-chosen future for a non-required feature — wrong tradeoff.
- **"Comment lies about behavior" — now 3x in 5C** (Task-4 code, Task-5 Toc indent,
  Task-7 Toc "renders CONTENTS label"). Firmly a gatekeeper-check candidate: flag
  any comment asserting behavior the adjacent code doesn't produce.
- **codex caught the join-collision I'd have to dig for; I caught the TOC-is-a-spec-
  deliverable framing codex undersized (it called the TOC "Low").** Complementary
  again: codex = mechanism/security depth, Opus = spec-deliverable + severity calibration.

### Task 9 + Task 7 round 2 — both APPROVED (TOC-fix convergence + dep correctness)

- **Task 7 r2: the slug-match guarantee is BY CONSTRUCTION when you use the same
  library.** getDocHeadings slugifies headings with `github-slugger` — which is
  the EXACT package `rehype-slug` depends on internally. So TOC `#id` anchors
  match the rendered heading ids by construction (same lib, same stateful
  `new GithubSlugger()` duplicate-disambiguation), not by coincidental algorithm
  match. When reviewing "do these slugs match rehype-slug?", the strongest answer
  is "it IS rehype-slug's slugger." The only residual divergence risk is the
  manual inline-markdown pre-strip (bold/code/links) vs rehype-slug's plain-text
  extraction — verify the real headings don't have markup that'd mismatch.
- **Task 7 r2 residual MINOR — regex heading-extractor doesn't skip code fences.**
  `^(#{2,3})\s+(.+)$/gm` over raw MDX matches `##` lines INSIDE `` fences too →
phantom TOC entry with a dead anchor (rehype-slug wouldn't emit that id).
Detection: `awk '/^``/{f=!f} /^#{2,3} /{if(f)print}'` over the docs → confirmed
  zero v1 fenced headings (latent). MINOR (first-party content, shipped TOCs
  correct). Fix: track fence state. Lesson: any regex-over-markdown extractor must
  consider code fences — flag it even when latent.
- **Task 9: dependency vs devDependency is determined by WHERE it runs.**
  github-slugger is used in loader.ts's getDocHeadings, which runs at BUILD (for
  generateStaticParams/sitemap) — so it's a runtime `dependency`, NOT devDep. It
  was a real missing-transitive (only present via rehype-slug's tree → a clean
  install or Vitest resolution would break). Check: a "missing transitive that
  happened to resolve" is a latent clean-install break (same family as the Task-2
  ENOENT). Declaring it direct is the fix.
- **lhci-config vs lhci-PASS split:** Task 9's deliverable is CONFIGURING the lhci
  urls (verifiable by inspection); the actual ≥90/0.95 PASS is Task 10's gate.
  Don't block Task 9 on a PASS it doesn't own — but FLAG HARD that Task 10 must
  run it (it's the only enforcement of the new routes' budget; false-green if
  skipped). Added to my standing Task-10 gate checklist.
- **Cross-round follow-up closure:** the Task-7-r2 commit also added the
  basename!==slug mismatch test I flagged as a residual MINOR in Task-2 r2. Track
  residual MINORs across tasks — implementers sometimes fold them into a later
  commit; credit it when they do.

### Task 8 (View-Transition wiring) — APPROVED; 3 a11y MINOR; codex Major down-classified

- **codex Major "3 identical 'Learn more →' link names" → MINOR.** Real WCAG 2.4.4
  concern, BUT: (a) in-context purpose is satisfied (each link follows its mode
  <h3>), and (b) Lighthouse's AUTOMATED a11y audit does NOT score "identical link
  text / different URL" — it's an axe/manual-only check — so it does NOT threaten
  the global 0.95 a11y GATE. Severity-sized on gate-impact + in-context clarity →
  MINOR with a recommended per-link aria-label. Lesson: before sizing an a11y
  finding against the 0.95 Lighthouse gate, know which findings Lighthouse
  actually SCORES (empty/missing names, contrast, labels) vs axe-only (duplicate
  link text, landmark semantics) — the latter don't fail the automated gate.
- **Landmark labels go STALE when a task adds links under a pre-existing scoped
  aria-label.** Task 8 added route links (Features/Docs) under LandingNav's
  aria-label="Page sections" (in-page anchors) and LandingFooter's "Legal" — both
  labels now misdescribe their contents. THIS TASK introduced the mismatch, so it
  owns the fix (rename to "Site navigation"/"Footer navigation"). Review heuristic:
  when a diff adds links/items to an EXISTING labeled landmark, re-read the label
  against the NEW contents — a label that was accurate before can be made wrong by
  an addition. codex caught both; good complementary find.
- **Type-safe pinned mapping is the strongest off-by-one guard.** featureSlug:
  FeatureSlug (the registry union) makes the card↔slug mapping COMPILER-ENFORCED —
  a typo or engine-string ('screen+cam+cursor') fails typecheck. Better than a
  comment. When reviewing a "pinned" mapping, check it's TYPED against the source
  union, not just commented.
- **Local-idiom token forms differ by surface — match the surrounding code.**
  Landing uses var(--color-amber) (the @theme aliases); docs/features use
  var(--amber) (base tokens). Both resolve. Task 8 correctly used --color-\* (the
  landing idiom). Don't flag a token-form difference as inconsistency when each
  surface consistently uses its own form — verify the form resolves + matches the
  FILE's neighbors, not a global single form.
- **Plain <Link> vs TransitionLink — check what the SPEC actually mandates.** The
  spec required TransitionLink ONLY on the ModeTriptych "Learn more" (the
  View-Transition deliverable); nav/footer cross-links were "add entries" with no
  TransitionLink requirement → plain <Link> is fine. Don't demand TransitionLink
  everywhere just because the task is "the View-Transition task" — scope it to the
  spec's named affordance.

### Task 10 (finale: e2e + prod-verify + gate + docs) — APPROVED; independent verification of the 3 dev-e2e-blind contracts

- **I re-ran a fresh `next build` to INDEPENDENTLY verify the OG font tracing
  (faa8d01 risk) rather than trust the lead's report.** The current worktree
  `.next` was a partial/dev build (NO `*.nft.json` — per the Phase-5A learning, a
  partial .next can't confirm tracing). After `rm -rf .next && pnpm build`, both 5C
  OG nft manifests traced BOTH fonts: `docs/opengraph-image/route.js.nft.json` and
  `features/[mode]/opengraph-image/[__metadata_id__]/route.js.nft.json` each list
  GeistMono-Regular.ttf + InstrumentSerif-Regular.ttf. The faa8d01 tofu risk is
  CLEARED by independent reproduction. Lesson: for a PR-gating finale, reproduce
  the load-bearing prod-only checks yourself — a fresh build is worth the time;
  don't gate the branch on a report you can't see.
- **The OG tracing-KEY match is statically checkable WITHOUT a build:** the key in
  next.config (`/features/[mode]/opengraph-image`, `/docs/opengraph-image`) must
  equal the route id derived from the file path. features file at
  features/[mode]/opengraph-image.tsx → key matches; docs OG correctly moved to the
  docs/ level (the Task-7 contract change) with the stale [...slug] key replaced. Do
  this cheap static check first; it catches the silent-no-op key typo before a build.
- **prod-build 404 (dynamicParams=false) is verifiable from the prerender-manifest:**
  it lists ONLY the 9 real routes (3 features + 6 docs); unknown slugs aren't
  prerendered → hard-404 with dynamicParams=false. Confirmed the contract without
  needing to curl a running server.
- **e2e honesty check (the assertions that matter):** the content.spec.ts FAQ-match
  test parses the FAQPage mainEntity question names, asserts no duplicates, AND
  asserts each appears in the visible region — the real content-vs-markup match.
  §8.2 titles asserted EXACTLY (segment + " — record me"). Console-clean with a
  legitimate Vercel-script stub (env artifact, preserves the real assertion — the
  Phase-4 "documented env workaround that keeps the assertion" pattern). Correctly
  does NOT assert the dev-404 and excludes OG routes (404 in dev) — honest deferrals
  matching the plan, not weakened tests.
- **a11y nuance for the lhci=1.00 claim:** PROGRESS reports a11y=1.00 on
  /features + /docs. My Task-8 a11y MINORs are on the LANDING (/), which lhci tests
  separately — so 1.00 on the CONTENT routes is consistent (landing nits don't
  affect the features/docs runs). Verify which ROUTE a finding lives on before
  treating it as contradicting a per-route gate score.
- **Lead-degraded-scribe docs were accurate:** staff wrote the 5 docs covering for
  the unresponsive scribe; spot-checked PROGRESS (records the contract change +
  real lhci numbers transparently), FRONTEND (routes/registry/seam match landed
  code), against reality — accurate, not aspirational. Approved.
