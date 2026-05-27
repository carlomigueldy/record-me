---
description: Spawn the record-me shipping team against an implementation plan. Interactive plan picker if no path given. Reads .claude/teams/record-me-shipping.md blueprint, creates project-scoped team symlink, drives the dispatch loop until all tasks ship or escalate.
argument-hint: '[optional plan path]'
---

<!--
allowed-tools is intentionally omitted so the command inherits the session's
permissions. The lead needs broad access: Bash, Read, Edit, AskUserQuestion,
Task/Agent (to spawn teammates), TaskCreate/Update/List (team task list),
TeamCreate, SendMessage, and Skill (to invoke superpowers:using-git-worktrees
and superpowers:finishing-a-development-branch). Restricting via allow-list is
brittle here; the parent session's permissions already gate dangerous ops.
-->

You are the **Lead** of the record-me shipping team. Run the full spawn + dispatch workflow defined below. Continuous execution: do not pause to check in with the user between tasks. Only stop when all tasks ship, when all implementers are blocked, or on plateau escalation.

## Argument

Raw arguments: `$ARGUMENTS`

If `$ARGUMENTS` is non-empty, treat it as the plan path.
If empty, do the interactive picker (Step 1).

---

## Step 1: Pick the Plan

If `$ARGUMENTS` is empty:

1. Run `ls -t docs/superpowers/plans/*.md 2>/dev/null | head -10` to list the 10 most-recently-modified plans.
2. If zero results, abort with: `"No plans found in docs/superpowers/plans/. Run superpowers:writing-plans first."`
3. Use `AskUserQuestion` with the plan filenames as options. Question header: "Pick plan", question text: "Which implementation plan should the record-me shipping team execute?"

If `$ARGUMENTS` is a path:

1. Run `test -f "$ARGUMENTS"` — abort if it doesn't exist.
2. Run `grep -c "^### Task " "$ARGUMENTS"` — abort if zero matches (plan unparseable).

Set `plan_path` to the chosen file.

## Step 2: Preflight Checks

Run these checks. Abort with a clear error on any failure.

### 2a. Agent-teams flag

```bash
grep -q "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" .claude/settings.json
```

If missing, abort with:

```
Add this env var to repo-level .claude/settings.json:
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
```

### 2b. Blueprint exists

```bash
test -f .claude/teams/record-me-shipping.md
```

Abort if missing with: `"Blueprint missing at .claude/teams/record-me-shipping.md. Create it per docs/superpowers/specs/2026-05-27-record-me-design.md § 11."`

### 2c. Parse blueprint

Read `.claude/teams/record-me-shipping.md`. Extract YAML frontmatter (between first two `---` lines). Parse with `python3 -c "import sys, yaml; print(yaml.safe_load(sys.stdin))"` or equivalent. Validate:

- `name` exists
- `members` is a non-empty list
- Each member has `name`, `agent_type`, `model`

Abort if malformed.

### 2d. Derive names

```bash
plan_slug=$(basename "$plan_path" .md | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//')
team_name="record-me-shipping-${plan_slug}"
branch_name="feat/${plan_slug}"
```

### 2e. Collision check

```bash
test -d "$HOME/.claude/teams/${team_name}"
```

If exists, abort with: `"Team ${team_name} already exists. Shut it down first (send shutdown_request to its members, then rm -rf $HOME/.claude/teams/${team_name}/) or retry with a renamed plan."`

### 2f. Workspace state

```bash
git_dir=$(git rev-parse --git-dir)
common_dir=$(git rev-parse --git-common-dir)
```

If `git_dir != common_dir` (already on a linked worktree):

- Log: "Continuing on worktree: $(pwd) (branch: $(git branch --show-current))"
- Check `git status --short` — if dirty, ask user via `AskUserQuestion` whether to commit, stash, or abort.

If `git_dir == common_dir` (on main checkout):

- Invoke `superpowers:using-git-worktrees` with target branch `$branch_name`. Work continues in the new worktree.

### 2g. Codex availability (non-blocking)

```bash
which codex 2>/dev/null
```

If missing, log: `"WARNING: /codex:review unavailable. Principal will use native Opus review only."` Continue regardless.

## Step 3: Create the Team

### 3a. Invoke TeamCreate

Call `TeamCreate` with `team_name` from Step 2d. (Description: "record-me shipping team executing plan: $plan_slug")

This creates `$HOME/.claude/teams/${team_name}/config.json` and the corresponding task list directory.

### 3b. Create project-scoped symlink

```bash
mkdir -p .claude/teams
ln -sfn "$HOME/.claude/teams/${team_name}" ".claude/teams/${team_name}"
```

If `ln` fails (e.g., target dir not writable), log a warning and continue — runtime resolution still works via `$HOME/.claude/teams/`.

### 3c. Spawn each member from the blueprint

For each member in the blueprint's `members` array, spawn via the Agent tool with:

- `team_name`: from Step 2d
- `name`: member.name
- `subagent_type`: member.agent_type
- `model`: member.model
- `prompt`: see below per role

**For `record-me-principal`**, the spawn prompt is:

```
You are record-me-principal in team ${team_name}. Plan being executed: ${plan_path}.

The full plan text follows. Read it once on first message — it's your reference for spec compliance throughout this session.

--- BEGIN PLAN ---
<contents of $plan_path>
--- END PLAN ---

Wait for [REVIEW_REQUEST] messages from the lead. Follow your standing workflow (read your agent file).
```

**For all other members**, the spawn prompt is:

```
You are ${member.name} in team ${team_name}. Plan being executed: ${plan_path}.

Wait for [ASSIGNED] (or [GATE_REQUEST] / [DOC_UPDATE_REQUEST] for gatekeeper / scribe) messages from the lead. Follow your standing workflow (read your agent file).
```

### 3d. Create GitHub issues per plan task (Phase 2+)

Only run this step when `.github/ISSUE_TEMPLATE/` exists in the repo. Phase 1 itself does not auto-create per-task issues (chicken-and-egg).

For each task in the plan's dependency graph (Step 4), open a GitHub issue:

```bash
# Determine the phase from the plan filename (e.g. phase-2 → epic issue #2)
phase_num=$(basename "$plan_path" | sed -E 's/.*phase-([0-9]+).*/\1/')
epic_num=$(gh issue list --label "epic" --search "phase-${phase_num}" --json number --jq '.[0].number')

# Open one issue per task
for task in <iterate parsed tasks>; do
  gh issue create \
    --title "Task ${task.id}: ${task.name}" \
    --body "Auto-created by /spawn-record-me-team for plan ${plan_slug}.\n\n## Plan task\n\n${task.text}\n\n## Linked epic\n\n#${epic_num}" \
    --label "agent-task,phase-${phase_num},${task.type_label},${task.area_label}" \
    --assignee @me
done
```

Store the resulting issue numbers in the team's task metadata so message routing can update them.

## Step 4: Build Dependency Graph

1. Read the plan file.
2. Extract every task (lines matching `^### Task \d+:`).
3. For each task, parse the `Files:` block and any `depends on Task N` phrases.
4. Build the dependency graph:
   - Explicit: "depends on Task N" → task depends on N
   - Implicit: shared file in `Files: Create` or `Modify` → later task depends on earlier
5. `TaskCreate` all tasks (the team's task list at `$HOME/.claude/tasks/${team_name}/`).
6. Compute the initial frontier (tasks with zero unmet deps).

## Step 5: Dispatch Loop

Loop until all tasks are completed OR you escalate:

```
while open tasks exist:
  frontier = tasks with zero unmet deps AND no current owner
  for each frontier_task in frontier:
    impl = pick implementer using dispatch rules below
    if impl is free:
      SendMessage to impl: [ASSIGNED] task=<id>
        Files owned: <list from task>
        Work dir: $(pwd)
        Full task text: <verbatim>
      TaskUpdate(impl_task, owner=impl_name, status=in_progress)
  wait for any teammate message
  route by tag (see Step 6)
```

### Dispatch rules

Inspect the task's `Files:` list:

- Only `apps/web/src/**`, `packages/ui/**` → `record-me-sr-frontend`
- Only `packages/recorder/**`, `packages/config/**`, root configs → `record-me-staff`
- Only `apps/web/tests/e2e/**` OR task tagged `[e2e]` → `record-me-e2e`
- Anything touching `packages/recorder/**`, `turbo.json`, `pnpm-workspace.yaml`, OR tagged `[cross-cutting]` / `[architectural]` → `record-me-staff`
- Ambiguous → `record-me-staff`
- Concurrency cap: max 2 main implementers (sr-frontend, staff) in flight at once. Gatekeeper / scribe / e2e / principal run their own sub-pipelines.

## Step 6: Message Routing

When a teammate sends a message, route by tag:

### `[DONE:DONE]` from impl

1. `SendMessage` to `record-me-gatekeeper`:
   ```
   [GATE_REQUEST] task=<id>
   Implementer: <impl-name>
   Changed files: <git diff --name-only since impl's start sha>
   Before SHA: <sha>
   After SHA: <current HEAD>
   ```

### `[DONE:DONE_WITH_CONCERNS]` from impl

1. Read the concerns. If they're correctness/scope issues, send `[FIX_REQUEST]` back. Otherwise route to gatekeeper as above (concerns will surface in review).

### `[DONE:NEEDS_CONTEXT]` from impl

1. Read the question. Provide context via `[CONTEXT]` SendMessage to that impl.

### `[DONE:BLOCKED]` from impl

1. Diagnose:
   - Missing context → `[CONTEXT]` to impl, they retry.
   - Plan requires capability the impl lacks → reassign to `record-me-staff` with the BLOCKED report.
   - Plan is wrong → `[ESCALATE]` to user with the original report and your assessment.

### `[CONTRACT_CHANGE]` from impl

1. Read what changed (old shape → new shape).
2. Identify any in-flight implementers whose tasks reference this contract.
3. `SendMessage` each affected impl: relay the contract change.

### `[GATE_PASS]` from gatekeeper

If the original implementer was `record-me-e2e` (E2E sub-task — no doc updates needed), skip the scribe and route directly to the principal as in `[DOC_DONE]` below.

Otherwise, `SendMessage` to `record-me-scribe`:

```
[DOC_UPDATE_REQUEST] task=<id>
Implementer: <impl-name>
Plan task text: <verbatim from plan>
Changed files: <list>
Before SHA: <sha>
After SHA: <sha>
```

### `[GATE_FAIL]` from gatekeeper

1. `SendMessage` to the original impl:
   ```
   [FIX_REQUEST] task=<id>
   Source: gatekeeper
   <verbatim gatekeeper output>
   ```
   No review round consumed.

### `[DOC_DONE]` from scribe

1. `SendMessage` to `record-me-principal`:
   ```
   [REVIEW_REQUEST] task=<id>
   Implementer: <impl-name>
   Changed files (code + docs): <combined list>
   Before SHA: <sha>
   After SHA: <sha> (now includes scribe's doc commit)
   Plan task text: <verbatim>
   ```

### `[REVIEW_RESULT] APPROVED` from principal

1. `TaskUpdate(task, status=completed)`.
   1.5. Close the linked GH issue with a comment:
   gh issue close ${issue_number} --reason completed --comment "Closed by /spawn-record-me-team — task APPROVED. PR will follow."
2. Recompute frontier.
3. If task touched `apps/web/src/routes/`, `apps/web/src/pages/`, `apps/web/src/app/`, or new user-facing components → spawn E2E sub-task assigned to `record-me-e2e`:
   ```
   sub_task_id = "<original-id>-e2e"
   files = "apps/web/tests/e2e/<flow>.spec.ts"
   brief = original task text + APPROVED diff summary
   ```
   This sub-task runs in parallel with the next frontier task.
4. Continue the loop.

### `[REVIEW_RESULT] CHANGES_NEEDED` from principal

1. Track the round count for this task. Compare CRITICAL+MAJOR list from this round vs. previous round.
2. **Plateau check:** if this is the 2nd consecutive round with zero items cleared from the combined CRITICAL+MAJOR list → `[ESCALATE]` to user (Step 7).
3. Otherwise, `SendMessage` to the original impl:
   ```
   [FIX_REQUEST] task=<id> round=<n>
   Source: principal
   Critical:
   <verbatim from review>
   Major:
   <verbatim from review>
   ```

### `[REVIEW_ESCALATE]` from principal

1. `[ESCALATE]` to user (Step 7) with the principal's full message.

## Step 7: Escalation

Stop the loop. Surface to user with:

```
[ESCALATE] Team record-me-shipping-${plan_slug} stopped.
Reason: <plateau | all blocked | principal escalate>
Tasks completed: <n>
Tasks open: <n>
Open task details:
  - Task <id> "<name>" — <status>
    Outstanding CRITICAL: <count>
    Outstanding MAJOR: <count>
    Plateau rounds: <n>
Plan: ${plan_path}
Worktree: $(pwd)
Branch: ${branch_name}
Resume: re-run /spawn-record-me-team after addressing the blockers.
```

Wait for user direction. Do not auto-resume.

## Step 8: Completion

When all tasks are completed AND all reviews APPROVED:

### 8a. Holistic checks in the worktree

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm lhci
```

If any fails, synthesize a "holistic-<failure>" task. Send `[REVIEW_REQUEST]` to principal with the failure. Goes through the normal loop until clean.

### 8b. Finishing the branch

Invoke `superpowers:finishing-a-development-branch`. This skill handles PR creation.

When drafting the PR body, include:

- Plan link: `[<plan_slug>](docs/superpowers/plans/<file>.md)`
- Per-task summary (one bullet per completed task, pulled from `TaskList`)
- Aggregated MINOR follow-ups as a checkbox list (collected from every `[REVIEW_RESULT]` minor section)
- Test plan with checkboxes (per impl-asserted test)
- Files-changed summary grouped by app/package
- `Closes #${issue_numbers_joined_with_comma_hash}` referencing every GH issue closed during the run (Phase 2+)

### 8c. Cleanup

After PR is opened:

1. Issue "Clean up the team." (sends `shutdown_request` to all members).
2. Print the success summary:
   ```
   ✓ record-me-shipping-${plan_slug}
     Plan:        ${plan_path}
     Tasks:       <n> completed
     Rounds:      avg <x> per task, max <y>
     PR:          <gh url>
     Team name:   record-me-shipping-${plan_slug}
     Worktree:    $(pwd)
     Branch:      ${branch_name}
     Symlink:     .claude/teams/record-me-shipping-${plan_slug} → ~/.claude/teams/...
     Follow-ups:  <n> MINOR (listed in PR body)
   ```

Leave the worktree in place — Carlo reviews and merges manually.

---

## Failure Modes Reference

| Condition                                           | Handle                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| Agent-teams flag missing                            | Step 2a abort                                                      |
| Blueprint missing/malformed                         | Step 2b/2c abort                                                   |
| Plan unparseable                                    | Step 1 abort                                                       |
| Team name collision                                 | Step 2e abort                                                      |
| Symlink creation fails                              | Step 3b warn + continue                                            |
| Implementer silent > 5 min after `[ASSIGNED]`       | Resend once via SendMessage. Escalate if still silent.             |
| Gatekeeper silent > 2 min                           | Retry once. Fall back to running checks yourself (degraded).       |
| All 2 main implementers `[BLOCKED]` simultaneously  | Escalate (Step 7).                                                 |
| `/codex:review` unavailable mid-run                 | Principal continues with native Opus review only; logs the switch. |
| Plateau (2 rounds with zero CRITICAL+MAJOR cleared) | Escalate (Step 7).                                                 |

---

## Reference

Full design: [docs/superpowers/specs/2026-05-27-record-me-design.md](../../docs/superpowers/specs/2026-05-27-record-me-design.md)
Blueprint: [.claude/teams/record-me-shipping.md](../teams/record-me-shipping.md)
