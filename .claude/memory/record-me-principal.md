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
