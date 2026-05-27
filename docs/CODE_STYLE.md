# Code style

## TypeScript

- Strict mode. `noUncheckedIndexedAccess: true`. `exactOptionalPropertyTypes: true`.
- No `any`. Use `unknown` + narrowing.
- Prefer `type` over `interface` except for declaration merging.
- `import type` for type-only imports (enforced by `@typescript-eslint/consistent-type-imports`).
- Discriminated unions for state machines.

## Naming

- React components: `PascalCase` files (`RecDot.tsx`).
- Hooks: `camelCase` starting with `use` (`useRecorder.ts`).
- Utilities and modules: `kebab-case` (`negotiate-codec.ts`).
- Test files: `<source>.test.ts(x)` next to the source.
- E2E specs: `<flow>.spec.ts` in `apps/web/tests/e2e/`.

## React (Next.js 15)

- RSC by default. `'use client'` only at the leaf that needs interactivity.
- No `useEffect` for derivable state.
- No `setState` in render.
- Server actions over API routes when data is co-located with the page.

## Tailwind v4

- CSS-first. `@theme {}` for tokens, `@import 'tailwindcss'` for utilities.
- No hardcoded hex. Use the theme tokens (`bg-bg`, `text-ivory`, `text-amber`).
- No arbitrary-value classes for colors (e.g., `bg-[#0F1115]`) — use tokens.

## Recorder package

- No React import. Pure TypeScript.
- Public API surface documented in `packages/recorder/src/index.ts`.
- State machine transitions exhaustively covered by tests.

## Commits

Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`,
`perf:`, `ci:`. Scope optional (`feat(recorder):`).

No `Co-Authored-By` lines referencing AI/LLM models. No "Generated with" footers.
Commits and PRs must appear human-authored.

## PRs

- Feature branches off `main`.
- PR required, squash-merge only.
- Test plan in PR body (checkboxes).
- Reference closed GH issues via `Closes #N`.
- Before first commit in a session: `gh auth status` + verify
  `git config user.email` matches the GitHub-associated email.
