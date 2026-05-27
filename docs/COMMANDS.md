# Commands

All commands run from the workspace root via pnpm + Turborepo.

## Development

```bash
pnpm install                              # install all workspace deps
pnpm dev                                  # turbo: dev across all packages (apps/web on :3000)
pnpm --filter @record-me/web dev          # just the web app
pnpm --filter @record-me/recorder test:watch  # watch-mode unit tests
```

## Quality

```bash
pnpm typecheck                            # tsc --noEmit across all packages
pnpm lint                                 # eslint flat config
pnpm lint:fix                             # eslint --fix
pnpm format                               # prettier --write
pnpm format:check                         # prettier --check (CI uses this)
pnpm test                                 # vitest across all packages with coverage
pnpm test:e2e                             # playwright in apps/web
pnpm lhci                                 # lighthouse CI (requires built app)
```

## Build

```bash
pnpm build                                # turbo: build packages then apps
pnpm clean                                # rm -rf .turbo node_modules dist .next coverage
```

## Recorder-specific

```bash
pnpm --filter @record-me/recorder test    # unit tests with coverage
pnpm --filter @record-me/recorder typecheck
```

## Agent harness

```
/spawn-record-me-team                     # spawn the 6-agent team against the latest plan
/spawn-record-me-team <plan-path>         # spawn against a specific plan
/plan <feature>                           # invoke superpowers:writing-plans
/ship                                     # alias for /spawn-record-me-team latest
/debug <bug>                              # invoke superpowers:systematic-debugging
/tdd <feature>                            # invoke superpowers:test-driven-development
/review                                   # invoke /code-review on current diff
/update-docs                              # scribe workflow on demand
/pr                                       # superpowers:finishing-a-development-branch
/verify <what>                            # built-in /verify
/init-phase <num> <name>                  # start a new phase
/agent-reflect <agent> <task>             # per-task reflection
/agent-distill                            # weekly journal → memory distillation
/agent-checkpoint                         # weekly codebase map refresh
```

## GitHub

```bash
./scripts/seed-labels.sh                  # create / sync labels from .github/labels.yml
./scripts/create-epics.sh                 # create the 6 phase epic issues
```
