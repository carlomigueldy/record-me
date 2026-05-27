# record me

## Project overview

An editorial, privacy-first, browser-native video recording instrument built
on Next.js 15 + Vercel. Three recording modes (Screen + Camera + Cursor,
Screen + Cursor, Camera only) with download-to-disk. No accounts. No upload.

Monorepo: `apps/web` (Next.js 15 app) + three internal packages
(`@record-me/recorder`, `@record-me/ui`, `@record-me/config`). Self-improving
agent harness at `.claude/` with six specialists.

## Key documents

- [docs/superpowers/specs/2026-05-27-record-me-design.md](docs/superpowers/specs/2026-05-27-record-me-design.md) — full v1 spec
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — monorepo + dependency rules
- [docs/RECORDING.md](docs/RECORDING.md) — recording pipeline + recorder API
- [docs/DESIGN.md](docs/DESIGN.md) — design tokens + typography + component conventions
- [docs/FRONTEND.md](docs/FRONTEND.md) — route tree + hooks + component inventory
- [docs/SEO.md](docs/SEO.md) — SEO discipline + CWV contract
- [docs/SECURITY.md](docs/SECURITY.md) — privacy contract + headers
- [docs/TESTING.md](docs/TESTING.md) — test pyramid + coverage thresholds
- [docs/CODE_STYLE.md](docs/CODE_STYLE.md) — TypeScript, naming, React conventions
- [docs/COMMANDS.md](docs/COMMANDS.md) — every pnpm + slash command
- [docs/QUALITY_GATES.md](docs/QUALITY_GATES.md) — the 4-stage gate pipeline
- [docs/QUALITY_STANDARD.md](docs/QUALITY_STANDARD.md) — 10/10 bar, definition of done
- [docs/WORKFLOW.md](docs/WORKFLOW.md) — superpowers skills + phase cadence
- [docs/PROGRESS.md](docs/PROGRESS.md) — phase status (mirrors GH epics)
- [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md) — file inventory by owner
- [docs/AGENT_JOURNAL.md](docs/AGENT_JOURNAL.md) — chronological decision log

## Before you act — required reading

| If you're working on...                             | Read first                                           |
| --------------------------------------------------- | ---------------------------------------------------- |
| UI components, styling, tokens, theming             | [docs/DESIGN.md](docs/DESIGN.md)                     |
| Routes, pages, navigation, layouts                  | [docs/FRONTEND.md](docs/FRONTEND.md)                 |
| Recording engine, MediaRecorder, canvas compositing | [docs/RECORDING.md](docs/RECORDING.md)               |
| App-wide layout, root configs, Turbo pipeline       | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)         |
| Writing tests                                       | [docs/TESTING.md](docs/TESTING.md)                   |
| Running commands                                    | [docs/COMMANDS.md](docs/COMMANDS.md)                 |
| Privacy, headers, CSP                               | [docs/SECURITY.md](docs/SECURITY.md)                 |
| Quality gates, CI                                   | [docs/QUALITY_GATES.md](docs/QUALITY_GATES.md)       |
| Planning, workflow, skills                          | [docs/WORKFLOW.md](docs/WORKFLOW.md)                 |
| Quality verification, Playwright MCP                | [docs/QUALITY_STANDARD.md](docs/QUALITY_STANDARD.md) |

## Git conventions

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`,
  `chore:`, `perf:`, `ci:`
- Feature branches off `main`
- PR required, squash-merge only
- Before first commit in a session: `gh auth status` + verify
  `git config user.email` matches the GitHub-associated email
- **No LLM attribution in commits or PRs** — never add `Co-Authored-By` lines
  referencing AI/LLM models (Claude, GPT, Copilot). Never add "Generated with"
  footers. All commits and PRs must appear human-authored.

## Documentation maintenance

After completing a feature or significant change, update the relevant docs
before marking work done:

- **docs/PROGRESS.md** — check off completed items, mirror GH epic state
- **docs/ARCHITECTURE.md** — if monorepo structure or data flow changed
- **docs/FRONTEND.md** — if routes, components, or hooks changed
- **docs/DESIGN.md** — if tokens or UI components changed
- **docs/RECORDING.md** — if recorder public API changed
- **Root CLAUDE.md + AGENTS.md** — if project conventions changed (must stay
  byte-identical)

## Superpowers skills — mandatory workflow

Read [docs/WORKFLOW.md](docs/WORKFLOW.md) before starting any non-trivial task.
Key rules:

- Always use `superpowers:writing-plans` before implementing.
- **`frontend-design` is non-negotiable for any UI work** — new pages,
  component changes, layout, styling, theming, animations. Invoke before
  writing component code.
- Use `superpowers:using-git-worktrees` for parallel feature work.
- Use `superpowers:finishing-a-development-branch` to close out.
- Skills override default behavior. Check for applicable skills FIRST, before
  any response or code.

## record-me shipping team

For plan-driven feature work, prefer `/spawn-record-me-team` over manual agent
dispatch. It launches the 6-teammate team (sr-frontend, staff, gatekeeper,
scribe, e2e, principal) that iterates until the reviewer clears CRITICAL+MAJOR
findings.

- Spawn: `/spawn-record-me-team` (interactive plan picker, or
  `/spawn-record-me-team <path>`)
- Blueprint: [.claude/teams/record-me-shipping.md](.claude/teams/record-me-shipping.md)
- Full spec: [docs/superpowers/specs/2026-05-27-record-me-design.md](docs/superpowers/specs/2026-05-27-record-me-design.md) § 11
- Session-start reminder: enabled via `.claude/settings.json` hook (silenceable
  via `.claude/settings.local.json`)

## Quality standard — 10/10 or don't ship

Every agent must deliver production-quality, verified, working code. Read
[docs/QUALITY_STANDARD.md](docs/QUALITY_STANDARD.md) for the full verification
checklist. Key rules:

- Build, typecheck, and tests must all pass before marking work done.
- **Use Playwright MCP** (`browser_navigate`, `browser_snapshot`,
  `browser_take_screenshot`, `browser_console_messages`) to visually verify
  every UI change — no exceptions.
- "Done" means: code works, tests exist, UI is visually verified, console is
  clean, no regressions, docs updated, GH issue closed.
- Unacceptable: untested code, "should work" claims, TODOs instead of
  implementations, partial features that break existing functionality.

## Agent routing

For non-trivial tasks, auto-route to the right specialists:

- **UI/page/component work** → `record-me-sr-frontend`
- **Recording engine** → `record-me-staff`
- **Cross-cutting / root config / Turbo / CI** → `record-me-staff`
- **E2E tests** → `record-me-e2e`
- **Docs + memory** → `record-me-scribe`
- **Code review + agent self-edit review** → `record-me-principal`
- **Build/test/lint gate** → `record-me-gatekeeper`

When ambiguous → `record-me-staff`.
