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
