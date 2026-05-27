# Codebase map

Auto-maintained by `/agent-checkpoint` (run weekly or after major merges).

Last regenerated: 2026-05-28 (Phase 1 bootstrap)

## record-me-sr-frontend

### apps/web/src (Phase 1: placeholders)

- `app/layout.tsx`
- `app/page.tsx`
- `app/record/page.tsx`
- `app/globals.css`

### packages/ui/src (Phase 1: scaffold only)

- `index.ts`
- `tokens.css`

## record-me-staff

### packages/recorder/src (Phase 1: capability probe only)

- `index.ts`
- `index.test.ts`

### packages/config (Phase 1)

- `tsconfig/base.json`
- `tsconfig/next.json`
- `tsconfig/package.json`
- `eslint/index.js`
- `prettier/index.js`
- `tailwind/preset.ts`
- `tailwind/theme.css`

### Root configs

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.json`
- `lefthook.yml`
- `lighthouserc.json`
- `vitest.workspace.ts`

## record-me-scribe

### docs/

- `ARCHITECTURE.md`, `DESIGN.md`, `FRONTEND.md`, `RECORDING.md`, `SEO.md`,
  `SECURITY.md`, `TESTING.md`, `CODE_STYLE.md`, `COMMANDS.md`,
  `QUALITY_GATES.md`, `QUALITY_STANDARD.md`, `WORKFLOW.md`, `PROGRESS.md`,
  `CODEBASE_MAP.md` (this file), `AGENT_JOURNAL.md`
- `superpowers/specs/2026-05-27-record-me-design.md`
- `superpowers/plans/2026-05-28-record-me-phase-1-bootstrap.md`

### Root

- `CLAUDE.md`, `AGENTS.md`, `README.md`, `LICENSE`

## record-me-e2e

### apps/web/tests/e2e (Phase 1: smoke only)

- `smoke.spec.ts`
