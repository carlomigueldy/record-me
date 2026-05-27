# Quality gates

Source of truth: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 12.

## Four stages

### 1. Pre-commit (local · lefthook)

- `prettier --write` on staged files
- `eslint --fix` on staged TS/TSX/JS/JSX files
- `pnpm typecheck`

### 2. Gatekeeper (per task · in dispatch loop)

`record-me-gatekeeper` runs after every `[DONE:DONE]`:

- Ownership audit: `git diff --name-only` ⨯ implementer's `owns:` globs
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (affected via Turbo `--filter`)
- Console scan: `grep console.log` in the diff (allowed only in `*.test.*`)
- TODO scan: `grep 'TODO\|FIXME'` in the diff → MINOR

PASS / FAIL only — no subjective verdicts.

### 3. Pre-merge (CI · GitHub Actions)

`.github/workflows/ci.yml`:

- Full `pnpm typecheck`
- Full `pnpm lint`
- Full `pnpm test --coverage` (block under thresholds)
- `pnpm test:e2e` (with Chromium fake-device flags)
- `pnpm build`
- `pnpm lhci` on `/` and `/record` (budgets enforced)
- Sitemap + robots integrity check

### 4. Definition of done (10/10 bar)

See `docs/QUALITY_STANDARD.md`.

## Coverage thresholds (enforced in vitest configs)

| Package               | Lines | Functions | Branches | Statements |
| --------------------- | ----- | --------- | -------- | ---------- |
| `@record-me/recorder` | 90%   | 90%       | 85%      | 90%        |
| `@record-me/ui`       | 70%   | 70%       | 65%      | 70%        |
| `@record-me/web`      | 60%   | 60%       | 55%      | 60%        |

Never lowered to pass a PR. If a threshold blocks a legitimate change, raise it
to staff for re-evaluation.

## Lighthouse budgets

- Performance ≥ 90 (≥ 95 on /)
- Accessibility ≥ 95
- Best Practices ≥ 95
- SEO ≥ 95
- LCP < 1800 ms (error)
- CLS < 0.05 (error)
- INP < 200 ms (warn)
