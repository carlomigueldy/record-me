# Architecture

record-me is a pnpm + Turborepo monorepo with **one deployed app** and
**three internal packages**. See
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 5 for the full
rationale.

## Workspace shape

```
record-me/
├── apps/web/                # Next.js 15 App Router · the only deployed surface
├── packages/recorder/       # @record-me/recorder · framework-agnostic engine
├── packages/ui/             # @record-me/ui · shadcn + Twilight tokens + brand primitives
└── packages/config/         # @record-me/config · tsconfig · eslint · tailwind preset
```

## Dependency rules

| Package               | Depends on                                                  | Forbidden imports                                                    |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/web`            | `@record-me/ui`, `@record-me/recorder`, `@record-me/config` | —                                                                    |
| `@record-me/recorder` | `@record-me/config`                                         | **React** (must stay framework-agnostic)                             |
| `@record-me/ui`       | `@record-me/config`                                         | `@record-me/recorder` (UI consumes recorder via apps/web hooks only) |
| `@record-me/config`   | ∅                                                           | Anything                                                             |

## Why this shape

- Isolating `recorder` allows unit-testing in jsdom without Next.js.
- Cleaner ownership boundaries for the multi-agent team (see § 11 of the spec).
- Single deploy target keeps Vercel config simple.

## Adding a new package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, `src/`.
2. Add to `pnpm-workspace.yaml` (already covered by `packages/*` glob).
3. Add a `path` reference to root `tsconfig.json`.
4. If consumed by `apps/web`, add to its `transpilePackages` in `next.config.ts`.
5. Update this doc.

## Build pipeline

`turbo.json` defines: `dev` (parallel, persistent), `build`, `test`, `test:e2e`,
`typecheck`, `lint`, `clean`. Each task declares `dependsOn` for correct ordering
(packages build before app; tests depend on builds).

## Adding a new app

For v1 the only app is `apps/web`. Phase 2+ may add `apps/extension` (Chrome
extension for cursor highlights, v2 hook).
