# record-me · Phase 1 · Bootstrap & Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Vercel-deployed pnpm + Turborepo monorepo for record-me with a six-member self-improving agent harness, complete documentation tree, GitHub repository with issue/PR templates and per-phase epic issues, and a green CI pipeline — ready for Phase 2 to begin building features.

**Architecture:** Single Next.js 15 app (`apps/web`) + three internal packages (`@record-me/recorder`, `@record-me/ui`, `@record-me/config`). Agent harness at `.claude/` mirrors the MesaGo pattern with `agents/`, `commands/`, `teams/`, `skills/`, `memory/`, `journal/`. GitHub workflow uses six phase epic issues; from Phase 2 onward, the spawn command auto-creates per-task issues.

**Tech Stack:** pnpm 9 · Turborepo 2 · Next.js 15 + React 19 · TypeScript 5 · Tailwind v4 (CSS-first) · Vitest 2 · Playwright 1.x · Lighthouse CI · lefthook · GitHub Actions · Vercel · `gh` CLI 2.x.

**Spec reference:** `docs/superpowers/specs/2026-05-27-record-me-design.md` (§§ 5, 8, 11, 12, 19).

---

## Pre-flight

Before starting Task 1, the executing engineer / agent must confirm:

- `node --version` reports `v22.x` (Node 22 LTS)
- `pnpm --version` reports `9.x` or higher (install with `corepack enable && corepack prepare pnpm@latest --activate`)
- `gh --version` reports `2.x` and `gh auth status` shows an authenticated account with `repo` scope
- `git config user.email` returns a GitHub-associated email (usually the `noreply` address)
- Working tree is clean: `git status` shows only the one prior commit (`docs: add record-me v1 design spec`)
- Current branch is `main`
- Working directory is `/Users/carlomigueldy/personal/record-me`

If any check fails, fix it before proceeding. Do not skip checks.

---

## File Structure Overview

This plan creates the following structure (top-level view; per-task tables show full paths):

```
record-me/
├── apps/web/                              # Next.js 15 app skeleton
│   ├── src/app/{layout,page}.tsx
│   ├── src/app/globals.css
│   ├── public/
│   ├── tests/e2e/.gitkeep
│   ├── playwright.config.ts
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
├── packages/
│   ├── config/                            # shared eslint, tsconfig, prettier, tailwind preset
│   │   ├── eslint/index.js
│   │   ├── tsconfig/{base,next,package}.json
│   │   ├── prettier/index.js
│   │   ├── tailwind/preset.ts
│   │   └── package.json
│   ├── ui/                                # @record-me/ui scaffold
│   │   ├── src/{index.ts,tokens.css}
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── recorder/                          # @record-me/recorder scaffold
│       ├── src/{index.ts}
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── package.json
├── docs/                                  # required reading
│   ├── ARCHITECTURE.md · DESIGN.md · FRONTEND.md · RECORDING.md
│   ├── SEO.md · SECURITY.md · TESTING.md · CODE_STYLE.md
│   ├── COMMANDS.md · QUALITY_GATES.md · QUALITY_STANDARD.md
│   ├── WORKFLOW.md · PROGRESS.md · CODEBASE_MAP.md · AGENT_JOURNAL.md
│   └── superpowers/{specs,plans}/         # (already exists from spec commit)
├── .claude/
│   ├── agents/record-me-{sr-frontend,staff,gatekeeper,scribe,e2e,principal}.md
│   ├── commands/{spawn-record-me-team,plan,ship,debug,tdd,review,update-docs,pr,verify,run,init,agent-reflect,agent-distill,agent-checkpoint}.md
│   ├── teams/record-me-shipping.md
│   ├── skills/{tdd,e2e-testing-patterns,frontend-design,tailwind-design-system,verification-before-completion,subagent-driven-development,next-best-practices,tanstack-query-best-practices}/SKILL.md
│   ├── memory/{MEMORY,team-knowledge,record-me-sr-frontend,record-me-staff,record-me-gatekeeper,record-me-scribe,record-me-e2e,record-me-principal}.md
│   ├── journal/2026-W22.md
│   ├── settings.json
│   └── team-reminder.txt
├── .github/
│   ├── ISSUE_TEMPLATE/{bug,feature,chore,docs,epic}.yml
│   ├── ISSUE_TEMPLATE/config.yml
│   ├── pull_request_template.md
│   ├── labels.yml
│   └── workflows/ci.yml
├── scripts/
│   ├── seed-labels.sh
│   └── create-epics.sh
├── .vscode/extensions.json
├── pnpm-workspace.yaml
├── turbo.json
├── package.json                           # root workspace package
├── tsconfig.json                          # root tsconfig (references packages)
├── lefthook.yml
├── .nvmrc
├── .npmrc
├── .editorconfig
├── README.md
├── LICENSE
├── CLAUDE.md
└── AGENTS.md                              # identical mirror of CLAUDE.md
```

---

## Task list (43 tasks, organised into six sections)

**A · Monorepo skeleton** — Tasks 1–8
**B · Tooling (test, lint, format, hooks, CI scaffolds)** — Tasks 9–14
**C · Agent harness (.claude/)** — Tasks 15–28
**D · Documentation (docs/, CLAUDE.md, AGENTS.md, README, LICENSE)** — Tasks 29–35
**E · GitHub workflow surfaces** — Tasks 36–40
**F · Repository creation + deployment** — Tasks 41–43

---

## Section A · Monorepo skeleton

### Task 1: Root workspace scaffold

**Goal:** create the workspace root with pnpm + Turborepo configured.

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `.npmrc`, `.editorconfig`, `tsconfig.json`

- [ ] **Step 1: Write `.nvmrc`**

Create `.nvmrc`:

```
22
```

- [ ] **Step 2: Write `.npmrc`**

Create `.npmrc`:

```
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
node-linker=isolated
```

- [ ] **Step 3: Write `.editorconfig`**

Create `.editorconfig`:

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 4: Write `pnpm-workspace.yaml`**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 5: Write root `package.json`**

Create `package.json`:

```json
{
  "name": "record-me",
  "version": "0.1.0",
  "private": true,
  "description": "An editorial, browser-native recorder. Screen, camera, cursor. No accounts, no upload.",
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint -- --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,yml,yaml,css}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md,yml,yaml,css}\"",
    "clean": "turbo run clean && rm -rf node_modules .turbo",
    "lhci": "lhci autorun"
  },
  "devDependencies": {
    "@lhci/cli": "^0.14.0",
    "lefthook": "^1.8.0",
    "prettier": "^3.4.0",
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 6: Write `turbo.json`**

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["^build", "build"],
      "outputs": ["playwright-report/**", "test-results/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  },
  "globalDependencies": ["tsconfig.json", ".eslintrc.*", "prettier.config.*"]
}
```

- [ ] **Step 7: Write root `tsconfig.json`**

Create `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/config" },
    { "path": "./packages/ui" },
    { "path": "./packages/recorder" },
    { "path": "./apps/web" }
  ]
}
```

- [ ] **Step 8: Install root deps and verify**

Run:

```bash
pnpm install
```

Expected: pnpm creates `node_modules/`, `pnpm-lock.yaml`. No errors.

- [ ] **Step 9: Commit**

```bash
git add .nvmrc .npmrc .editorconfig pnpm-workspace.yaml package.json turbo.json tsconfig.json pnpm-lock.yaml
git commit -m "chore: initialize pnpm + turborepo workspace"
```

---

### Task 2: `packages/config` — shared tsconfig bases

**Goal:** create `@record-me/config` package with reusable tsconfig bases that other packages extend.

**Files:**
- Create: `packages/config/package.json`, `packages/config/tsconfig.json`, `packages/config/tsconfig/base.json`, `packages/config/tsconfig/next.json`, `packages/config/tsconfig/package.json`

- [ ] **Step 1: Create directory and write `packages/config/package.json`**

Run:

```bash
mkdir -p packages/config/tsconfig packages/config/eslint packages/config/prettier packages/config/tailwind
```

Create `packages/config/package.json`:

```json
{
  "name": "@record-me/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./tsconfig/base.json": "./tsconfig/base.json",
    "./tsconfig/next.json": "./tsconfig/next.json",
    "./tsconfig/package.json": "./tsconfig/package.json",
    "./eslint": "./eslint/index.js",
    "./prettier": "./prettier/index.js",
    "./tailwind/preset": "./tailwind/preset.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "echo 'no-op'",
    "test": "echo 'no-op'",
    "build": "echo 'no-op'",
    "clean": "rm -rf .turbo"
  }
}
```

- [ ] **Step 2: Write `packages/config/tsconfig/base.json`**

Create `packages/config/tsconfig/base.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": false,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", ".next", "coverage"]
}
```

- [ ] **Step 3: Write `packages/config/tsconfig/next.json`**

Create `packages/config/tsconfig/next.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "allowJs": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }]
  }
}
```

- [ ] **Step 4: Write `packages/config/tsconfig/package.json`** (for library packages)

Create `packages/config/tsconfig/package.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "composite": true,
    "noEmit": false
  }
}
```

- [ ] **Step 5: Write `packages/config/tsconfig.json`** (the config package's own typecheck)

Create `packages/config/tsconfig.json`:

```json
{
  "extends": "./tsconfig/base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["**/*.ts", "**/*.tsx", "**/*.js"]
}
```

- [ ] **Step 6: Verify**

Run:

```bash
pnpm install
pnpm --filter @record-me/config typecheck
```

Expected: install completes, typecheck passes with no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/config pnpm-lock.yaml
git commit -m "feat(config): add shared tsconfig bases"
```

---

### Task 3: `packages/config` — shared ESLint flat config

**Goal:** add a shared ESLint flat configuration with TypeScript + React + Next.js rules.

**Files:**
- Create: `packages/config/eslint/index.js`
- Modify: `packages/config/package.json` (add eslint deps)

- [ ] **Step 1: Add ESLint deps to `packages/config/package.json`**

Modify `packages/config/package.json` — add `dependencies`:

```json
{
  "name": "@record-me/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./tsconfig/base.json": "./tsconfig/base.json",
    "./tsconfig/next.json": "./tsconfig/next.json",
    "./tsconfig/package.json": "./tsconfig/package.json",
    "./eslint": "./eslint/index.js",
    "./prettier": "./prettier/index.js",
    "./tailwind/preset": "./tailwind/preset.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "echo 'no-op'",
    "test": "echo 'no-op'",
    "build": "echo 'no-op'",
    "clean": "rm -rf .turbo"
  },
  "dependencies": {
    "@eslint/js": "^9.17.0",
    "@next/eslint-plugin-next": "^15.1.0",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "globals": "^15.14.0",
    "typescript-eslint": "^8.18.0"
  }
}
```

- [ ] **Step 2: Write `packages/config/eslint/index.js`**

Create `packages/config/eslint/index.js`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  prettierConfig,
];

export const reactConfig = [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx,jsx}'],
    plugins: { react: reactPlugin, 'react-hooks': reactHooks },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
];

export const nextConfig = [
  ...reactConfig,
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];

export default baseConfig;
```

- [ ] **Step 3: Install and verify**

Run:

```bash
pnpm install
```

Expected: ESLint deps land in `node_modules/.pnpm/`. No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/config pnpm-lock.yaml
git commit -m "feat(config): add shared eslint flat config"
```

---

### Task 4: `packages/config` — shared Prettier config

**Goal:** add a shared Prettier configuration so every package formats identically.

**Files:**
- Create: `packages/config/prettier/index.js`
- Create: `prettier.config.js` (root, delegates to package config)

- [ ] **Step 1: Write `packages/config/prettier/index.js`**

Create `packages/config/prettier/index.js`:

```js
/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  plugins: [],
  overrides: [
    { files: '*.md', options: { proseWrap: 'preserve', printWidth: 100 } },
    { files: '*.{yml,yaml}', options: { tabWidth: 2 } },
  ],
};
```

- [ ] **Step 2: Write root `prettier.config.js`**

Create `prettier.config.js`:

```js
import config from '@record-me/config/prettier';
export default config;
```

- [ ] **Step 3: Add `@record-me/config` to root devDependencies**

Modify root `package.json` — add to `devDependencies`:

```json
{
  "devDependencies": {
    "@lhci/cli": "^0.14.0",
    "@record-me/config": "workspace:*",
    "lefthook": "^1.8.0",
    "prettier": "^3.4.0",
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 4: Install and verify formatting**

Run:

```bash
pnpm install
pnpm format:check
```

Expected: install completes; `format:check` may report files to format. Run `pnpm format` to format everything, then re-run `format:check` — should pass clean.

- [ ] **Step 5: Commit**

```bash
git add packages/config prettier.config.js package.json pnpm-lock.yaml
git commit -m "feat(config): add shared prettier config"
```

---

### Task 5: `packages/ui` scaffold

**Goal:** create the `@record-me/ui` package scaffold (empty entry + tokens.css placeholder). Phase 2 will populate components and tokens; Phase 1 just gets it building.

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/src/index.ts`, `packages/ui/src/tokens.css`

- [ ] **Step 1: Write `packages/ui/package.json`**

Run `mkdir -p packages/ui/src` then create `packages/ui/package.json`:

```json
{
  "name": "@record-me/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./tokens.css": "./src/tokens.css"
  },
  "scripts": {
    "build": "echo 'no-op (consumed as source)'",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint .",
    "test": "vitest run --passWithNoTests",
    "clean": "rm -rf .turbo dist"
  },
  "dependencies": {
    "@record-me/config": "workspace:*"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.17.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write `packages/ui/tsconfig.json`**

Create `packages/ui/tsconfig.json`:

```json
{
  "extends": "@record-me/config/tsconfig/package.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Write `packages/ui/src/index.ts`**

Create `packages/ui/src/index.ts`:

```ts
// @record-me/ui · public surface
// Phase 1 scaffold. Components, tokens, brand primitives land in Phase 2.

export const UI_PACKAGE_VERSION = '0.0.0';
```

- [ ] **Step 4: Write `packages/ui/src/tokens.css`** (Phase 1 placeholder; Phase 2 fills in)

Create `packages/ui/src/tokens.css`:

```css
/*
 * @record-me/ui · Twilight design tokens
 * Phase 1 placeholder. Phase 2 populates with the full token set per
 * docs/superpowers/specs/2026-05-27-record-me-design.md § 9.1.
 */

:root {
  --bg: #0F1115;
  --ivory: #EDE6D6;
  --amber: #E5A24A;
}
```

- [ ] **Step 5: Write `packages/ui/eslint.config.js`**

Create `packages/ui/eslint.config.js`:

```js
import { reactConfig } from '@record-me/config/eslint';

export default [
  ...reactConfig,
  { ignores: ['dist/**', 'node_modules/**', '.turbo/**'] },
];
```

- [ ] **Step 6: Install and verify**

Run:

```bash
pnpm install
pnpm --filter @record-me/ui typecheck
pnpm --filter @record-me/ui lint
pnpm --filter @record-me/ui test
```

Expected: all three pass clean.

- [ ] **Step 7: Commit**

```bash
git add packages/ui pnpm-lock.yaml
git commit -m "feat(ui): scaffold @record-me/ui package"
```

---

### Task 6: `packages/recorder` scaffold

**Goal:** create the `@record-me/recorder` package scaffold with a placeholder `probeCapabilities()` and a single passing unit test. Phase 3 builds the engine.

**Files:**
- Create: `packages/recorder/package.json`, `packages/recorder/tsconfig.json`, `packages/recorder/vitest.config.ts`, `packages/recorder/src/index.ts`, `packages/recorder/src/index.test.ts`, `packages/recorder/eslint.config.js`

- [ ] **Step 1: Write `packages/recorder/package.json`**

Run `mkdir -p packages/recorder/src` then create `packages/recorder/package.json`:

```json
{
  "name": "@record-me/recorder",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "echo 'no-op (consumed as source)'",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint .",
    "test": "vitest run --coverage",
    "test:watch": "vitest",
    "clean": "rm -rf .turbo dist coverage"
  },
  "dependencies": {
    "@record-me/config": "workspace:*"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^2.1.0",
    "eslint": "^9.17.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write `packages/recorder/tsconfig.json`**

Create `packages/recorder/tsconfig.json`:

```json
{
  "extends": "@record-me/config/tsconfig/package.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules", "coverage"]
}
```

- [ ] **Step 3: Write `packages/recorder/vitest.config.ts`**

Create `packages/recorder/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
    },
  },
});
```

- [ ] **Step 4: Write `packages/recorder/src/index.ts`**

Create `packages/recorder/src/index.ts`:

```ts
// @record-me/recorder · public surface
// Phase 1 scaffold. The full engine (createRecorder, state machine, canvas
// compositing, IndexedDB spill) lands in Phase 3 per
// docs/superpowers/specs/2026-05-27-record-me-design.md § 7.

export interface CapabilityReport {
  hasMediaRecorder: boolean;
  hasGetDisplayMedia: boolean;
  hasGetUserMedia: boolean;
  supportedMimeType: string | null;
  isSafari: boolean;
  isMobile: boolean;
}

const MIME_PREFERENCE = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=h264,aac',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
] as const;

export function supportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const mime of MIME_PREFERENCE) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

export function probeCapabilities(): CapabilityReport {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const ua = nav?.userAgent ?? '';
  return {
    hasMediaRecorder: typeof MediaRecorder !== 'undefined',
    hasGetDisplayMedia: Boolean(nav?.mediaDevices?.getDisplayMedia),
    hasGetUserMedia: Boolean(nav?.mediaDevices?.getUserMedia),
    supportedMimeType: supportedMimeType(),
    isSafari: /^((?!chrome|android).)*safari/i.test(ua),
    isMobile: /Mobi|Android/i.test(ua),
  };
}

export const RECORDER_PACKAGE_VERSION = '0.0.0';
```

- [ ] **Step 5: Write `packages/recorder/src/index.test.ts`** (the failing test, TDD)

Create `packages/recorder/src/index.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { probeCapabilities, supportedMimeType, RECORDER_PACKAGE_VERSION } from './index';

describe('@record-me/recorder · phase 1 scaffold', () => {
  it('exposes a version string', () => {
    expect(RECORDER_PACKAGE_VERSION).toBe('0.0.0');
  });

  describe('supportedMimeType', () => {
    let originalMediaRecorder: typeof MediaRecorder | undefined;

    beforeEach(() => {
      originalMediaRecorder = globalThis.MediaRecorder;
    });

    afterEach(() => {
      if (originalMediaRecorder) {
        globalThis.MediaRecorder = originalMediaRecorder;
      } else {
        // @ts-expect-error reset
        delete globalThis.MediaRecorder;
      }
    });

    it('returns null when MediaRecorder is unavailable', () => {
      // @ts-expect-error force undefined for this test
      delete globalThis.MediaRecorder;
      expect(supportedMimeType()).toBeNull();
    });

    it('prefers MP4 H.264 when supported', () => {
      const isTypeSupported = vi.fn((mime: string) => mime.startsWith('video/mp4'));
      // @ts-expect-error minimal stub for the test
      globalThis.MediaRecorder = { isTypeSupported };
      expect(supportedMimeType()).toBe('video/mp4;codecs=avc1.42E01E,mp4a.40.2');
    });

    it('falls back to WebM VP9 when MP4 is not supported', () => {
      const isTypeSupported = vi.fn(
        (mime: string) => mime === 'video/webm;codecs=vp9,opus' || mime === 'video/webm;codecs=vp8,opus',
      );
      // @ts-expect-error minimal stub for the test
      globalThis.MediaRecorder = { isTypeSupported };
      expect(supportedMimeType()).toBe('video/webm;codecs=vp9,opus');
    });
  });

  describe('probeCapabilities', () => {
    it('reports the current environment', () => {
      const report = probeCapabilities();
      expect(typeof report.hasMediaRecorder).toBe('boolean');
      expect(typeof report.hasGetDisplayMedia).toBe('boolean');
      expect(typeof report.hasGetUserMedia).toBe('boolean');
      expect(typeof report.isSafari).toBe('boolean');
      expect(typeof report.isMobile).toBe('boolean');
    });
  });
});
```

- [ ] **Step 6: Write `packages/recorder/eslint.config.js`**

Create `packages/recorder/eslint.config.js`:

```js
import { baseConfig } from '@record-me/config/eslint';

export default [
  ...baseConfig,
  { ignores: ['dist/**', 'node_modules/**', '.turbo/**', 'coverage/**'] },
];
```

- [ ] **Step 7: Install and run tests to verify they pass**

Run:

```bash
pnpm install
pnpm --filter @record-me/recorder typecheck
pnpm --filter @record-me/recorder lint
pnpm --filter @record-me/recorder test
```

Expected: typecheck passes, lint passes, all 5 tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/recorder pnpm-lock.yaml
git commit -m "feat(recorder): scaffold @record-me/recorder with capability probe"
```

---

### Task 7: `apps/web` — Next.js 15 app skeleton

**Goal:** create the Next.js 15 app skeleton with App Router, the root layout, a placeholder home page, and Tailwind v4 wired up.

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/eslint.config.js`, `apps/web/next-env.d.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/globals.css`, `apps/web/public/.gitkeep`, `apps/web/tests/e2e/.gitkeep`

- [ ] **Step 1: Create directories**

Run:

```bash
mkdir -p apps/web/src/app apps/web/public apps/web/tests/e2e
touch apps/web/public/.gitkeep apps/web/tests/e2e/.gitkeep
```

- [ ] **Step 2: Write `apps/web/package.json`**

Create `apps/web/package.json`:

```json
{
  "name": "@record-me/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "typecheck": "tsc --noEmit",
    "lint": "next lint --dir src",
    "test": "vitest run --passWithNoTests",
    "test:e2e": "playwright test",
    "clean": "rm -rf .next .turbo node_modules"
  },
  "dependencies": {
    "@record-me/config": "workspace:*",
    "@record-me/recorder": "workspace:*",
    "@record-me/ui": "workspace:*",
    "@vercel/analytics": "^1.4.0",
    "@vercel/speed-insights": "^1.1.0",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.1.0",
    "postcss": "^8.5.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: Write `apps/web/tsconfig.json`**

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "@record-me/config/tsconfig/next.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "tests/e2e"]
}
```

- [ ] **Step 4: Write `apps/web/next.config.ts`**

Create `apps/web/next.config.ts`:

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@record-me/ui', '@record-me/recorder'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), display-capture=(self)',
          },
        ],
      },
    ];
  },
};

export default config;
```

- [ ] **Step 5: Write `apps/web/postcss.config.mjs`**

Create `apps/web/postcss.config.mjs`:

```js
export default {
  plugins: { '@tailwindcss/postcss': {} },
};
```

- [ ] **Step 6: Write `apps/web/next-env.d.ts`**

Create `apps/web/next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

- [ ] **Step 7: Write `apps/web/src/app/globals.css`**

Create `apps/web/src/app/globals.css`:

```css
@import 'tailwindcss';
@import '@record-me/ui/tokens.css';

html,
body {
  background: var(--bg);
  color: var(--ivory);
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 8: Write `apps/web/src/app/layout.tsx`**

Create `apps/web/src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'record me — record your screen, beautifully',
  description:
    'An editorial browser screen recorder. Screen, camera, cursor. No accounts. No upload. Free.',
};

export const viewport: Viewport = {
  themeColor: '#0F1115',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Write `apps/web/src/app/page.tsx`** (Phase 1 placeholder; Phase 5 builds the real landing)

Create `apps/web/src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main style={{ padding: '64px 32px', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 48, lineHeight: 1.05, margin: 0 }}>
        record me
      </h1>
      <p style={{ marginTop: 16, color: '#B5AFA2', fontSize: 16, lineHeight: 1.6 }}>
        Phase 1 scaffold. The editorial landing ships in Phase 5 per
        docs/superpowers/specs/2026-05-27-record-me-design.md § 8.7.
      </p>
    </main>
  );
}
```

- [ ] **Step 10: Write `apps/web/eslint.config.js`**

Create `apps/web/eslint.config.js`:

```js
import { nextConfig } from '@record-me/config/eslint';

export default [
  ...nextConfig,
  { ignores: ['.next/**', 'node_modules/**', '.turbo/**', 'tests/e2e/**'] },
];
```

- [ ] **Step 11: Install, build, and verify**

Run:

```bash
pnpm install
pnpm --filter @record-me/web typecheck
pnpm --filter @record-me/web lint
pnpm --filter @record-me/web build
```

Expected: install completes; typecheck passes; lint passes (may warn about unused vars in the placeholder — fix if so); `next build` produces `.next/` output cleanly.

- [ ] **Step 12: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): scaffold Next.js 15 App Router skeleton"
```

---

### Task 8: Verify the whole workspace builds

**Goal:** end-of-section A checkpoint — every package and the app typecheck, lint, test, and build together via Turbo.

**Files:** none modified.

- [ ] **Step 1: Run full pipeline via Turbo**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected: all four green. Turbo caches results in `.turbo/`.

- [ ] **Step 2: Verify `.gitignore` covers turbo + next cache**

Read `.gitignore` and confirm it includes `.next/`, `node_modules/`, `.turbo/`. If `.turbo/` is missing, add it:

```bash
echo ".turbo/" >> .gitignore
echo "coverage/" >> .gitignore
echo "playwright-report/" >> .gitignore
echo "test-results/" >> .gitignore
```

- [ ] **Step 3: Commit `.gitignore` if changed**

```bash
git add .gitignore
git diff --cached --quiet || git commit -m "chore: extend gitignore for turbo + test artifacts"
```

---

## Section B · Tooling

### Task 9: Vitest workspace configuration

**Goal:** add a workspace-level Vitest config so `pnpm test` runs all package suites with consistent reporting.

**Files:**
- Create: `vitest.workspace.ts`

- [ ] **Step 1: Write `vitest.workspace.ts`**

Create `vitest.workspace.ts`:

```ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/recorder/vitest.config.ts',
  {
    test: {
      name: 'ui',
      root: 'packages/ui',
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      globals: true,
    },
  },
  {
    test: {
      name: 'web',
      root: 'apps/web',
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      globals: true,
    },
  },
]);
```

- [ ] **Step 2: Add root-level Vitest dev dep**

Modify root `package.json` — add to `devDependencies`:

```json
"vitest": "^2.1.0"
```

- [ ] **Step 3: Verify**

Run:

```bash
pnpm install
pnpm exec vitest run --passWithNoTests
```

Expected: workspace runs all 3 projects; recorder's 5 tests pass; ui and web report "no tests".

- [ ] **Step 4: Commit**

```bash
git add vitest.workspace.ts package.json pnpm-lock.yaml
git commit -m "test: add vitest workspace configuration"
```

---

### Task 10: Playwright configuration for `apps/web`

**Goal:** wire Playwright with media-stream fake-device Chromium flags so future E2E tests can drive recording flows.

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Write `apps/web/playwright.config.ts`**

Create `apps/web/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? '3000';
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : [['list'], ['html']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--autoplay-policy=no-user-gesture-required',
          ],
        },
        permissions: ['camera', 'microphone'],
      },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: Write `apps/web/tests/e2e/smoke.spec.ts`** (the smoke test)

Create `apps/web/tests/e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('landing page renders the placeholder', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'record me' })).toBeVisible();
  await expect(page).toHaveTitle(/record me/);
});
```

- [ ] **Step 3: Install Playwright browsers**

Run:

```bash
pnpm --filter @record-me/web exec playwright install --with-deps chromium
```

Expected: Chromium downloads. On CI this is handled by the workflow.

- [ ] **Step 4: Run the smoke test**

Run:

```bash
pnpm --filter @record-me/web test:e2e
```

Expected: 1 test passes. HTML report saved to `apps/web/playwright-report/`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/tests/e2e/smoke.spec.ts
git commit -m "test(web): add playwright config + landing smoke test"
```

---

### Task 11: lefthook pre-commit hooks

**Goal:** install lefthook so `git commit` runs lint-staged formatting + typecheck + unit tests on affected files.

**Files:**
- Create: `lefthook.yml`

- [ ] **Step 1: Write `lefthook.yml`**

Create `lefthook.yml`:

```yaml
# https://github.com/evilmartians/lefthook
pre-commit:
  parallel: true
  commands:
    prettier:
      glob: "*.{ts,tsx,js,jsx,json,md,yml,yaml,css}"
      run: pnpm exec prettier --write {staged_files} && git add {staged_files}
    eslint:
      glob: "*.{ts,tsx,js,jsx}"
      run: pnpm exec eslint --fix {staged_files} && git add {staged_files}
    typecheck:
      run: pnpm typecheck

pre-push:
  parallel: true
  commands:
    test:
      run: pnpm test
    build:
      run: pnpm build
```

- [ ] **Step 2: Install lefthook hooks**

Run:

```bash
pnpm exec lefthook install
```

Expected: writes hooks to `.git/hooks/`. Output: `sync hooks: ✔️ (lefthook.yml)`.

- [ ] **Step 3: Verify a no-op commit triggers hooks**

Run:

```bash
git commit --allow-empty -m "chore: verify lefthook"
```

Expected: pre-commit runs prettier, eslint, typecheck — all pass on empty changeset. Commit succeeds. (If hooks fail, fix and retry; do not bypass with `--no-verify`.)

- [ ] **Step 4: Commit `lefthook.yml`**

```bash
git add lefthook.yml
git commit -m "chore: add lefthook pre-commit + pre-push hooks"
```

---

### Task 12: Tailwind v4 preset in `packages/config`

**Goal:** add a shared Tailwind v4 preset (CSS-first) that the web app and ui package can extend.

**Files:**
- Create: `packages/config/tailwind/preset.ts`, `packages/config/tailwind/theme.css`

- [ ] **Step 1: Write `packages/config/tailwind/theme.css`**

Create `packages/config/tailwind/theme.css`:

```css
/*
 * @record-me/config · Tailwind v4 theme tokens
 * Maps the Twilight palette + Pairing A typography into Tailwind theme variables.
 * Consumed by apps/web/src/app/globals.css via @import.
 * Full token list in docs/superpowers/specs/2026-05-27-record-me-design.md § 9.1.
 */

@theme {
  /* Surface */
  --color-bg: #0F1115;
  --color-bg-2: #12151B;
  --color-surface: #171B22;
  --color-surface-2: #1F242C;
  --color-line: #262C36;
  --color-line-soft: #1B2028;

  /* Ink */
  --color-ivory: #EDE6D6;
  --color-ivory-dim: #B5AFA2;
  --color-ivory-mut: #7A766D;
  --color-ivory-low: #54514A;

  /* Signal & state */
  --color-amber: #E5A24A;
  --color-amber-hi: #F1B768;
  --color-amber-lo: #C88A38;
  --color-success: #9BB28F;
  --color-danger: #C8675A;

  /* Typography (next/font assigns the actual families via CSS vars) */
  --font-serif: var(--font-instrument-serif), 'Iowan Old Style', Georgia, serif;
  --font-sans: var(--font-geist), -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace;
}
```

- [ ] **Step 2: Write `packages/config/tailwind/preset.ts`**

Create `packages/config/tailwind/preset.ts`:

```ts
/*
 * @record-me/config · Tailwind v4 preset
 * Phase 1 ships the token import. Phase 2 extends with plugin presets.
 */

export const tailwindThemeImport = '@record-me/config/tailwind/theme.css';

export const recordMeTailwindPreset = {
  themeImport: tailwindThemeImport,
} as const;

export default recordMeTailwindPreset;
```

- [ ] **Step 3: Update `apps/web/src/app/globals.css` to consume the preset theme**

Modify `apps/web/src/app/globals.css`:

```css
@import 'tailwindcss';
@import '@record-me/config/tailwind/theme.css';
@import '@record-me/ui/tokens.css';

html,
body {
  background: var(--color-bg);
  color: var(--color-ivory);
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 4: Verify build**

Run:

```bash
pnpm --filter @record-me/web build
```

Expected: build succeeds. Tailwind picks up the theme via the import chain.

- [ ] **Step 5: Commit**

```bash
git add packages/config apps/web/src/app/globals.css
git commit -m "feat(config): add tailwind v4 preset with twilight tokens"
```

---

### Task 13: Lighthouse CI configuration

**Goal:** wire Lighthouse CI so CI can enforce CWV budgets on `/` and `/record`. Phase 1 sets the config; CI runs land in Task 39.

**Files:**
- Create: `lighthouserc.json`

- [ ] **Step 1: Write `lighthouserc.json`**

Create `lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "pnpm --filter @record-me/web start",
      "startServerReadyPattern": "Ready",
      "url": ["http://localhost:3000/", "http://localhost:3000/record"],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttlingMethod": "simulate"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05 }],
        "interaction-to-next-paint": ["warn", { "maxNumericValue": 200 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

- [ ] **Step 2: Add `/record` placeholder so LHCI doesn't 404 in CI**

Create `apps/web/src/app/record/page.tsx`:

```tsx
export default function RecordPage() {
  return (
    <main style={{ padding: '64px 32px', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 40, lineHeight: 1.05, margin: 0 }}>
        the studio
      </h1>
      <p style={{ marginTop: 16, color: '#B5AFA2', fontSize: 16, lineHeight: 1.6 }}>
        Phase 1 scaffold. The recording surface ships in Phase 4 per
        docs/superpowers/specs/2026-05-27-record-me-design.md § 7.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Verify build still passes**

Run:

```bash
pnpm --filter @record-me/web build
```

Expected: build succeeds with two routes.

- [ ] **Step 4: Commit**

```bash
git add lighthouserc.json apps/web/src/app/record
git commit -m "ci: add lighthouserc + /record placeholder"
```

---

### Task 14: `.vscode/extensions.json` recommendations

**Goal:** suggest the right editor extensions so contributors and agents share tooling.

**Files:**
- Create: `.vscode/extensions.json`, `.vscode/settings.json`

- [ ] **Step 1: Create `.vscode/extensions.json`**

Run `mkdir -p .vscode` then create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "vitest.explorer",
    "vercel.turbo-vsc"
  ]
}
```

- [ ] **Step 2: Create `.vscode/settings.json`**

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add .vscode
git commit -m "chore: recommend vscode extensions + workspace settings"
```

---

## Section C · Agent harness (`.claude/`)

Section C populates `.claude/` with the six-member team, supporting commands, project-scoped skills, persistent memory, journal, and session settings. The structure mirrors MesaGo (`~/personal/food-delivery-app/.claude/`) with adaptations for record-me's client-side-only shape and the self-improvement additions from spec § 11.

The pattern for every agent file is:

1. YAML frontmatter: `name`, `description`, `tools`, `model`, `owns:` globs, `quality_bar:` block.
2. `## Role` — one paragraph identity statement.
3. `## Standing workflow` — the loop the agent runs every message.
4. `## Ownership` — concrete file globs, repeated from frontmatter for readability, with rationale.
5. `## Quality bar` — definition of done specific to this role.
6. `## Self-improvement protocol` — what the agent does after task completion to feed `.claude/memory/<agent>.md`.
7. `## Memory pointers` — references to memory files and reading order.
8. `## Anti-patterns` — things this role should never do.

Every agent reads its definition + memory file on first message. Every agent appends to memory on task completion.

### Task 15: `.claude/settings.json` and `.claude/team-reminder.txt`

**Goal:** create the harness session configuration (permissions, env, SessionStart hook) and the reminder banner.

**Files:**
- Create: `.claude/settings.json`, `.claude/team-reminder.txt`, `.claude/.gitkeep`

- [ ] **Step 1: Create the `.claude/` directory tree**

Run:

```bash
mkdir -p .claude/agents .claude/commands .claude/teams .claude/skills .claude/memory .claude/journal
touch .claude/.gitkeep
```

- [ ] **Step 2: Write `.claude/settings.json`**

Create `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "allow": [
      "Bash(pnpm:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "Bash(git stash:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(gh:*)",
      "Bash(ls:*)",
      "Bash(find:*)",
      "Bash(grep:*)",
      "Bash(wc:*)",
      "Bash(cat:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(diff:*)",
      "Bash(echo:*)",
      "Bash(test:*)",
      "Bash(mkdir:*)",
      "Bash(touch:*)",
      "Bash(npx playwright:*)",
      "Bash(npx lhci:*)",
      "Bash(node:*)",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "WebSearch"
    ],
    "deny": []
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "test -f .claude/commands/spawn-record-me-team.md && test -f .claude/team-reminder.txt && cat .claude/team-reminder.txt"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: Write `.claude/team-reminder.txt`**

Create `.claude/team-reminder.txt`:

```
record-me shipping team is available for plan-driven feature work.

  Spawn the team:   /spawn-record-me-team
  Write a plan:     superpowers:writing-plans
  Team blueprint:   .claude/teams/record-me-shipping.md
  Full spec:        docs/superpowers/specs/2026-05-27-record-me-design.md

The team has 6 specialists (sr-frontend, staff, gatekeeper, scribe, e2e, principal)
that iterate until the reviewer clears CRITICAL+MAJOR issues. Agents read their own
memory at .claude/memory/ on session start; they append learnings after every task.

GitHub issues mirror plan tasks (Phase 2+): the spawn command opens an issue per
task, labels it, links it to the phase epic, and closes it on approval. Phase 1
tracks via docs/PROGRESS.md only (chicken-and-egg).

To silence this reminder for a session, override the SessionStart hook in
.claude/settings.local.json (gitignored, user-specific).
```

- [ ] **Step 4: Add `.claude/settings.local.json` to `.gitignore`**

Modify `.gitignore` — append:

```
.claude/settings.local.json
```

- [ ] **Step 5: Commit**

```bash
git add .claude/settings.json .claude/team-reminder.txt .gitignore
git commit -m "chore(claude): add session settings + team reminder"
```

---

### Task 16: Team blueprint (`.claude/teams/record-me-shipping.md`)

**Goal:** write the team blueprint that `/spawn-record-me-team` parses.

**Files:**
- Create: `.claude/teams/record-me-shipping.md`

- [ ] **Step 1: Write the blueprint**

Create `.claude/teams/record-me-shipping.md`:

```markdown
---
name: record-me-shipping
description: Plan-driven 6-teammate ship team for record-me (client-side only — no backend role)
members:
  - name: record-me-sr-frontend
    agent_type: record-me-sr-frontend
    model: claude-sonnet-4-6
    autonomous: true
  - name: record-me-staff
    agent_type: record-me-staff
    model: claude-opus-4-7
    autonomous: true
  - name: record-me-gatekeeper
    agent_type: record-me-gatekeeper
    model: claude-haiku-4-5
    autonomous: true
  - name: record-me-scribe
    agent_type: record-me-scribe
    model: claude-haiku-4-5
    autonomous: true
  - name: record-me-e2e
    agent_type: record-me-e2e
    model: claude-sonnet-4-6
    autonomous: true
  - name: record-me-principal
    agent_type: record-me-principal
    model: claude-opus-4-7
    autonomous: true
---

# record-me Shipping Team

Plan-driven multi-agent team for executing implementation plans end-to-end. Six
specialists (no backend role — record-me is client-side only). See
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 11 for the full design,
ownership matrix, and Read → Act → Reflect cycle.

## When to spawn

After writing an implementation plan via `superpowers:writing-plans`. Invoke
`/spawn-record-me-team` to launch the team against the latest plan (or pass an
explicit plan path: `/spawn-record-me-team docs/superpowers/plans/<file>.md`).

## Roles

- **record-me-sr-frontend** — UI/pages/hooks impl (Sonnet 4.6). Owns
  `apps/web/**` and `packages/ui/**`. Invokes `/frontend-design` for landing
  and per-mode pages.
- **record-me-staff** — Cross-cutting + recording engine (Opus 4.7). Owns
  `packages/recorder/**`, `packages/config/**`, `turbo.json`,
  `pnpm-workspace.yaml`. Receives `[BLOCKED]` reassignments.
- **record-me-gatekeeper** — Build/test/lint/ownership pre-screener
  (Haiku 4.5). Writes no code.
- **record-me-scribe** — Docs + memory curator (Haiku 4.5). Owns `docs/**`,
  `CLAUDE.md`, `AGENTS.md`, `.claude/memory/team-knowledge.md`.
- **record-me-e2e** — Playwright author (Sonnet 4.6). Owns
  `apps/web/tests/e2e/**`.
- **record-me-principal** — Reviewer (Opus 4.7). Invokes `/codex:review` plus
  Opus holistic review. Issues `[REVIEW_RESULT]` with CRITICAL/MAJOR/MINOR.
  Reviews every agent self-edit to `.claude/agents/*.md`.

## Lead session

The Claude Code session that runs `/spawn-record-me-team` IS the lead. The lead
orchestrates via SendMessage, never implements feature code. After all tasks are
APPROVED, the lead runs holistic checks (`pnpm typecheck && lint && test && build
&& test:e2e && lhci`) and invokes `superpowers:finishing-a-development-branch` to
open the PR.

## GitHub integration

From Phase 2 onward, the spawn command auto-creates a GH issue per plan task:
labels (`agent-task`, type, area, phase, priority), linked to the phase epic
issue. Implementers update issue progress with comments at major milestones.
Principal closes the issue on `[REVIEW_RESULT] APPROVED`. The eventual PR body
references all closed issues (`Closes #N, #M, ...`).

Phase 1 itself does not auto-create per-task issues (chicken-and-egg — templates
and labels don't exist until partway through Phase 1). Phase 1 tracks via the
plan checkboxes and `docs/PROGRESS.md` only.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/teams/record-me-shipping.md
git commit -m "feat(claude): add record-me-shipping team blueprint"
```

---

### Task 17: Agent · `record-me-sr-frontend`

**Goal:** write the senior frontend agent definition.

**Files:**
- Create: `.claude/agents/record-me-sr-frontend.md`

- [ ] **Step 1: Write the definition**

Create `.claude/agents/record-me-sr-frontend.md`:

```markdown
---
name: record-me-sr-frontend
description: Senior frontend engineer for record-me. Implements UI, pages, hooks, and brand primitives with TDD. Invokes /frontend-design for landing and per-mode pages. Owns apps/web/** and packages/ui/**.
tools: Read, Edit, Write, Bash, Grep, Glob, Task
model: claude-sonnet-4-6
owns:
  - "apps/web/src/**"
  - "apps/web/public/**"
  - "apps/web/next.config.ts"
  - "apps/web/tsconfig.json"
  - "apps/web/postcss.config.mjs"
  - "apps/web/eslint.config.js"
  - "packages/ui/src/**"
  - "packages/ui/tsconfig.json"
  - "packages/ui/eslint.config.js"
quality_bar: |
  Every UI change is visually verified with Playwright MCP screenshots before claiming done.
  Console is clean during E2E runs.
  All affected tests pass.
  No hardcoded hex values — only CSS variables from packages/ui/src/tokens.css.
  CWV budgets defended (LCP < 1.8s, INP < 200ms, CLS < 0.05).
---

## Role

You implement the user-facing surface of record-me: routes in `apps/web`, brand
primitives in `packages/ui`, and the React hook wrappers around
`@record-me/recorder`. You think in editorial terms — generous whitespace,
considered typography, motion that serves meaning rather than decorates.

## Standing workflow

1. **Read** your memory (`.claude/memory/record-me-sr-frontend.md`),
   `.claude/memory/team-knowledge.md`, and the relevant spec sections
   (§§ 6, 8, 9 of `docs/superpowers/specs/2026-05-27-record-me-design.md`).
2. **Wait** for `[ASSIGNED]` from the lead.
3. **For UI / landing / page work:** invoke `/frontend-design` before writing
   any component code. The skill briefs you on the aesthetic direction and
   ensures the output isn't generic.
4. **Implement TDD:** write the test in `*.test.tsx` first, run it to confirm
   it fails, write the minimal code, run it again to confirm it passes.
5. **Verify visually:** for any UI change, use Playwright MCP
   (`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`,
   `browser_console_messages`) to confirm the change renders correctly and the
   console is clean.
6. **Update the GH issue** (Phase 2+): comment progress at milestones, paste
   screenshots, link the PR.
7. **Report back** with `[DONE:DONE]` plus a short summary and the test
   commands you ran.

## Ownership

- `apps/web/**` — all routes, layouts, components, hooks, styles.
- `packages/ui/**` — brand primitives, shadcn components, design tokens
  (`tokens.css`), Tailwind preset additions.

You do **not** own `packages/recorder` — recording engine changes route to
`record-me-staff`. If a task you receive touches recorder internals, return
`[DONE:BLOCKED]` with the reason.

## Quality bar

See frontmatter. In practice: no `console.log` in shipped code; no `any` types;
no hardcoded `#hex` colors (use CSS vars); no `setTimeout` for waiting in tests
(use `waitFor` or explicit promises); every visual change has a Playwright
screenshot in the PR.

## Self-improvement protocol

After `[REVIEW_RESULT] APPROVED`:

1. Reflect: was anything surprising, hard, or worth remembering?
2. Append to `.claude/memory/record-me-sr-frontend.md` using the memory file
   conventions (frontmatter `name`, `description`, `type`).
3. If a pattern recurred (e.g., a specific Tailwind v4 quirk, a Next.js 15
   App Router gotcha), propose an edit to this file (`.claude/agents/record-me-sr-frontend.md`)
   in a follow-up PR — principal reviews before merge.
4. If the codebase shape shifted (new route added, new shared component),
   ping scribe via SendMessage to refresh `docs/CODEBASE_MAP.md`.

## Memory pointers

- `.claude/memory/record-me-sr-frontend.md` — your gotchas, patterns, decisions.
- `.claude/memory/team-knowledge.md` — shared team wisdom (scribe-curated).
- `docs/DESIGN.md` — design tokens and component conventions.
- `docs/FRONTEND.md` — routes, hooks, component inventory.

## Anti-patterns

- Modifying `packages/recorder/**` (not yours — route to staff).
- Authoring E2E tests in `apps/web/tests/e2e/**` (not yours — route to e2e).
- Hardcoded hex colors instead of CSS variables.
- Skipping the `/frontend-design` invocation for new UI surfaces.
- Claiming "done" without visual verification.
- Using `any` to silence type errors.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/agents/record-me-sr-frontend.md
git commit -m "feat(claude): add record-me-sr-frontend agent"
```

---

### Task 18: Agent · `record-me-staff`

**Goal:** write the staff (cross-cutting + recording engine) agent definition.

**Files:**
- Create: `.claude/agents/record-me-staff.md`

- [ ] **Step 1: Write the definition**

Create `.claude/agents/record-me-staff.md`:

```markdown
---
name: record-me-staff
description: Staff engineer for record-me. Owns the recording engine (packages/recorder), cross-cutting configs (packages/config, turbo.json, pnpm-workspace.yaml), and any task tagged [cross-cutting]. Receives [BLOCKED] reassignments from sr-frontend.
tools: Read, Edit, Write, Bash, Grep, Glob, Task
model: claude-opus-4-7
owns:
  - "packages/recorder/**"
  - "packages/config/**"
  - "turbo.json"
  - "pnpm-workspace.yaml"
  - "package.json"
  - "tsconfig.json"
  - "lefthook.yml"
  - "lighthouserc.json"
  - "vitest.workspace.ts"
  - ".github/workflows/**"
  - "next.config.ts"
quality_bar: |
  Recording engine has ≥ 90% line/function coverage, ≥ 85% branch coverage.
  All state-machine transitions have unit tests.
  Cross-cutting changes do not silently break consumer packages — typecheck across the workspace before claiming done.
  Performance regressions are flagged with reproducible measurements (don't claim "feels faster").
---

## Role

You own the recording engine and the workspace plumbing. You think about
correctness, performance, and how the recorder package's public API will hold
up under Phase 4's UI integration and Phase 6's analytics wiring. You write
framework-agnostic code in `packages/recorder` — no React imports allowed.

## Standing workflow

1. **Read** your memory (`.claude/memory/record-me-staff.md`),
   `.claude/memory/team-knowledge.md`, and the relevant spec sections
   (§§ 5, 7, 11, 13 of `docs/superpowers/specs/2026-05-27-record-me-design.md`).
2. **Wait** for `[ASSIGNED]` from the lead (or `[BLOCKED]` reassignment).
3. **TDD:** for recorder code, write a Vitest spec with MediaStream/MediaRecorder
   mocks first. Run it to confirm it fails. Write minimal code. Re-run.
4. **Cross-workspace validation:** after each non-trivial change to
   `packages/recorder` or `packages/config`, run `pnpm typecheck` from the
   workspace root to verify consumers still build.
5. **Update the GH issue** (Phase 2+): comment progress; if a contract changed,
   send `[CONTRACT_CHANGE]` to the lead so in-flight implementers can react.
6. **Report back** with `[DONE:DONE]` plus coverage delta.

## Ownership

- `packages/recorder/**` — engine, state machine, IndexedDB spill, codec
  negotiation.
- `packages/config/**` — shared tsconfig bases, eslint, prettier, tailwind
  preset.
- Root configs — `turbo.json`, `pnpm-workspace.yaml`, root `package.json`,
  `tsconfig.json`, `lefthook.yml`, `lighthouserc.json`, `vitest.workspace.ts`.
- `.github/workflows/**` — CI pipeline.
- `apps/web/next.config.ts` only when changes are infra-level (headers, build
  config); UI-driven Next config changes still route to sr-frontend.

## Quality bar

See frontmatter. In practice: every public function in `@record-me/recorder`
has a unit test exercising both the happy path and at least one failure mode;
coverage thresholds in `packages/recorder/vitest.config.ts` are never lowered
to make tests pass.

## Self-improvement protocol

After `[REVIEW_RESULT] APPROVED`:

1. Append to `.claude/memory/record-me-staff.md`: surprises (e.g., a
   MediaRecorder quirk), patterns (e.g., a mock factory that works well), or
   decisions (e.g., why a specific codec is preferred in a given browser).
2. If the recorder public API shifted, ping scribe to update
   `docs/RECORDING.md`.
3. Propose self-edits to this agent file when a recurring rule emerges
   (principal-reviewed).

## Memory pointers

- `.claude/memory/record-me-staff.md` — your gotchas, patterns, decisions.
- `.claude/memory/team-knowledge.md` — shared.
- `docs/RECORDING.md` — recording pipeline contract.
- `docs/ARCHITECTURE.md` — monorepo structure and dependency rules.

## Anti-patterns

- Importing React in `packages/recorder/**`.
- Lowering coverage thresholds to land a PR.
- Modifying `apps/web/src/**` (not yours — route to sr-frontend).
- Silently breaking consumer packages (always run workspace-wide typecheck).
- Claiming a perf improvement without a reproducible measurement.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/agents/record-me-staff.md
git commit -m "feat(claude): add record-me-staff agent"
```

---

### Task 19: Agent · `record-me-gatekeeper`

**Goal:** write the gatekeeper agent (build/test/lint/ownership pre-screener). Writes no code.

**Files:**
- Create: `.claude/agents/record-me-gatekeeper.md`

- [ ] **Step 1: Write the definition**

Create `.claude/agents/record-me-gatekeeper.md`:

```markdown
---
name: record-me-gatekeeper
description: Pre-review gate for record-me. Runs typecheck/lint/test/build, audits ownership boundaries, scans for console.log and TODOs. Writes no code — only reports PASS or FAIL with concrete output.
tools: Read, Bash, Grep, Glob
model: claude-haiku-4-5
owns: []
quality_bar: |
  Every gate run produces a deterministic PASS or FAIL — no "looks fine" verdicts.
  Failures include the exact command output so the implementer can act on it.
  Ownership violations are first-class failures (not warnings).
---

## Role

You are the pre-review gate. You receive `[GATE_REQUEST]` from the lead after an
implementer claims `[DONE:DONE]`. You run the gate checks, you report PASS or
FAIL with evidence, and you write nothing else. You never write code. You never
"fix small things while you're here."

## Standing workflow

When you receive `[GATE_REQUEST] task=<id> Implementer=<name> Changed files=<list> Before SHA=<sha> After SHA=<sha>`:

1. **Ownership audit** — for each changed file, check whether it falls inside
   the implementer's `owns:` globs (read from `.claude/agents/<implementer>.md`
   frontmatter). Cross-ownership edits are FAIL unless the task is tagged
   `[cross-cutting]` (look in the plan task text).
2. **Typecheck** — `pnpm typecheck`. FAIL on any error.
3. **Lint** — `pnpm lint`. FAIL on any error (warnings are noted but pass).
4. **Tests (affected)** — `pnpm test`. FAIL on any failing test.
5. **Console scan** — `git diff <before>..<after> -- '*.ts' '*.tsx'` and grep
   for `console.log` outside of `*.test.*` files. Found → FAIL.
6. **TODO/FIXME scan** — same diff, grep for `TODO\|FIXME`. Found → MINOR (not
   FAIL); list them.
7. **Build** — `pnpm build`. FAIL on build error.
8. **Report:**
   - PASS: `[GATE_PASS] task=<id>` + a one-line summary.
   - FAIL: `[GATE_FAIL] task=<id>` + the verbatim failing command output, scoped
     to the relevant package.

## Quality bar

See frontmatter.

## Self-improvement protocol

After every gate run, append to `.claude/memory/record-me-gatekeeper.md`:

- Patterns of failures (e.g., "sr-frontend forgets to run typecheck after
  adding a new export from packages/ui").
- New checks that should be added (then propose the addition as a self-edit
  to this file, principal-reviewed).

## Memory pointers

- `.claude/memory/record-me-gatekeeper.md` — gotchas + new checks proposed.
- `.claude/memory/team-knowledge.md` — shared.
- `docs/QUALITY_GATES.md` — the gate contract you enforce.

## Anti-patterns

- Writing any code.
- Editing files (other than your own memory).
- Subjective verdicts ("looks ok", "should be fine").
- Skipping a check because "it probably passes."
- Approving on partial output (always read the full stderr/stdout).
```

- [ ] **Step 2: Commit**

```bash
git add .claude/agents/record-me-gatekeeper.md
git commit -m "feat(claude): add record-me-gatekeeper agent"
```

---

### Task 20: Agent · `record-me-scribe`

**Goal:** write the scribe agent (docs + memory curator + GH issue/PROGRESS sync).

**Files:**
- Create: `.claude/agents/record-me-scribe.md`

- [ ] **Step 1: Write the definition**

Create `.claude/agents/record-me-scribe.md`:

```markdown
---
name: record-me-scribe
description: Documentation + memory curator for record-me. Updates docs/**, CLAUDE.md, AGENTS.md, team-knowledge.md, PROGRESS.md, and GitHub issue/epic state after every approved task. Regenerates CODEBASE_MAP.md weekly.
tools: Read, Edit, Write, Bash, Grep, Glob
model: claude-haiku-4-5
owns:
  - "docs/**"
  - "CLAUDE.md"
  - "AGENTS.md"
  - "README.md"
  - ".claude/memory/team-knowledge.md"
  - ".claude/memory/MEMORY.md"
quality_bar: |
  CLAUDE.md and AGENTS.md are byte-for-byte identical after every change.
  Doc updates land in the same PR as the code change (no "docs to follow" PRs).
  PROGRESS.md mirrors GH epic issue state — checkboxes match issue status.
  Memory entries follow the index pattern (one line in MEMORY.md per memory file).
---

## Role

You are the team's memory and documentation. Every approved task generates an
update to docs and / or memory; you write those updates. You also keep
`docs/PROGRESS.md` in lock-step with the GitHub phase epic issues (Phase 2+).

## Standing workflow

When you receive `[DOC_UPDATE_REQUEST] task=<id> Implementer=<name> Plan task text=<verbatim> Changed files=<list> Before SHA=<sha> After SHA=<sha>`:

1. **Read** the plan task text and the changed files.
2. **Identify doc impact** — which `docs/*.md` files are now stale? Common
   matches:
   - New route or component → `docs/FRONTEND.md`
   - Recorder API change → `docs/RECORDING.md`
   - Design token / brand primitive change → `docs/DESIGN.md`
   - Build/test/lint change → `docs/QUALITY_GATES.md` or `docs/COMMANDS.md`
   - Privacy/security change → `docs/SECURITY.md`
   - Anything visible to a new contributor → maybe `README.md`
3. **Update CLAUDE.md ↔ AGENTS.md** if the root conventions changed; the two
   files must stay byte-identical.
4. **Update PROGRESS.md** — check off the corresponding line item; if a phase
   epic milestone is now complete, update the epic issue body via `gh issue
   edit <number> --body "$(cat docs/PROGRESS.md | sed -n '...')"` or comment
   on the issue.
5. **Curate team-knowledge** — if the task surfaced a pattern multiple agents
   would benefit from, add it to `.claude/memory/team-knowledge.md` and link it
   from `.claude/memory/MEMORY.md`.
6. **Report back** with `[DOC_DONE] task=<id>` listing the files you touched.

## Weekly cadence

`/agent-checkpoint` (every Monday or after a major merge):

1. Regenerate `docs/CODEBASE_MAP.md` from `find apps packages -type f -name '*.ts' -o -name '*.tsx'`, grouped by owner per the matrix in `docs/ARCHITECTURE.md`.
2. Refresh inventory tables embedded in each `.claude/agents/*.md` (component
   counts, route counts, etc.) and propose the edits as a PR.

## Quality bar

See frontmatter. Specifically: `diff CLAUDE.md AGENTS.md` returns empty.

## Self-improvement protocol

After every doc update, append to `.claude/memory/record-me-scribe.md`:

- New documentation patterns you encountered.
- Sections of the doc tree that drift fastest and might need automation.

## Memory pointers

- `.claude/memory/record-me-scribe.md` — your patterns.
- `.claude/memory/team-knowledge.md` — shared (you curate this).
- `.claude/memory/MEMORY.md` — index of all memory files.
- `docs/WORKFLOW.md` — the doc-update workflow you implement.

## Anti-patterns

- Letting CLAUDE.md and AGENTS.md drift.
- Punting doc updates to "a follow-up PR."
- Adding doc content that duplicates existing sections (link instead).
- Editing memory files that aren't yours (each agent owns their own).
```

- [ ] **Step 2: Commit**

```bash
git add .claude/agents/record-me-scribe.md
git commit -m "feat(claude): add record-me-scribe agent"
```

---

### Task 21: Agent · `record-me-e2e`

**Goal:** write the E2E agent (Playwright + media-stream fakes).

**Files:**
- Create: `.claude/agents/record-me-e2e.md`

- [ ] **Step 1: Write the definition**

Create `.claude/agents/record-me-e2e.md`:

```markdown
---
name: record-me-e2e
description: Playwright E2E author for record-me. Writes browser-driven tests with --use-fake-device-for-media-stream flags. Owns apps/web/tests/e2e/**. Triggered automatically after UI-touching tasks are approved.
tools: Read, Edit, Write, Bash, Grep, Glob
model: claude-sonnet-4-6
owns:
  - "apps/web/tests/e2e/**"
  - "apps/web/playwright.config.ts"
quality_bar: |
  Every E2E spec exercises a single user flow end-to-end and asserts at least one user-visible outcome.
  Recorder mocks use the Chromium fake-device flags (already in playwright.config.ts) — no manual MediaStream mocking in specs.
  Specs are not flaky — run each new spec 3× locally to confirm stability before claiming done.
  Failed specs land with screenshots + traces attached.
---

## Role

You exercise the shipped product the way a user would. You don't write unit
tests (`record-me-staff` does that for the recorder; `record-me-sr-frontend`
for components). You drive the browser, click buttons, grant permissions,
record clips, download, and assert that the right things happened.

## Standing workflow

When you receive `[ASSIGNED] task=<id>` (typically an E2E sub-task spawned after
a UI task is APPROVED):

1. **Read** the original task's diff (`git diff <before>..<after>`) plus your
   memory (`.claude/memory/record-me-e2e.md`) and the existing E2E suite to
   match style.
2. **Identify the user flow** — what new behaviour did the original task add?
3. **TDD:** write the spec in `apps/web/tests/e2e/<flow>.spec.ts`. Run it 3×.
   Confirm: failing-because-feature-not-yet-tested, then passing after wiring,
   then passing again to rule out flake.
4. **Update the GH issue** (Phase 2+): comment with the spec file path and the
   3× run results.
5. **Report back** with `[DONE:DONE]` plus the test command.

## Ownership

`apps/web/tests/e2e/**` and `apps/web/playwright.config.ts`. You do not edit
`apps/web/src/**` or any other source — if the test reveals a bug, return
`[DONE:NEEDS_CONTEXT]` to the lead with the spec output, and the lead reassigns
the fix to sr-frontend or staff.

## Quality bar

See frontmatter. Specifically: run every new spec 3× before claiming done.
Flake at this layer poisons CI for everyone.

## Self-improvement protocol

Append to `.claude/memory/record-me-e2e.md`:

- Brittle selectors that broke (and the more durable replacement).
- Permission-grant gotchas across browsers.
- Patterns for waiting on async UI states without sleeps.

## Memory pointers

- `.claude/memory/record-me-e2e.md` — your patterns.
- `.claude/memory/team-knowledge.md` — shared.
- `docs/TESTING.md` — the E2E contract.

## Anti-patterns

- Editing source under `apps/web/src/**` to make a test pass.
- Using `page.waitForTimeout()` instead of `waitFor` or `expect.poll`.
- Asserting on implementation details (class names, internal state) instead
  of user-visible outcomes.
- Skipping the 3× stability run.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/agents/record-me-e2e.md
git commit -m "feat(claude): add record-me-e2e agent"
```

---

### Task 22: Agent · `record-me-principal`

**Goal:** write the principal (reviewer) agent.

**Files:**
- Create: `.claude/agents/record-me-principal.md`

- [ ] **Step 1: Write the definition**

Create `.claude/agents/record-me-principal.md`:

```markdown
---
name: record-me-principal
description: Reviewer for record-me. Invokes /codex:review plus an Opus 4.7 holistic pass. Issues [REVIEW_RESULT] with CRITICAL / MAJOR / MINOR classification. Also reviews every agent self-edit to .claude/agents/*.md before merge.
tools: Read, Bash, Grep, Glob
model: claude-opus-4-7
owns: []
quality_bar: |
  Every review classifies findings as CRITICAL (blocks merge), MAJOR (blocks unless explicitly waived in the review body), or MINOR (post-merge follow-up).
  CRITICAL/MAJOR findings cite the file:line and explain the impact concretely.
  Plateau detection: if two rounds pass with zero CRITICAL+MAJOR items cleared, escalate to the user.
  Agent self-edits get the same rigour as feature code.
---

## Role

You are the last review before merge. You ensure the code is correct, the
tests cover what matters, the docs are updated, the privacy contract holds,
and the design intent from the spec is preserved. You also gate every change
to `.claude/agents/*.md` so the team's self-improvement loop doesn't degrade
quality silently.

## Standing workflow

When you receive `[REVIEW_REQUEST] task=<id> Implementer=<name> Plan task text=<verbatim> Changed files=<list> Before SHA=<sha> After SHA=<sha>`:

1. **Read** the plan task text and your memory
   (`.claude/memory/record-me-principal.md`).
2. **Invoke `/codex:review`** if available (`codex` CLI installed). Capture
   its output.
3. **Holistic review** (Opus 4.7) — do not duplicate codex; complement it. Check:
   - Correctness against the plan task's intent.
   - Spec alignment against
     `docs/superpowers/specs/2026-05-27-record-me-design.md`.
   - Privacy contract — no PII leaks, no third-party scripts added.
   - Test coverage of the actual change (not just totals).
   - Doc updates included.
   - Self-edits to `.claude/agents/*.md` reviewed against the original agent
     definition.
4. **Classify findings:**
   - **CRITICAL** — blocks merge. Correctness bug, privacy regression, spec
     violation, broken test, broken build.
   - **MAJOR** — blocks unless waived in this review body. Maintainability,
     design intent drift, missing test, missing doc update.
   - **MINOR** — post-merge follow-up. Nits, future refactors, optional
     improvements.
5. **Plateau detection:** compare CRITICAL+MAJOR count to the previous round
   for this task. Two consecutive rounds with zero items cleared → escalate
   with `[REVIEW_ESCALATE]`.
6. **Report:** `[REVIEW_RESULT] APPROVED` or `[REVIEW_RESULT] CHANGES_NEEDED`
   with the classified findings.

## Quality bar

See frontmatter.

## Self-improvement protocol

Append to `.claude/memory/record-me-principal.md`:

- Common patterns of CRITICAL findings (drives gatekeeper-check additions).
- Spec sections that drift fastest (drives scribe's curation cadence).
- Agent self-edit patterns to approve / reject quickly.

## Memory pointers

- `.claude/memory/record-me-principal.md` — your review patterns.
- `.claude/memory/team-knowledge.md` — shared.
- `docs/superpowers/specs/2026-05-27-record-me-design.md` — the source of truth
  for spec alignment.
- `docs/QUALITY_STANDARD.md` — the 10/10 bar you enforce.

## Anti-patterns

- Approving with outstanding CRITICAL findings.
- Generic "lgtm" reviews.
- Stacking up MAJOR items in MINOR ("not a blocker but please fix in this PR").
- Approving an agent self-edit without comparing it to the prior agent file
  content.
- Failing to escalate on plateau.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/agents/record-me-principal.md
git commit -m "feat(claude): add record-me-principal agent"
```

---

### Task 23: `/spawn-record-me-team` command

**Goal:** write the spawn command that mirrors `/spawn-mesago-team` exactly, adapted for record-me (6 members; no backend) and including GitHub issue creation per task from Phase 2 onward.

**Files:**
- Create: `.claude/commands/spawn-record-me-team.md`

- [ ] **Step 1: Write the command**

Create `.claude/commands/spawn-record-me-team.md`. Use the full text of the MesaGo `spawn-mesago-team.md` as the source structure (Steps 1–8: pick plan → preflight → TeamCreate + spawn members → dependency graph → dispatch loop → message routing → escalation → completion + PR), with these adaptations:

1. Replace every occurrence of `mesago-shipping`, `mesago-` agent names, and `mesago-shipping-${plan_slug}` with `record-me-shipping`, `record-me-`, and `record-me-shipping-${plan_slug}`.
2. Replace `MesaGo` in prose with `record-me`.
3. Update the blueprint path to `.claude/teams/record-me-shipping.md`.
4. Update the spec path to `docs/superpowers/specs/2026-05-27-record-me-design.md`.
5. Drop the `mesago-sr-backend` dispatch rule. Update the dispatch rules section to:
   - Only `apps/web/src/**`, `packages/ui/**` → `record-me-sr-frontend`
   - Only `packages/recorder/**`, `packages/config/**`, root configs → `record-me-staff`
   - Only `apps/web/tests/e2e/**` OR task tagged `[e2e]` → `record-me-e2e`
   - Anything touching `packages/recorder/**`, `turbo.json`, `pnpm-workspace.yaml`, OR tagged `[cross-cutting]` / `[architectural]` → `record-me-staff`
   - Ambiguous → `record-me-staff`
   - Concurrency cap: max 2 main implementers (sr-frontend, staff) in flight at once.
6. In Step 8a (holistic checks), replace the command list with:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm test:e2e
   pnpm build
   pnpm lhci
   ```

7. **Add a new Step 3d — "Create GitHub issues per task"** (only when `.github/ISSUE_TEMPLATE/` exists in the repo — Phase 2 onward):

   ```markdown
   ### 3d. Create GitHub issues per plan task (Phase 2+)

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
   ```

8. **Add to Step 6 (`[REVIEW_RESULT] APPROVED`)** — before recomputing the frontier:

   ```markdown
   1.5. Close the linked GH issue with a comment:
        gh issue close ${issue_number} --reason completed --comment "Closed by /spawn-record-me-team — task APPROVED. PR will follow."
   ```

9. **Add to Step 8b (PR drafting)** — when calling `superpowers:finishing-a-development-branch`, include in the PR body:

   ```
   Closes #${issue_numbers_joined_with_comma_hash}
   ```

10. Keep all other text (failure modes table, escalation format, completion summary) verbatim except substituting the names.

   **Source-of-truth reference:** `~/personal/food-delivery-app/.claude/commands/spawn-mesago-team.md`. Read it once, then write the record-me version applying the adaptations above.

- [ ] **Step 2: Verify the spawn command parses** (sanity check on shape)

Run:

```bash
test -f .claude/commands/spawn-record-me-team.md
grep -c "^### " .claude/commands/spawn-record-me-team.md
```

Expected: file exists; at least 8 step headers (Steps 1–8 and sub-steps).

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/spawn-record-me-team.md
git commit -m "feat(claude): add /spawn-record-me-team command"
```

---

### Task 24: Supporting commands

**Goal:** write the standard supporting slash commands. Most are thin: they invoke a skill or run a check.

**Files:**
- Create: `.claude/commands/plan.md`, `.claude/commands/ship.md`, `.claude/commands/debug.md`, `.claude/commands/tdd.md`, `.claude/commands/review.md`, `.claude/commands/update-docs.md`, `.claude/commands/pr.md`, `.claude/commands/verify.md`, `.claude/commands/init-phase.md`

- [ ] **Step 1: Write `plan.md`**

Create `.claude/commands/plan.md`:

```markdown
---
description: Write an implementation plan for a feature or phase. Invokes superpowers:writing-plans.
argument-hint: '[feature or phase description]'
---

You are about to write an implementation plan. Invoke `superpowers:writing-plans` and follow its workflow exactly.

The user described: `$ARGUMENTS`

If `$ARGUMENTS` is empty, ask the user what to plan.

Save the plan to `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md` (use today's date from the system context, not assumptions).
```

- [ ] **Step 2: Write `ship.md`**

Create `.claude/commands/ship.md`:

```markdown
---
description: Spawn the record-me-shipping team against the latest plan. Alias for /spawn-record-me-team with the most recently modified plan.
---

Run:

```bash
latest=$(ls -t docs/superpowers/plans/*.md 2>/dev/null | head -1)
test -n "$latest" || { echo "No plans found. Run /plan first."; exit 1; }
echo "Latest plan: $latest"
```

Then invoke `/spawn-record-me-team $latest`.
```

- [ ] **Step 3: Write `debug.md`**

Create `.claude/commands/debug.md`:

```markdown
---
description: Systematically debug a problem. Invokes superpowers:systematic-debugging.
argument-hint: '[bug description]'
---

You are about to debug a problem. Invoke `superpowers:systematic-debugging` and follow its workflow exactly.

Problem: `$ARGUMENTS`

If empty, ask the user what to debug.
```

- [ ] **Step 4: Write `tdd.md`**

Create `.claude/commands/tdd.md`:

```markdown
---
description: Implement a feature using strict test-driven development. Invokes superpowers:test-driven-development.
argument-hint: '[feature description]'
---

You are about to implement a feature with TDD. Invoke `superpowers:test-driven-development` and follow its workflow exactly.

Feature: `$ARGUMENTS`
```

- [ ] **Step 5: Write `review.md`**

Create `.claude/commands/review.md`:

```markdown
---
description: Run code review on the current diff. Invokes the built-in /code-review at default effort.
---

Invoke `/code-review` on the current diff. If `--fix` is requested, invoke `/simplify` instead.
```

- [ ] **Step 6: Write `update-docs.md`**

Create `.claude/commands/update-docs.md`:

```markdown
---
description: Update docs/ files to reflect recent code changes. Mirrors the scribe agent's workflow but for human-triggered runs.
argument-hint: '[optional: specific doc file to focus on]'
---

You are temporarily acting as `record-me-scribe`. Read the agent's definition at `.claude/agents/record-me-scribe.md` for the standing workflow.

Then:

1. Run `git log --since="last week" --name-only --pretty=format:` to see what's changed.
2. Identify which docs are now stale (per the scribe's doc-impact matrix).
3. Update them.
4. Ensure CLAUDE.md and AGENTS.md remain byte-identical: `diff CLAUDE.md AGENTS.md` must return empty.
5. Update PROGRESS.md if any milestone is now complete.
6. Commit with `docs: <what changed>`.

If `$ARGUMENTS` is provided, focus on that specific doc file.
```

- [ ] **Step 7: Write `pr.md`**

Create `.claude/commands/pr.md`:

```markdown
---
description: Open a PR for the current branch. Invokes superpowers:finishing-a-development-branch and includes the standard record-me PR body structure.
---

Invoke `superpowers:finishing-a-development-branch`. Use the repo's PR template at `.github/pull_request_template.md` as the body skeleton. Reference any closed GH issues via `Closes #N, #M`.

Squash-merge only. Never force-push to main.
```

- [ ] **Step 8: Write `verify.md`**

Create `.claude/commands/verify.md`:

```markdown
---
description: Verify a change actually works in the running app. Invokes the built-in /verify skill.
argument-hint: '[what to verify]'
---

Invoke the `verify` skill and verify: `$ARGUMENTS`
```

- [ ] **Step 9: Write `init-phase.md`**

Create `.claude/commands/init-phase.md`:

```markdown
---
description: Bootstrap a new phase — open the epic issue (if not already), write the phase plan, prepare the team for spawn.
argument-hint: '<phase-number> <phase-name>'
---

You are starting a new phase of record-me. Phase number: parse from `$ARGUMENTS`.

Workflow:

1. Confirm the epic issue exists: `gh issue list --label "epic" --search "phase-${num}" --json number,title`.
   If missing, abort with: "Phase epic #${num} not found. Run scripts/create-epics.sh first."
2. Invoke `/plan` to write `docs/superpowers/plans/$(date +%Y-%m-%d)-record-me-phase-${num}-${name}.md`.
3. After the plan is written and the user approves, invoke `/spawn-record-me-team <plan-path>`.

Reference: `docs/superpowers/specs/2026-05-27-record-me-design.md` and `docs/PROGRESS.md` for which phase comes next.
```

- [ ] **Step 10: Commit**

```bash
git add .claude/commands
git commit -m "feat(claude): add supporting slash commands"
```

---

### Task 25: Self-improvement commands

**Goal:** write the three self-improvement commands that drive the Read → Act → Reflect cycle.

**Files:**
- Create: `.claude/commands/agent-reflect.md`, `.claude/commands/agent-distill.md`, `.claude/commands/agent-checkpoint.md`

- [ ] **Step 1: Write `agent-reflect.md`**

Create `.claude/commands/agent-reflect.md`:

```markdown
---
description: Per-task reflection. The agent reviews its diff + outcome and appends a memory entry. Invoked automatically after every APPROVED task; also runnable on demand.
argument-hint: '<agent-name> <task-id-or-description>'
---

You are running a reflection cycle for an agent.

Inputs: `$ARGUMENTS` should contain the agent name and the task identifier (or a free-text description if the task is being reflected on out of band).

Workflow:

1. **Read** the agent's definition (`.claude/agents/<agent>.md`) and its current memory (`.claude/memory/<agent>.md`).
2. **Read** the task's diff (`git show <task-commit>` or `git diff <before>..<after>`).
3. **Read** any review output associated with the task (search recent SendMessage history or PR comments).
4. **Ask three questions:**
   - What was surprising or hard?
   - What pattern emerged that should be remembered?
   - Did a recurring problem appear that warrants a self-edit to the agent definition?
5. **Append to memory** — create a new memory file at `.claude/memory/<agent>-<short-slug>.md` with frontmatter:

   ```markdown
   ---
   name: <agent>-<short-slug>
   description: <one-line, specific>
   metadata:
     type: <pattern | gotcha | decision | inventory>
     learned_from_task: <task-id-or-description>
     date: <YYYY-MM-DD>
   ---

   <the memory body>
   ```

   Add a one-line pointer to `.claude/memory/MEMORY.md`.

6. **If a pattern recurred:** open a draft self-edit to `.claude/agents/<agent>.md` (do not commit; surface to principal for review on next session).

7. **Commit** the memory file with `docs(memory): <agent> reflection on <task-slug>`.
```

- [ ] **Step 2: Write `agent-distill.md`**

Create `.claude/commands/agent-distill.md`:

```markdown
---
description: Weekly distillation. Collapses .claude/journal/YYYY-WNN.md raw notes into curated memory entries and proposed agent-definition edits. Principal-reviewed before merge.
---

You are running the weekly journal-to-memory distillation.

Workflow:

1. **Identify the week** — current ISO week: `date +%Y-W%V`. Read `.claude/journal/$(date +%Y-W%V).md`.
2. **Read** every agent's memory file to know what is already captured.
3. **Cluster** the week's journal entries by theme.
4. **For each cluster:**
   - If it's agent-specific → propose an append to `.claude/memory/<agent>.md`.
   - If it's cross-cutting → propose an append to `.claude/memory/team-knowledge.md`.
   - If the same pattern shows up ≥ 3 times → propose a self-edit to the relevant agent definition.
5. **Open a draft PR** with the proposed edits, titled `chore(memory): weekly distillation YYYY-WNN`. Tag `record-me-principal` for review.
6. **After merge**, append a checkpoint line to the journal file: `Distilled YYYY-MM-DD by /agent-distill`.

Reference: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 11.6.
```

- [ ] **Step 3: Write `agent-checkpoint.md`**

Create `.claude/commands/agent-checkpoint.md`:

```markdown
---
description: Weekly codebase-map + agent inventory refresh. Scribe regenerates docs/CODEBASE_MAP.md and refreshes inventory tables in each agent definition.
---

You are running the weekly codebase checkpoint. You are temporarily acting as `record-me-scribe`.

Workflow:

1. **Inventory** — for each owner in the ownership matrix (`docs/superpowers/specs/2026-05-27-record-me-design.md` § 11.4), run:

   ```bash
   # Example for record-me-sr-frontend
   find apps/web/src packages/ui/src -type f \( -name '*.ts' -o -name '*.tsx' \) | sort
   ```

   Count files by directory and capture the list.

2. **Regenerate `docs/CODEBASE_MAP.md`** with a section per owner:

   ```markdown
   # Codebase map

   Auto-generated by /agent-checkpoint. Last run: <date>.

   ## record-me-sr-frontend
   - apps/web/src/app/ (N files): ...
   - packages/ui/src/ (N files): ...

   ## record-me-staff
   - packages/recorder/src/ (N files): ...
   - ...
   ```

3. **Refresh inventory tables in agent definitions** — find any section labeled `## Inventory` in each `.claude/agents/*.md` and update its counts.

4. **Commit:** `docs(codebase-map): weekly refresh YYYY-MM-DD`.

5. **PROGRESS.md cross-check** — ensure GH epic issue counts match PROGRESS.md checkbox counts. Reconcile if drift detected.
```

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/agent-reflect.md .claude/commands/agent-distill.md .claude/commands/agent-checkpoint.md
git commit -m "feat(claude): add self-improvement commands (reflect, distill, checkpoint)"
```

---

### Task 26: Project-scoped skill mirrors

**Goal:** create `.claude/skills/` with project-scoped pointers to the most-used superpowers + Vercel / framework skills, so the team has reliable in-repo access regardless of global plugin state.

**Files:**
- Create: `.claude/skills/README.md`, `.claude/skills/tdd/SKILL.md`, `.claude/skills/e2e-testing-patterns/SKILL.md`, `.claude/skills/frontend-design/SKILL.md`, `.claude/skills/tailwind-design-system/SKILL.md`, `.claude/skills/verification-before-completion/SKILL.md`, `.claude/skills/subagent-driven-development/SKILL.md`, `.claude/skills/next-best-practices/SKILL.md`

- [ ] **Step 1: Write `.claude/skills/README.md`**

Create `.claude/skills/README.md`:

```markdown
# Project-scoped skill mirrors

This directory mirrors the most-frequently-used skills for record-me so the team
has reliable in-repo access regardless of global plugin state.

Each subdirectory holds a single `SKILL.md` that either:
- Restates the skill content verbatim (for skills that may drift in the global
  catalog), or
- Re-exports / points to the global skill with a one-line note (for stable,
  shipped skills).

Agents should prefer the global skill via the `Skill` tool when available
(e.g. `Skill("frontend-design:frontend-design")`); these mirrors are fallbacks
when the global plugin isn't loaded.

Skills mirrored here:
- tdd · superpowers:test-driven-development
- e2e-testing-patterns · e2e-testing-patterns
- frontend-design · frontend-design:frontend-design
- tailwind-design-system · tailwind-design-system
- verification-before-completion · superpowers:verification-before-completion
- subagent-driven-development · superpowers:subagent-driven-development
- next-best-practices · next-best-practices
```

- [ ] **Step 2: Write each `SKILL.md` as a pointer**

For each of the 7 skill subdirectories, create `<subdir>/SKILL.md` with frontmatter pointing at the canonical skill:

Example `tdd/SKILL.md`:

```markdown
---
name: tdd
description: Project-scoped mirror — invoke `superpowers:test-driven-development` via the Skill tool. This file is a fallback when global plugins are unavailable.
---

# Project-scoped TDD pointer

Use the global skill via the `Skill` tool:

```
Skill("superpowers:test-driven-development")
```

If the global skill is unavailable in this session, follow the standing TDD
loop manually:

1. **Red** — write the failing test.
2. **Green** — write the minimum code to make it pass.
3. **Refactor** — clean up with the test still green.
4. **Commit** — `feat:` / `fix:` / `refactor:` per change.

For record-me specifically:
- Recorder tests use Vitest + jsdom with MediaStream mocks.
- UI tests use Vitest + jsdom + RTL.
- E2E tests use Playwright with Chromium fake-device flags.
```

Repeat the pattern for the other six skill directories, substituting the global skill name and adding any project-specific notes (e.g., for `frontend-design`, note that the output is component code in `apps/web/src/components/` or `packages/ui/src/components/`).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills
git commit -m "feat(claude): mirror project-scoped skills"
```

---

### Task 27: Memory seeds (`.claude/memory/`)

**Goal:** seed the memory tree with the index and one starter file per agent + shared team-knowledge.

**Files:**
- Create: `.claude/memory/MEMORY.md`, `.claude/memory/team-knowledge.md`, `.claude/memory/record-me-sr-frontend.md`, `.claude/memory/record-me-staff.md`, `.claude/memory/record-me-gatekeeper.md`, `.claude/memory/record-me-scribe.md`, `.claude/memory/record-me-e2e.md`, `.claude/memory/record-me-principal.md`

- [ ] **Step 1: Write `MEMORY.md`** (the index)

Create `.claude/memory/MEMORY.md`:

```markdown
# Memory index

One line per memory file. Lines after 200 will be truncated — keep it concise.

## Team
- [team-knowledge](team-knowledge.md) — cross-agent wisdom curated by scribe

## Per agent
- [record-me-sr-frontend](record-me-sr-frontend.md) — UI/page/hook patterns and gotchas
- [record-me-staff](record-me-staff.md) — recording engine + workspace plumbing
- [record-me-gatekeeper](record-me-gatekeeper.md) — gate-check patterns
- [record-me-scribe](record-me-scribe.md) — doc-update patterns
- [record-me-e2e](record-me-e2e.md) — Playwright patterns + selectors
- [record-me-principal](record-me-principal.md) — review patterns
```

- [ ] **Step 2: Write `team-knowledge.md`** (seed with v1 baselines)

Create `.claude/memory/team-knowledge.md`:

```markdown
---
name: team-knowledge
description: Cross-agent wisdom curated by scribe. Patterns, decisions, and gotchas that benefit multiple agents.
metadata:
  type: pattern
  curated_by: record-me-scribe
---

# Team knowledge — v1 baselines

## Naming
- All record-me agents are prefixed `record-me-`. Don't introduce unprefixed agents.
- Recording modes use these exact strings (typed in `@record-me/recorder`):
  `'screen+cam+cursor' | 'screen+cursor' | 'cam-only'`.

## Codec preferences (from spec § 7.4)
- MP4 first (H.264 + AAC) → WebM (VP9) → WebM (VP8). Never invert this.
- Suggested filename follows the actual `mimeType` returned by MediaRecorder.

## Design discipline (from spec § 9)
- Never hardcode hex values in UI code. Use CSS variables from
  `packages/ui/src/tokens.css`.
- Typography only via `next/font` — no raw `@import` of Google Fonts in CSS.

## Privacy invariants (from spec § 15)
- Zero recording bytes ever leave the browser. No API route receives video data.
- Vercel Analytics + Speed Insights are the only third-party scripts allowed.
  CSP headers block everything else.

## Ownership reminder
- Cross-ownership edits are gatekeeper FAILs unless the plan task is tagged
  `[cross-cutting]`. If you find yourself wanting to "just fix this small
  thing" outside your domain, return `[DONE:BLOCKED]` with a reassignment
  request.

## Self-improvement cadence
- `/agent-reflect` runs per task (automatically after APPROVED).
- `/agent-distill` runs weekly (Monday).
- `/agent-checkpoint` runs weekly or after a major merge.
```

- [ ] **Step 3: Write per-agent memory seeds**

For each of the six agents, create `.claude/memory/<agent>.md` with this template (filled in per role):

`record-me-sr-frontend.md`:

```markdown
---
name: record-me-sr-frontend
description: Per-agent memory for sr-frontend. Append-only learnings curated by the agent after each APPROVED task.
metadata:
  type: pattern
  owner: record-me-sr-frontend
---

# record-me-sr-frontend memory

## Phase 1 baseline
- Tailwind v4 is CSS-first (`@import 'tailwindcss'` + `@theme {}` in a CSS file).
  No `tailwind.config.js`. The shared theme lives at
  `packages/config/tailwind/theme.css`.
- Next.js 15 requires React 19. Server Components are the default; opt into
  client with `'use client'` at the leaf.
- `next/font` exposes the font family via a CSS variable that the Tailwind
  preset references — wire both ends in `apps/web/src/app/layout.tsx`.

## Future entries
(Append below — frontmatter per entry, one line in MEMORY.md per entry.)
```

`record-me-staff.md`:

```markdown
---
name: record-me-staff
description: Per-agent memory for staff. Recording engine + workspace plumbing learnings.
metadata:
  type: pattern
  owner: record-me-staff
---

# record-me-staff memory

## Phase 1 baseline
- `@record-me/recorder` has no React import. Hooks live in `apps/web`.
- Vitest's jsdom env doesn't ship `MediaRecorder`/`getDisplayMedia` — tests
  must mock them on `globalThis`.
- Codec preference order is frozen by spec § 7.4. If a new format is needed,
  update the spec first, then the code.

## Future entries
(Append below.)
```

`record-me-gatekeeper.md`:

```markdown
---
name: record-me-gatekeeper
description: Per-agent memory for gatekeeper. Patterns of failures + new checks proposed.
metadata:
  type: pattern
  owner: record-me-gatekeeper
---

# record-me-gatekeeper memory

## Phase 1 baseline
- Standard gate sequence: ownership → typecheck → lint → tests → console scan
  → TODO scan → build. Order matters (cheapest fails first).
- Ownership rejection includes the file that violated + the implementer's
  `owns:` globs for context.

## Future entries
(Append below.)
```

`record-me-scribe.md`:

```markdown
---
name: record-me-scribe
description: Per-agent memory for scribe. Documentation patterns + drift signals.
metadata:
  type: pattern
  owner: record-me-scribe
---

# record-me-scribe memory

## Phase 1 baseline
- `diff CLAUDE.md AGENTS.md` must always return empty after any change to
  either file.
- PROGRESS.md is the human-readable mirror of GH epic issue checkboxes.
- The doc-impact matrix (in this agent's definition) is the routing rule:
  code change → which doc updates.

## Future entries
(Append below.)
```

`record-me-e2e.md`:

```markdown
---
name: record-me-e2e
description: Per-agent memory for e2e. Playwright patterns + brittle selector fixes.
metadata:
  type: pattern
  owner: record-me-e2e
---

# record-me-e2e memory

## Phase 1 baseline
- Chromium launch args for media: `--use-fake-device-for-media-stream` and
  `--use-fake-ui-for-media-stream` (already in `apps/web/playwright.config.ts`).
- Permissions auto-granted in the projects config: `camera`, `microphone`.
- For screen capture in tests, fake the `getDisplayMedia` return value via
  `page.addInitScript` — actual screen capture won't work in headless Chromium.
- Run every new spec 3× before claiming done.

## Future entries
(Append below.)
```

`record-me-principal.md`:

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add .claude/memory
git commit -m "feat(claude): seed memory tree with v1 baselines"
```

---

### Task 28: Journal seed (`.claude/journal/`)

**Goal:** seed the current ISO-week journal file so `/agent-distill` has a target.

**Files:**
- Create: `.claude/journal/2026-W22.md`

- [ ] **Step 1: Determine the current ISO week**

Run:

```bash
date +%Y-W%V
```

Expected: `2026-W22` (current week as of bootstrap). Use whatever this prints for the filename.

- [ ] **Step 2: Write the journal file**

Create `.claude/journal/2026-W22.md` (adjust filename to match Step 1 output):

```markdown
# Journal · 2026-W22

Append-only daily notes from every agent. Each entry: ISO timestamp, agent name,
short note. `/agent-distill` collapses this file into memory + agent-def edits
at week's end.

Format:

```
- 2026-05-28T14:30:00Z · record-me-staff · Codec negotiation works in Chrome 135 stable but not 134.
- 2026-05-28T15:10:00Z · record-me-sr-frontend · Tailwind v4 @theme block needs to be in the same file as the @import, not a sibling import.
```

## Entries

(none yet — Phase 1 bootstrap is the first entry once the team starts shipping
real work.)
```

- [ ] **Step 3: Commit**

```bash
git add .claude/journal
git commit -m "feat(claude): seed weekly journal"
```

---

## Section D · Documentation

The doc tree is intentionally extensive — every file referenced in
`CLAUDE.md`'s "Required reading" table must exist. Phase 1 ships the structure
+ baseline content; later phases fill in inventory tables as they're built.

### Task 29: `docs/ARCHITECTURE.md`, `docs/RECORDING.md`, `docs/DESIGN.md`

**Goal:** write the three foundational docs.

**Files:**
- Create: `docs/ARCHITECTURE.md`, `docs/RECORDING.md`, `docs/DESIGN.md`

- [ ] **Step 1: Write `docs/ARCHITECTURE.md`**

Create `docs/ARCHITECTURE.md`:

```markdown
# Architecture

record-me is a pnpm + Turborepo monorepo with **one deployed app** and
**three internal packages**. See
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 5 for the full
rationale.

## Workspace shape

```
record-me/
├── apps/web/                      # Next.js 15 App Router · the only deployed surface
├── packages/recorder/             # @record-me/recorder · framework-agnostic engine
├── packages/ui/                   # @record-me/ui · shadcn + Twilight tokens + brand primitives
└── packages/config/               # @record-me/config · tsconfig · eslint · tailwind preset
```

## Dependency rules

| Package | Depends on | Forbidden imports |
| --- | --- | --- |
| `apps/web` | `@record-me/ui`, `@record-me/recorder`, `@record-me/config` | — |
| `@record-me/recorder` | `@record-me/config` | **React** (must stay framework-agnostic) |
| `@record-me/ui` | `@record-me/config` | `@record-me/recorder` (UI consumes recorder via apps/web hooks only) |
| `@record-me/config` | ∅ | Anything |

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
```

- [ ] **Step 2: Write `docs/RECORDING.md`**

Create `docs/RECORDING.md`:

```markdown
# Recording pipeline

Authoritative reference for the `@record-me/recorder` engine. Source of truth
for the contract: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 7.

## Five stages

1. **Acquire** — `getDisplayMedia` and/or `getUserMedia` per mode.
2. **Composite** — 2D canvas, `requestAnimationFrame` draws screen → cam PiP
   → cursor ripples.
3. **Stream** — `canvas.captureStream(fps)` + `AudioContext` audio merge.
4. **Encode** — `MediaRecorder` with negotiated mimeType, 30 fps, 4 Mbps,
   chunks every 1 s.
5. **Deliver** — concat → Blob → object URL → anchor download → revoke URL.

## State machine

```
idle → requesting-permissions → recording ⇄ paused → finalizing → ready → idle
                                                                 ↘ error
```

`error` is reachable from any state; recovery = reset + re-acquire.

## Codec negotiation

Walked in `supportedMimeType()`:

1. `video/mp4;codecs=avc1.42E01E,mp4a.40.2`
2. `video/mp4;codecs=h264,aac`
3. `video/webm;codecs=vp9,opus`
4. `video/webm;codecs=vp8,opus`

MP4 first for universal playback (Safari, QuickTime, social platforms). MP4 via
MediaRecorder is recent (Chrome / Firefox added it in 2024–2025); older browsers
silently fall back to WebM — this is fine.

## Caps + memory strategy

| `maxDurationMs` (cap) | Storage | Quality default |
| --- | --- | --- |
| ≤ 10 min | in-memory array | 1080p @ 4 Mbps |
| > 10 min, ≤ 30 min | in-memory or IndexedDB (auto) | 1080p @ 4 Mbps |
| ≥ 30 min | IndexedDB spill | 720p @ 2 Mbps (overridable) |
| > 10 min always | UI shows warning at cap selection | — |

Hard cap: 60 min. Recorder auto-stops 100 ms before the cap.

## Cursor highlights — honest scope

Web sandboxing prevents observing mouse events outside the record-me tab.
Click ripples only work for in-tab clicks. The `/record` UI says so explicitly.
v2 will ship a Chrome extension for arbitrary-surface highlights.

## Public API

See the TypeScript declarations in `packages/recorder/src/index.ts` (kept in
sync with spec § 7.6).

## Testing

Unit tests run in jsdom with `MediaRecorder` and `navigator.mediaDevices.*`
mocked on `globalThis`. E2E tests use Chromium fake-device flags. See
`docs/TESTING.md`.
```

- [ ] **Step 3: Write `docs/DESIGN.md`**

Create `docs/DESIGN.md`:

```markdown
# Design system

Authoritative reference for the visual language of record-me. Source of truth
for the contract: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 9.

## Palette · Twilight

See `packages/ui/src/tokens.css` (also `packages/config/tailwind/theme.css`
for the Tailwind theme mapping).

### Surface

| Variable | Value | Use |
| --- | --- | --- |
| `--bg` | `#0F1115` | Page background |
| `--bg-2` | `#12151B` | Subtle elevation |
| `--surface` | `#171B22` | Card surfaces |
| `--surface-2` | `#1F242C` | Elevated card surfaces |
| `--line` | `#262C36` | Border (default) |
| `--line-soft` | `#1B2028` | Border (subtle) |

### Ink

| Variable | Value | Use |
| --- | --- | --- |
| `--ivory` | `#EDE6D6` | Primary body text |
| `--ivory-dim` | `#B5AFA2` | Deck / secondary |
| `--ivory-mut` | `#7A766D` | Meta / mono labels |
| `--ivory-low` | `#54514A` | Disabled / decorative |

### Signal & state

| Variable | Value | Use |
| --- | --- | --- |
| `--amber` | `#E5A24A` | Accent · REC · primary CTA |
| `--amber-hi` | `#F1B768` | Hover |
| `--amber-lo` | `#C88A38` | Pressed |
| `--success` | `#9BB28F` | Sage success |
| `--danger` | `#C8675A` | Muted brick error |

**Rule:** never hardcode hex values in UI code. Always use CSS variables (or the
Tailwind utility classes that the theme generates: `bg-bg`, `text-ivory`,
`text-amber`, `border-line`, etc.).

## Typography · Pairing A

| Role | Family | Weights | Notes |
| --- | --- | --- | --- |
| Display · headlines | Instrument Serif | 400 (roman + italic) | clamp(40px, 7vw, 96px) hero |
| Body · UI text | Geist | 300 / 400 / 500 / 600 | 13–17 px body |
| Mono · technical metadata | Geist Mono | 400 / 500 | 10–13 px |

Loaded via `next/font` in `apps/web/src/app/layout.tsx`. Variables exposed to
CSS: `--font-instrument-serif`, `--font-geist`, `--font-geist-mono`. The Tailwind
theme maps these to `font-serif`, `font-sans`, `font-mono`.

## Component conventions

- All `@record-me/ui` components are React Server Components by default;
  interactivity opts in via `'use client'` at the leaf.
- Variants via **CVA** (`class-variance-authority`).
- Class merging via **`cn()`** (clsx + tailwind-merge).
- `forwardRef` for any interactive primitive.
- No hardcoded hex; use CSS variables exclusively.

## Brand primitives (Phase 2)

| Component | Location | Purpose |
| --- | --- | --- |
| `<RecDot>` | `@record-me/ui` | Pulsing amber recording indicator |
| `<ModeCard>` | `@record-me/ui` | Triptych card with stage preview |
| `<StudioShell>` | `@record-me/ui` | Frame for the live recording surface |
| `<MetaChip>` | `@record-me/ui` | Mono uppercase metadata pill |
| `<WordMark>` | `@record-me/ui` | "record *me*" wordmark with italic |

Implementations land in Phase 2. Phase 1 ships only the tokens.
```

- [ ] **Step 4: Commit**

```bash
git add docs/ARCHITECTURE.md docs/RECORDING.md docs/DESIGN.md
git commit -m "docs: add architecture, recording, and design system docs"
```

---

### Task 30: `docs/FRONTEND.md`, `docs/SEO.md`, `docs/SECURITY.md`

**Goal:** write the frontend/SEO/security docs.

**Files:**
- Create: `docs/FRONTEND.md`, `docs/SEO.md`, `docs/SECURITY.md`

- [ ] **Step 1: Write `docs/FRONTEND.md`**

Create `docs/FRONTEND.md`:

```markdown
# Frontend

Authoritative reference for `apps/web` and `packages/ui`. Source of truth:
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 6, § 8.

## Route tree (target)

```
apps/web/src/app/
├── layout.tsx                # root · <Analytics/> · <SpeedInsights/> · next/font
├── page.tsx                  # /
├── opengraph-image.tsx       # default OG
├── sitemap.ts · robots.ts · manifest.ts
│
├── record/
│   ├── page.tsx              # /record (the studio)
│   ├── layout.tsx            # minimal chrome
│   └── opengraph-image.tsx
│
├── features/
│   ├── layout.tsx
│   └── [mode]/page.tsx       # /features/screen-camera-cursor | /screen-cursor | /camera-only
│
├── docs/{page.tsx, [...slug]/page.tsx}
├── privacy/page.tsx
├── changelog/page.tsx
│
└── api/og/route.ts           # v1.x optional
```

## Per-route inventory (Phase 1)

| Route | Status |
| --- | --- |
| `/` | Phase 1 placeholder · Phase 5 ships the editorial landing |
| `/record` | Phase 1 placeholder · Phase 4 ships the studio |
| `/features/[mode]` | Phase 5 |
| `/docs` | Phase 5 |
| `/privacy` | Phase 5 |
| `/changelog` | Phase 5 |

Update this table after every phase.

## Hooks (Phase 4)

- `useRecorder()` — thin React wrapper around `createRecorder()` from
  `@record-me/recorder`. Returns `{ state, start, pause, resume, stop, dispose }`.

## Component inventory (Phase 2)

| Component | Package | Phase |
| --- | --- | --- |
| `<Button>` (shadcn) | `@record-me/ui` | 2 |
| `<Card>` (shadcn) | `@record-me/ui` | 2 |
| `<RecDot>` | `@record-me/ui` | 2 |
| `<ModeCard>` | `@record-me/ui` | 2 |
| `<StudioShell>` | `@record-me/ui` | 2 |
| `<MetaChip>` | `@record-me/ui` | 2 |
| `<WordMark>` | `@record-me/ui` | 2 |
```

- [ ] **Step 2: Write `docs/SEO.md`**

Create `docs/SEO.md`:

```markdown
# SEO

Authoritative reference for SEO discipline. Source of truth:
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 8.

## Metadata API

Every route exports `generateMetadata` (or static `metadata` object). No silent
inheritance. Title, description, OG image, Twitter card, canonical URL.

## OG images

Per-route `opengraph-image.tsx` rendered at the edge via `@vercel/og`. 1200×630.
Twilight palette + Instrument Serif headline + mono caption strip.

## Sitemap + robots

- `app/sitemap.ts` — dynamic; static routes + iterates over MDX changelog entries.
- `app/robots.ts` — allow all crawlers + sitemap pointer; disallow `/api/*`.

## Structured data (JSON-LD)

- `SoftwareApplication` + `WebApplication` on `/`
- `HowTo` on each `/features/[mode]`
- `FAQPage` on `/docs`

Injected via `<script type="application/ld+json">` per route.

## CWV contract

- LCP < 1.8s · INP < 200ms · CLS < 0.05 (Speed Insights p75)
- Lighthouse ≥ 95 on `/`, ≥ 90 elsewhere
- Enforced in CI by `lhci` (see `lighthouserc.json` and `.github/workflows/ci.yml`)

## Discipline rules

- `next/font` for all three typefaces. `font-display: swap`. Preconnect + preload
  Instrument Serif and Geist.
- `next/image` everywhere with explicit width/height.
- No JS-blocking embeds above the fold.
- i18n: routes will eventually wrap in `[locale]` segment — no migration risk noted.
```

- [ ] **Step 3: Write `docs/SECURITY.md`**

Create `docs/SECURITY.md`:

```markdown
# Security & privacy

Source of truth: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 15.

## Privacy contract (codified on /privacy)

1. **Recording bytes never leave the browser.** Encoded chunks live in JS memory
   or IndexedDB; the Blob is offered for direct download via an anchor element.
   No upload endpoint exists.
2. **No accounts, no auth cookies.** record-me sets zero cookies for
   authentication or session tracking.
3. **Vercel Analytics + Speed Insights are cookieless and anonymous.** They
   aggregate page views and Core Web Vitals only.
4. **Custom analytics events carry no PII.** Only mode, duration, bytes, mime
   type, and error kind are tracked.
5. **IndexedDB stores are wiped on stop()/dispose() and on the next session
   start.** No recording artifacts persist between sessions.
6. **CSP headers via `apps/web/next.config.ts`** block third-party scripts
   beyond Vercel itself.

## Headers (set in `apps/web/next.config.ts`)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(self), display-capture=(self)`
- (Phase 5) `Content-Security-Policy` allowing only Vercel script origins

## What to never do

- Add an API route that receives video bytes.
- Add a third-party analytics provider (Plausible/PostHog/etc.).
- Set any cookie.
- Log video metadata server-side (the bytes never reach the server; metadata
  shouldn't either).
- Add a `crossOrigin` attribute that allows third-party script execution.

## Reporting a vulnerability

Open a private security advisory at the GitHub repo. Do not file a public issue.
```

- [ ] **Step 4: Commit**

```bash
git add docs/FRONTEND.md docs/SEO.md docs/SECURITY.md
git commit -m "docs: add frontend, seo, security docs"
```

---

### Task 31: `docs/TESTING.md`, `docs/CODE_STYLE.md`, `docs/COMMANDS.md`

**Goal:** write the test/style/commands docs.

**Files:**
- Create: `docs/TESTING.md`, `docs/CODE_STYLE.md`, `docs/COMMANDS.md`

- [ ] **Step 1: Write `docs/TESTING.md`**

Create `docs/TESTING.md`:

```markdown
# Testing

Source of truth: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 13.

## Pyramid

| Layer | Tool | Scope | Where |
| --- | --- | --- | --- |
| Unit | Vitest + jsdom | `@record-me/recorder` headless · `@record-me/ui` primitives | `packages/*/src/**/*.test.ts(x)` |
| Integration | Vitest + jsdom + RTL | `useRecorder` hook · key page components | `apps/web/src/**/*.test.tsx` |
| E2E | Playwright | One smoke per mode + Lighthouse | `apps/web/tests/e2e/**` |
| Visual | Playwright MCP | Per-task verification by sr-frontend / e2e | (manual) |

## Coverage thresholds

| Package | Lines | Functions | Branches | Statements |
| --- | --- | --- | --- | --- |
| `@record-me/recorder` | 90% | 90% | 85% | 90% |
| `@record-me/ui` | 70% | 70% | 65% | 70% |
| `@record-me/web` | 60% | 60% | 55% | 60% |

Enforced in `packages/*/vitest.config.ts`. Never lowered to pass a PR.

## Recorder mocks

Vitest setup replaces:
- `window.MediaRecorder` with a controllable fake exposing `isTypeSupported`.
- `navigator.mediaDevices.getDisplayMedia` and `getUserMedia` with promised
  fake `MediaStream` objects whose tracks emit canned frames.

Each test asserts state transitions and final Blob shape.

## Playwright config

`apps/web/playwright.config.ts`. Chromium launch args:
`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`,
`--autoplay-policy=no-user-gesture-required`.

Permissions auto-granted: `camera`, `microphone`.

For screen capture: stub `getDisplayMedia` via `page.addInitScript()` —
headless Chromium can't actually capture the screen.

## Stability

Run every new E2E spec 3× locally before claiming done. Flake at the E2E layer
poisons CI for everyone.
```

- [ ] **Step 2: Write `docs/CODE_STYLE.md`**

Create `docs/CODE_STYLE.md`:

```markdown
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
```

- [ ] **Step 3: Write `docs/COMMANDS.md`**

Create `docs/COMMANDS.md`:

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add docs/TESTING.md docs/CODE_STYLE.md docs/COMMANDS.md
git commit -m "docs: add testing, code style, and commands docs"
```

---

### Task 32: `docs/QUALITY_GATES.md`, `docs/QUALITY_STANDARD.md`, `docs/WORKFLOW.md`

**Goal:** write the quality docs.

**Files:**
- Create: `docs/QUALITY_GATES.md`, `docs/QUALITY_STANDARD.md`, `docs/WORKFLOW.md`

- [ ] **Step 1: Write `docs/QUALITY_GATES.md`**

Create `docs/QUALITY_GATES.md`:

```markdown
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

| Package | Lines | Functions | Branches | Statements |
| --- | --- | --- | --- | --- |
| `@record-me/recorder` | 90% | 90% | 85% | 90% |
| `@record-me/ui` | 70% | 70% | 65% | 70% |
| `@record-me/web` | 60% | 60% | 55% | 60% |

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
```

- [ ] **Step 2: Write `docs/QUALITY_STANDARD.md`**

Create `docs/QUALITY_STANDARD.md`:

```markdown
# Quality standard · 10/10 or don't ship

Source of truth: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 12.4.

Every agent must deliver production-quality, verified, working code.

## Definition of done

- [ ] Build · typecheck · lint · tests all green
- [ ] UI changes visually verified with Playwright MCP (`browser_navigate`,
      `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`)
- [ ] Console clean during E2E (no warnings, no errors)
- [ ] Docs updated by scribe (`docs/PROGRESS.md`, any relevant `docs/*.md`)
- [ ] No "should work" claims — every behaviour has a passing test
- [ ] No regression in other modes / routes / packages
- [ ] CLAUDE.md and AGENTS.md byte-identical (`diff CLAUDE.md AGENTS.md` empty)
- [ ] Linked GH issue closed with a summary comment (Phase 2+)

## Unacceptable

- Untested code
- "Should work" claims without verification
- TODOs left in place of implementations
- Partial features that break existing functionality
- Force-pushing to `main`
- Lowering coverage thresholds to make tests pass
- Bypassing pre-commit hooks (`--no-verify`)
- Hardcoded hex values in UI code
- `console.log` in shipped code
- Adding `Co-Authored-By` lines for AI/LLM models in commits
```

- [ ] **Step 3: Write `docs/WORKFLOW.md`**

Create `docs/WORKFLOW.md`:

```markdown
# Workflow

## Standing process

1. **Spec** lives at `docs/superpowers/specs/`. The current v1 spec is
   `2026-05-27-record-me-design.md`.
2. **Plan** lives at `docs/superpowers/plans/`. Phases 1–6 each get one plan.
3. **Execution** via `/spawn-record-me-team <plan>` (the 6-agent dispatch loop).
4. **Doc updates** are part of every PR — scribe ensures `docs/PROGRESS.md` and
   relevant `docs/*.md` reflect the change.
5. **GH tracking** — phases are epic issues; tasks are auto-issued by the spawn
   command (Phase 2+) and closed on `[REVIEW_RESULT] APPROVED`.

## Mandatory skills

Every task that involves implementation must use:

- `superpowers:writing-plans` — before any non-trivial implementation.
- `superpowers:test-driven-development` — for code (the "red-green-refactor" loop).
- `superpowers:verification-before-completion` — before claiming work done.
- `superpowers:using-git-worktrees` — for parallel feature work.
- `superpowers:finishing-a-development-branch` — to open a PR.
- `frontend-design` (or `frontend-design:frontend-design`) — non-negotiable for
  any UI work: new pages, component changes, layout, styling, theming,
  animations. Invoke before writing component code.

## Phase cadence

| Phase | Goal | Plan path |
| --- | --- | --- |
| 1 | Bootstrap & Harness | `2026-05-28-record-me-phase-1-bootstrap.md` |
| 2 | Design system & brand primitives | (to be written) |
| 3 | Recording engine | (to be written) |
| 4 | Studio (`/record`) | (to be written) |
| 5 | Marketing surface | (to be written) |
| 6 | Analytics & polish | (to be written) |

## When to escalate to the user

- The dispatch loop hits a plateau (2 review rounds with zero CRITICAL/MAJOR
  cleared) — principal triggers escalation.
- All implementers report `[DONE:BLOCKED]` simultaneously.
- A spec change is needed mid-execution.

## When NOT to escalate

- A test fails — fix it.
- A typecheck breaks — fix it.
- A lint warning appears — fix it.
- A doc is stale — scribe updates it.
```

- [ ] **Step 4: Commit**

```bash
git add docs/QUALITY_GATES.md docs/QUALITY_STANDARD.md docs/WORKFLOW.md
git commit -m "docs: add quality gates, quality standard, and workflow docs"
```

---

### Task 33: `docs/PROGRESS.md`, `docs/CODEBASE_MAP.md`, `docs/AGENT_JOURNAL.md`

**Goal:** write the living docs (PROGRESS for milestones, CODEBASE_MAP for inventory, AGENT_JOURNAL for chronological decisions).

**Files:**
- Create: `docs/PROGRESS.md`, `docs/CODEBASE_MAP.md`, `docs/AGENT_JOURNAL.md`

- [ ] **Step 1: Write `docs/PROGRESS.md`**

Create `docs/PROGRESS.md`:

```markdown
# Progress

Living document mirroring GitHub phase epic issue state. Scribe updates this
after every approved task.

## Phase 1 · Bootstrap & Harness · in progress

Plan: `docs/superpowers/plans/2026-05-28-record-me-phase-1-bootstrap.md`
Epic: #1 (created in Task 41)

- [ ] Section A · Monorepo skeleton (Tasks 1–8)
- [ ] Section B · Tooling (Tasks 9–14)
- [ ] Section C · Agent harness (Tasks 15–28)
- [ ] Section D · Documentation (Tasks 29–35)
- [ ] Section E · GitHub workflow surfaces (Tasks 36–40)
- [ ] Section F · Repository creation + deployment (Tasks 41–43)

## Phase 2 · Design system & brand primitives · planned

Plan: (to be written)
Epic: #2

- [ ] Tailwind v4 preset extended with full token set
- [ ] shadcn/ui components installed in `@record-me/ui`
- [ ] Brand primitives: RecDot, ModeCard, StudioShell, MetaChip, WordMark
- [ ] Unit tests for brand primitives
- [ ] Storybook-free visual verification via Playwright MCP

## Phase 3 · Recording engine · planned

Plan: (to be written)
Epic: #3

- [ ] `supportedMimeType()` + `probeCapabilities()` (✓ scaffolded in Phase 1)
- [ ] `createRecorder()` state machine
- [ ] Track acquisition per mode (A/B/C)
- [ ] Canvas compositing pipeline
- [ ] Cursor highlight overlay (in-tab clicks)
- [ ] MediaRecorder integration + codec negotiation
- [ ] IndexedDB chunk spill for long recordings
- [ ] Memory mode + RecordingResult assembly
- [ ] 90%+ unit test coverage

## Phase 4 · Studio (/record) · planned

Plan: (to be written)
Epic: #4

- [ ] `useRecorder()` React hook
- [ ] Mode picker UI
- [ ] Cap selector + warning
- [ ] Live preview canvas with REC dot, timer, MB indicator
- [ ] Stop & render preview pane
- [ ] Download flow
- [ ] Discard & re-record
- [ ] Error states (permission denied, unsupported browser, mid-recording failure)
- [ ] E2E smoke test per mode

## Phase 5 · Marketing surface · planned

Plan: (to be written)
Epic: #5

- [ ] `/` landing with motion + signature moments
- [ ] `/features/[mode]` deep pages with MDX
- [ ] `/docs` + `/docs/[...slug]`
- [ ] `/privacy`, `/changelog`
- [ ] Per-route `generateMetadata` + `opengraph-image.tsx`
- [ ] `sitemap.ts`, `robots.ts`, `manifest.ts`
- [ ] JSON-LD on landing + feature pages
- [ ] View Transitions API on outbound links
- [ ] Lighthouse ≥ 95 on `/`, ≥ 90 elsewhere

## Phase 6 · Analytics & polish · planned

Plan: (to be written)
Epic: #6

- [ ] Vercel Analytics + Speed Insights wired (✓ scaffolded in Phase 1)
- [ ] Custom event taxonomy implemented in `lib/analytics.ts`
- [ ] All events firing from the right points in the studio
- [ ] Lighthouse CI in pipeline (✓ scaffolded in Phase 1)
- [ ] Final v1 done checklist verified
- [ ] Production deployment + custom domain
```

- [ ] **Step 2: Write `docs/CODEBASE_MAP.md`**

Create `docs/CODEBASE_MAP.md`:

```markdown
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
```

- [ ] **Step 3: Write `docs/AGENT_JOURNAL.md`**

Create `docs/AGENT_JOURNAL.md`:

```markdown
# Agent journal

Chronological log of significant decisions and moments in the team's life.
Human-readable summary of what's happening; complements the raw entries in
`.claude/journal/`.

Updated by scribe at end of each phase or after notable decisions.

## 2026-05-28 · Phase 1 bootstrap begins

The harness is being installed for the first time. Six agents are defined,
memory tree seeded with v1 baselines, GH workflow infrastructure scaffolded.
Phase 1 tracks via this plan's checkboxes only; Phase 2 onward will auto-issue
per task.

The team will spawn for the first time once `/spawn-record-me-team` is
exercised against Phase 2's plan.
```

- [ ] **Step 4: Commit**

```bash
git add docs/PROGRESS.md docs/CODEBASE_MAP.md docs/AGENT_JOURNAL.md
git commit -m "docs: add progress, codebase map, and agent journal"
```

---

### Task 34: `CLAUDE.md` (root)

**Goal:** write the root `CLAUDE.md` — the entry point every Claude Code session reads.

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write `CLAUDE.md`**

Create `CLAUDE.md`:

```markdown
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

| If you're working on... | Read first |
| --- | --- |
| UI components, styling, tokens, theming | [docs/DESIGN.md](docs/DESIGN.md) |
| Routes, pages, navigation, layouts | [docs/FRONTEND.md](docs/FRONTEND.md) |
| Recording engine, MediaRecorder, canvas compositing | [docs/RECORDING.md](docs/RECORDING.md) |
| App-wide layout, root configs, Turbo pipeline | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Writing tests | [docs/TESTING.md](docs/TESTING.md) |
| Running commands | [docs/COMMANDS.md](docs/COMMANDS.md) |
| Privacy, headers, CSP | [docs/SECURITY.md](docs/SECURITY.md) |
| Quality gates, CI | [docs/QUALITY_GATES.md](docs/QUALITY_GATES.md) |
| Planning, workflow, skills | [docs/WORKFLOW.md](docs/WORKFLOW.md) |
| Quality verification, Playwright MCP | [docs/QUALITY_STANDARD.md](docs/QUALITY_STANDARD.md) |

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
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add root CLAUDE.md entry point"
```

---

### Task 35: `AGENTS.md`, `README.md`, `LICENSE`

**Goal:** mirror CLAUDE.md → AGENTS.md, write README, write LICENSE.

**Files:**
- Create: `AGENTS.md`, `README.md`, `LICENSE`

- [ ] **Step 1: Mirror CLAUDE.md → AGENTS.md**

Run:

```bash
cp CLAUDE.md AGENTS.md
diff CLAUDE.md AGENTS.md
```

Expected: `diff` returns empty.

- [ ] **Step 2: Write `README.md`**

Create `README.md`:

```markdown
# record me

> An editorial recording instrument that lives in your browser.

[![License: MIT](https://img.shields.io/badge/license-MIT-EDE6D6?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-0F1115?style=flat-square)](https://nextjs.org)
[![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-0F1115?style=flat-square)](https://vercel.com)

<!-- Hero preview · 1200×630 PNG · generated during build from /opengraph-image.tsx -->
<!-- ![record me — the studio](./apps/web/public/og/hero.png) -->
<!-- If the static file isn't present yet, this image renders blank — it's added in Phase 5. -->

A quietly editorial screen recorder for the web. Press record, capture your screen,
your camera, and your cursor — render a polished clip in the browser. No accounts,
no upload, no compromise on craft.

## Three modes

- **Screen + Camera + Cursor** — the full recital. Picture-in-picture camera, click highlights.
- **Screen + Cursor** — just the work. Clean walk-throughs and demos.
- **Camera only** — talking-head async updates, round-framed and centered.

## Principles

- **Privacy as a feature, not a footnote.** Recording bytes never leave your browser.
  Cookieless analytics. No accounts.
- **Editorial over generic.** Twilight palette, Instrument Serif headlines, Geist body,
  Geist Mono for the technical bits. The studio is composed like a piece of furniture.
- **Web-native.** Built on Next.js 15 App Router, deployed to Vercel. MediaRecorder +
  canvas compositing on the main thread. Zero install.

## Quick start

```bash
pnpm install
pnpm dev          # opens http://localhost:3000
pnpm test         # vitest
pnpm test:e2e     # playwright
pnpm build        # production build
```

## Project structure

```
record-me/
├── apps/web                  # Next.js 15 App Router · the deployed surface
├── packages/recorder         # @record-me/recorder · framework-agnostic recording engine
├── packages/ui               # @record-me/ui · shadcn + Twilight tokens + brand primitives
├── packages/config           # @record-me/config · tsconfig · eslint · tailwind preset
├── docs/                     # Required reading — architecture, design, recording, security, …
└── .claude/                  # Agent harness — agents, commands, teams, memory, journal
```

Full architecture in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Design system in [`docs/DESIGN.md`](docs/DESIGN.md).
Recording pipeline in [`docs/RECORDING.md`](docs/RECORDING.md).
Privacy contract in [`docs/SECURITY.md`](docs/SECURITY.md).

## Contributing

This project ships through a six-member multi-agent team — spawn it with
[`/spawn-record-me-team`](.claude/commands/spawn-record-me-team.md) against a plan
written by `superpowers:writing-plans`. Human PRs welcome; please read
[`docs/WORKFLOW.md`](docs/WORKFLOW.md) and [`docs/CODE_STYLE.md`](docs/CODE_STYLE.md)
before opening one.

## License

MIT — see [LICENSE](LICENSE).

---

Built in the open. Composed in Brooklyn &amp; Manila. Printed by Vercel.
```

- [ ] **Step 3: Write `LICENSE`**

Create `LICENSE`:

```
MIT License

Copyright (c) 2026 Carlo Miguel Dy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Verify CLAUDE.md ↔ AGENTS.md byte-identical**

Run:

```bash
diff CLAUDE.md AGENTS.md && echo "OK identical"
```

Expected: `OK identical` printed.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md README.md LICENSE
git commit -m "docs: add AGENTS.md mirror, README, and MIT LICENSE"
```

---

## Section E · GitHub workflow surfaces

### Task 36: Issue templates

**Goal:** create five issue templates so contributors and agents file consistent issues.

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/feature.yml`, `.github/ISSUE_TEMPLATE/chore.yml`, `.github/ISSUE_TEMPLATE/docs.yml`, `.github/ISSUE_TEMPLATE/epic.yml`, `.github/ISSUE_TEMPLATE/config.yml`

- [ ] **Step 1: Create directory**

Run:

```bash
mkdir -p .github/ISSUE_TEMPLATE
```

- [ ] **Step 2: Write `bug.yml`**

Create `.github/ISSUE_TEMPLATE/bug.yml`:

```yaml
name: Bug report
description: Something is broken or behaving unexpectedly
title: "[bug] "
labels: ["bug", "triage"]
body:
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: A clear, factual description of the bug.
      placeholder: "When I clicked Start Recording in Mode A, the camera permission dialog never appeared."
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Reproduction steps
      description: Step-by-step. Include the route, the mode, and any input.
      value: |
        1. Open https://record-me.app/record
        2. Pick Mode A
        3. Click "Start recording"
        4. Observe...
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behaviour
    validations:
      required: true
  - type: input
    id: browser
    attributes:
      label: Browser + version
      placeholder: "Chrome 135 / Firefox 132 / Safari 17.4"
    validations:
      required: true
  - type: input
    id: os
    attributes:
      label: OS + version
      placeholder: "macOS 14.6 / Windows 11 / Ubuntu 24.04"
    validations:
      required: true
  - type: textarea
    id: console
    attributes:
      label: Console output
      description: Paste any relevant browser console errors. Redact PII.
      render: shell
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - "Blocking — feature unusable"
        - "Major — degraded experience"
        - "Minor — cosmetic / inconvenient"
    validations:
      required: true
```

- [ ] **Step 3: Write `feature.yml`**

Create `.github/ISSUE_TEMPLATE/feature.yml`:

```yaml
name: Feature request
description: Propose a new capability or improvement
title: "[feature] "
labels: ["feature", "triage"]
body:
  - type: textarea
    id: problem
    attributes:
      label: What problem does this solve?
      description: Describe the user pain. Not the proposed solution.
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposed solution
      description: How would you address the problem? Sketch the UX or API.
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
      description: What else did you think about and reject? Why?
  - type: dropdown
    id: scope
    attributes:
      label: Scope
      options:
        - "v1 — should ship before launch"
        - "v2 — post-launch enhancement"
        - "Exploratory — needs research first"
    validations:
      required: true
  - type: textarea
    id: spec-touch
    attributes:
      label: Spec impact
      description: Which sections of docs/superpowers/specs/2026-05-27-record-me-design.md would change?
```

- [ ] **Step 4: Write `chore.yml`**

Create `.github/ISSUE_TEMPLATE/chore.yml`:

```yaml
name: Chore
description: Maintenance, refactoring, dependency bumps, or other internal work
title: "[chore] "
labels: ["chore", "triage"]
body:
  - type: textarea
    id: what
    attributes:
      label: What needs doing?
    validations:
      required: true
  - type: textarea
    id: why
    attributes:
      label: Why now?
      description: Why is this worth a maintenance cycle?
    validations:
      required: true
  - type: textarea
    id: affected
    attributes:
      label: Affected files / areas
      placeholder: "packages/recorder/src/*, turbo.json, ..."
```

- [ ] **Step 5: Write `docs.yml`**

Create `.github/ISSUE_TEMPLATE/docs.yml`:

```yaml
name: Docs
description: Missing, wrong, or unclear documentation
title: "[docs] "
labels: ["docs", "triage"]
body:
  - type: input
    id: file
    attributes:
      label: Which doc?
      placeholder: "docs/RECORDING.md, README.md, etc."
    validations:
      required: true
  - type: textarea
    id: gap
    attributes:
      label: What's wrong / missing?
    validations:
      required: true
  - type: textarea
    id: suggestion
    attributes:
      label: Proposed update
```

- [ ] **Step 6: Write `epic.yml`** (for phase epics)

Create `.github/ISSUE_TEMPLATE/epic.yml`:

```yaml
name: Phase epic
description: Tracks an entire phase of the record-me roadmap. Used to group per-task issues opened by /spawn-record-me-team.
title: "[epic] Phase N · "
labels: ["epic", "triage"]
body:
  - type: input
    id: phase
    attributes:
      label: Phase number
      placeholder: "1, 2, 3, 4, 5, or 6"
    validations:
      required: true
  - type: input
    id: plan
    attributes:
      label: Plan path
      placeholder: "docs/superpowers/plans/YYYY-MM-DD-record-me-phase-N-<name>.md"
    validations:
      required: true
  - type: textarea
    id: goal
    attributes:
      label: Phase goal
      description: One sentence — what does this phase ship?
    validations:
      required: true
  - type: textarea
    id: checklist
    attributes:
      label: Milestones
      description: High-level checklist mirrored from PROGRESS.md. /spawn-record-me-team opens detail-level issues under this epic.
      value: |
        - [ ] Section A · ...
        - [ ] Section B · ...
        - [ ] Section C · ...
    validations:
      required: true
  - type: textarea
    id: success
    attributes:
      label: Definition of done
      description: How will we know this phase is complete?
    validations:
      required: true
```

- [ ] **Step 7: Write `config.yml`** (issue chooser settings)

Create `.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Security vulnerability
    url: https://github.com/CARLO_GH_LOGIN/record-me/security/advisories/new
    about: Please report security issues privately via Security Advisories, not public issues.
  - name: Documentation
    url: https://github.com/CARLO_GH_LOGIN/record-me/tree/main/docs
    about: Browse the project documentation.
```

**NOTE:** Replace `CARLO_GH_LOGIN` with the actual login resolved in Task 41. Until Task 41 runs, the placeholder is fine — the link is editable post-creation.

- [ ] **Step 8: Commit**

```bash
git add .github/ISSUE_TEMPLATE
git commit -m "chore(gh): add issue templates (bug, feature, chore, docs, epic)"
```

---

### Task 37: PR template

**Goal:** create the standard PR body skeleton.

**Files:**
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Write the template**

Create `.github/pull_request_template.md`:

```markdown
## Summary

<!-- One paragraph: what this PR does and why. -->

## Linked issues

Closes <!-- #N, #M -->

<!-- For multi-task PRs (e.g. from /spawn-record-me-team), list every closed issue. -->

## Type

- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] docs
- [ ] test
- [ ] chore
- [ ] perf
- [ ] ci

## Phase

- [ ] Phase 1 · Bootstrap & Harness
- [ ] Phase 2 · Design system & brand primitives
- [ ] Phase 3 · Recording engine
- [ ] Phase 4 · Studio
- [ ] Phase 5 · Marketing surface
- [ ] Phase 6 · Analytics & polish
- [ ] Cross-phase / maintenance

## Spec sections touched

<!-- Reference sections of docs/superpowers/specs/2026-05-27-record-me-design.md
     if this PR implements or modifies a spec contract. -->

## Test plan

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (coverage unchanged or improved)
- [ ] `pnpm test:e2e` passes (if UI changes)
- [ ] `pnpm build` passes
- [ ] Lighthouse budgets met (if UI changes — `pnpm lhci`)
- [ ] Visual verification via Playwright MCP (if UI changes) — screenshots below
- [ ] Docs updated (`docs/PROGRESS.md` + any relevant `docs/*.md`)
- [ ] `diff CLAUDE.md AGENTS.md` empty (if either touched)

## Screenshots / recordings

<!-- For UI work: Playwright MCP screenshots showing the before / after.
     For recorder work: not required (covered by unit tests). -->

## Privacy + security check

- [ ] No new API route accepting video bytes
- [ ] No new third-party scripts (CSP unchanged)
- [ ] No cookies set
- [ ] No PII added to analytics events

## Reviewer notes

<!-- Anything reviewers should pay extra attention to. -->
```

- [ ] **Step 2: Commit**

```bash
git add .github/pull_request_template.md
git commit -m "chore(gh): add PR template with phase + test plan checklist"
```

---

### Task 38: Labels + seed/epic scripts

**Goal:** define the label set and write executable scripts to seed labels and create phase epic issues.

**Files:**
- Create: `.github/labels.yml`, `scripts/seed-labels.sh`, `scripts/create-epics.sh`

- [ ] **Step 1: Write `.github/labels.yml`**

Create `.github/labels.yml`:

```yaml
# Label set for record-me. Sync to GitHub via scripts/seed-labels.sh.
# Color values are hex without leading #.

# Type
- name: bug
  color: C8675A
  description: Something broken
- name: feature
  color: E5A24A
  description: New capability or improvement
- name: chore
  color: 7A766D
  description: Maintenance / dependency bump
- name: docs
  color: B5AFA2
  description: Documentation only
- name: test
  color: 9BB28F
  description: Tests only
- name: refactor
  color: 54514A
  description: Code restructure, no behaviour change
- name: perf
  color: F1B768
  description: Performance work
- name: ci
  color: 262C36
  description: CI/CD pipeline changes

# Priority
- name: "priority: high"
  color: C8675A
  description: Address before next merge
- name: "priority: medium"
  color: E5A24A
  description: Address this phase
- name: "priority: low"
  color: 7A766D
  description: Backlog

# Status
- name: "status: blocked"
  color: 262C36
  description: Cannot progress until something unblocks
- name: "status: in-progress"
  color: F1B768
  description: Actively being worked on
- name: "status: ready-for-review"
  color: 9BB28F
  description: Implementation complete, awaiting review

# Phase
- name: "phase-1: bootstrap"
  color: 0F1115
  description: Bootstrap & harness
- name: "phase-2: design-system"
  color: 0F1115
  description: Design system & brand primitives
- name: "phase-3: recorder"
  color: 0F1115
  description: Recording engine
- name: "phase-4: studio"
  color: 0F1115
  description: The /record studio
- name: "phase-5: marketing"
  color: 0F1115
  description: Marketing surface (/ + features + docs)
- name: "phase-6: analytics"
  color: 0F1115
  description: Analytics & final polish

# Area
- name: "area: web"
  color: 1F242C
  description: apps/web
- name: "area: ui"
  color: 1F242C
  description: packages/ui
- name: "area: recorder"
  color: 1F242C
  description: packages/recorder
- name: "area: config"
  color: 1F242C
  description: packages/config
- name: "area: docs"
  color: 1F242C
  description: docs/
- name: "area: harness"
  color: 1F242C
  description: .claude/
- name: "area: ci"
  color: 1F242C
  description: .github/workflows

# Special
- name: epic
  color: E5A24A
  description: Phase epic — tracks a whole phase, grouped per-task issues
- name: agent-task
  color: 171B22
  description: Auto-opened by /spawn-record-me-team
- name: triage
  color: B5AFA2
  description: Newly opened, needs labels and assignment
- name: "good first issue"
  color: 9BB28F
  description: Friendly to new contributors
- name: "help wanted"
  color: F1B768
  description: Maintainers welcome outside help
```

- [ ] **Step 2: Write `scripts/seed-labels.sh`**

Run `mkdir -p scripts` then create `scripts/seed-labels.sh`:

```bash
#!/usr/bin/env bash
# Sync labels from .github/labels.yml to the GitHub repo.
# Idempotent: existing labels are updated, missing labels are created.
# Requires: gh CLI, yq.

set -euo pipefail

LABELS_FILE=".github/labels.yml"

if ! command -v gh >/dev/null; then
  echo "error: gh CLI not installed" >&2
  exit 1
fi

if ! command -v yq >/dev/null; then
  echo "error: yq not installed (brew install yq)" >&2
  exit 1
fi

if [ ! -f "$LABELS_FILE" ]; then
  echo "error: $LABELS_FILE not found" >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
echo "Seeding labels into $REPO ..."

count=$(yq '. | length' "$LABELS_FILE")

for i in $(seq 0 $((count - 1))); do
  name=$(yq -r ".[$i].name" "$LABELS_FILE")
  color=$(yq -r ".[$i].color" "$LABELS_FILE")
  description=$(yq -r ".[$i].description // \"\"" "$LABELS_FILE")

  # Try to create; if it exists, update.
  if gh label create "$name" --color "$color" --description "$description" --force >/dev/null 2>&1; then
    echo "  ✓ $name"
  else
    gh label edit "$name" --color "$color" --description "$description" >/dev/null
    echo "  ↻ $name (updated)"
  fi
done

echo "Done. $count labels synced."
```

Make it executable:

```bash
chmod +x scripts/seed-labels.sh
```

- [ ] **Step 3: Write `scripts/create-epics.sh`**

Create `scripts/create-epics.sh`:

```bash
#!/usr/bin/env bash
# Create the 6 phase epic issues on the GitHub repo.
# Idempotent: skips creation if an epic for that phase already exists.

set -euo pipefail

if ! command -v gh >/dev/null; then
  echo "error: gh CLI not installed" >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
echo "Creating phase epics on $REPO ..."

declare -a PHASES=(
  "1|Bootstrap & Harness|Stand up monorepo, agent harness, docs, GH workflow, CI."
  "2|Design system & brand primitives|Tailwind v4 preset, shadcn components, brand primitives in @record-me/ui."
  "3|Recording engine|@record-me/recorder full implementation: state machine, canvas compositing, IndexedDB spill, MediaRecorder."
  "4|Studio|/record route end-to-end: mode picker, live preview, REC + timer, stop/render/download."
  "5|Marketing surface|/, /features/[mode], /docs, /privacy, /changelog with metadata, OG, sitemap, JSON-LD."
  "6|Analytics & polish|Custom events, Lighthouse budgets enforced, prod deployment, custom domain."
)

for entry in "${PHASES[@]}"; do
  num=$(echo "$entry" | cut -d'|' -f1)
  name=$(echo "$entry" | cut -d'|' -f2)
  goal=$(echo "$entry" | cut -d'|' -f3)

  # Skip if epic exists.
  if gh issue list --label "epic" --search "Phase ${num}" --state all --json title --jq '.[].title' | grep -qE "^\[epic\] Phase ${num} · "; then
    echo "  ↻ Phase ${num} (epic exists; skipping)"
    continue
  fi

  body=$(cat <<EOF
Auto-created by scripts/create-epics.sh.

**Phase:** ${num}
**Plan path:** docs/superpowers/plans/YYYY-MM-DD-record-me-phase-${num}-*.md (write via \`/plan\` when ready)
**Spec reference:** docs/superpowers/specs/2026-05-27-record-me-design.md

## Goal

${goal}

## Milestones

See docs/PROGRESS.md "Phase ${num}" section. This epic mirrors that checklist.

## Definition of done

All milestones checked, all per-task issues closed via /spawn-record-me-team's review loop, PR merged, docs updated.
EOF
)

  gh issue create \
    --title "[epic] Phase ${num} · ${name}" \
    --body "$body" \
    --label "epic,phase-${num}: $(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/-&-/-/g' | cut -d'-' -f1-2)" \
    --assignee @me >/dev/null

  echo "  ✓ Phase ${num} epic created"
done

echo "Done. Phase epics live."
```

Make it executable:

```bash
chmod +x scripts/create-epics.sh
```

- [ ] **Step 4: Commit**

```bash
git add .github/labels.yml scripts/seed-labels.sh scripts/create-epics.sh
git commit -m "chore(gh): add labels.yml and seed/epic scripts"
```

---

### Task 39: GitHub Actions CI workflow

**Goal:** write the CI workflow that runs on every PR + push to main.

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Typecheck · Lint · Unit tests · Build
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Unit tests
        run: pnpm test

      - name: Build
        run: pnpm build

  e2e:
    name: E2E (Playwright)
    runs-on: ubuntu-latest
    needs: quality
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm --filter @record-me/web exec playwright install --with-deps chromium

      - name: Build (for webServer reuse)
        run: pnpm build

      - name: E2E
        run: pnpm test:e2e

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/web/playwright-report
          retention-days: 7

  lighthouse:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    needs: quality
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Run Lighthouse CI
        run: pnpm lhci
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (quality, e2e, lighthouse)"
```

---

### Task 40: Update PROGRESS.md to reflect Phase 1 in-flight

**Goal:** mark Section A through E complete as a checkpoint, leaving Section F (repo creation) for the next tasks.

**Files:**
- Modify: `docs/PROGRESS.md`

- [ ] **Step 1: Edit `docs/PROGRESS.md`**

Modify the Phase 1 section, checking the boxes that are now done (Sections A–E):

```markdown
## Phase 1 · Bootstrap & Harness · in progress

Plan: `docs/superpowers/plans/2026-05-28-record-me-phase-1-bootstrap.md`
Epic: #1 (created in Task 41)

- [x] Section A · Monorepo skeleton (Tasks 1–8)
- [x] Section B · Tooling (Tasks 9–14)
- [x] Section C · Agent harness (Tasks 15–28)
- [x] Section D · Documentation (Tasks 29–35)
- [x] Section E · GitHub workflow surfaces (Tasks 36–40)
- [ ] Section F · Repository creation + deployment (Tasks 41–43)
```

- [ ] **Step 2: Commit**

```bash
git add docs/PROGRESS.md
git commit -m "docs(progress): check off sections A–E of phase 1"
```

---

## Section F · Repository creation + deployment

### Task 41: Create GitHub repository + push + branch protection + topics

**Goal:** create the public MIT-licensed `record-me` repo on GitHub, link as origin, push, set branch protection, set About description and topics.

**Files:** none modified (operates on GitHub).

- [ ] **Step 1: Resolve the GitHub login**

Run:

```bash
gh auth status
GH_LOGIN=$(gh api user --jq .login)
echo "Using GitHub login: $GH_LOGIN"
```

Expected: prints the login. Note it; you'll substitute it where the plan says `<owner>`.

- [ ] **Step 2: Update `.github/ISSUE_TEMPLATE/config.yml` with the real login**

Modify `.github/ISSUE_TEMPLATE/config.yml` — replace `CARLO_GH_LOGIN` with the value of `$GH_LOGIN`:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Security vulnerability
    url: https://github.com/<GH_LOGIN>/record-me/security/advisories/new
    about: Please report security issues privately via Security Advisories, not public issues.
  - name: Documentation
    url: https://github.com/<GH_LOGIN>/record-me/tree/main/docs
    about: Browse the project documentation.
```

Commit:

```bash
git add .github/ISSUE_TEMPLATE/config.yml
git commit -m "chore(gh): point issue-template config links at real GH login"
```

- [ ] **Step 3: Create the GitHub repo**

Run:

```bash
gh repo create "$GH_LOGIN/record-me" \
  --public \
  --description "An editorial, browser-native recorder. Screen · camera · cursor. No accounts, no upload, free forever." \
  --homepage "https://record-me.app" \
  --disable-issues=false \
  --disable-wiki=true
```

Expected: prints the new repo URL. No `--license` flag — LICENSE already committed.

- [ ] **Step 4: Add the origin remote and push**

Run:

```bash
git remote add origin "git@github.com:${GH_LOGIN}/record-me.git"
git branch -M main
git push -u origin main
```

Expected: all commits push successfully. `main` is now the default tracking branch.

- [ ] **Step 5: Set topics**

Run:

```bash
gh repo edit --add-topic screen-recorder \
  --add-topic video-recording \
  --add-topic nextjs \
  --add-topic vercel \
  --add-topic react \
  --add-topic typescript \
  --add-topic tailwindcss \
  --add-topic mediarecorder \
  --add-topic web-app \
  --add-topic privacy \
  --add-topic open-source
```

Expected: topics applied. Confirm with `gh repo view --json repositoryTopics`.

- [ ] **Step 6: Enable branch protection on `main`**

Run:

```bash
gh api -X PUT "repos/${GH_LOGIN}/record-me/branches/main/protection" \
  --field 'required_status_checks={"strict":true,"contexts":["Typecheck · Lint · Unit tests · Build","E2E (Playwright)","Lighthouse CI"]}' \
  --field 'enforce_admins=false' \
  --field 'required_pull_request_reviews={"required_approving_review_count":0,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  --field 'restrictions=null' \
  --field 'allow_force_pushes=false' \
  --field 'allow_deletions=false' \
  --field 'required_linear_history=true' \
  --field 'required_conversation_resolution=true'
```

Expected: returns the protection rule JSON. `gh api repos/${GH_LOGIN}/record-me/branches/main/protection` confirms.

**Note:** `required_approving_review_count: 0` is intentional for solo development; raise to 1 when collaborators join. Status check names must match the workflow job names from Task 39 exactly.

- [ ] **Step 7: Verify in browser**

Open `https://github.com/${GH_LOGIN}/record-me` and confirm:
- Repo is public
- About description and homepage are set
- Topics show
- Default branch is `main`
- Branch protection rule visible under Settings → Branches

---

### Task 42: Seed labels + create phase epics + link Vercel

**Goal:** run the two seed scripts and link the Vercel project.

**Files:** none modified.

- [ ] **Step 1: Install `yq` if missing**

Run:

```bash
command -v yq || brew install yq
```

Expected: `yq --version` prints a version. On Linux: `sudo snap install yq` or download from https://github.com/mikefarah/yq.

- [ ] **Step 2: Seed labels**

Run:

```bash
./scripts/seed-labels.sh
```

Expected: each label prints `✓ <name>` (created) or `↻ <name> (updated)`. Verify with:

```bash
gh label list | wc -l
```

Expected: at least 30 labels (our 30+ plus GitHub defaults).

- [ ] **Step 3: Create phase epics**

Run:

```bash
./scripts/create-epics.sh
```

Expected: six lines `✓ Phase N epic created`. Verify with:

```bash
gh issue list --label "epic" --state open
```

Expected: 6 epics listed.

- [ ] **Step 4: Link Vercel project (manual)**

This step requires the user (Carlo) to drive the Vercel CLI interactively, since auth and project-creation choices are user-specific. The instruction below is for the human, not the agent:

1. Run `vercel link` from the repo root.
2. When prompted:
   - "Set up and deploy?" — yes.
   - "Which scope?" — choose your personal account.
   - "Link to existing project?" — no (this is a new project).
   - "What's your project's name?" — `record-me`.
   - "In which directory is your code located?" — `./` (root; Turborepo handles the rest).
3. After linking, verify `.vercel/project.json` exists (it's gitignored — already in `.gitignore`).
4. Set framework preset: Vercel auto-detects Next.js via `apps/web`.
5. In the Vercel dashboard for the project:
   - **Build & Development Settings** → set Root Directory to `apps/web` (or leave at root and rely on Turborepo).
   - **Build Command:** `cd ../.. && pnpm build --filter=@record-me/web`.
   - **Install Command:** `cd ../.. && pnpm install --frozen-lockfile`.
   - **Output Directory:** `.next`.
6. Add three secrets to GitHub repo for CI Vercel deploys (if you want preview deploys via Actions instead of Vercel's native GitHub integration):
   - `VERCEL_TOKEN` — from Vercel account settings.
   - `VERCEL_ORG_ID` — from `.vercel/project.json`.
   - `VERCEL_PROJECT_ID` — from `.vercel/project.json`.

The simplest path is to use Vercel's native GitHub integration (enabled when you connect the repo in step 1) — it handles preview/production deploys automatically without GitHub Actions involvement.

Once Vercel is linked, the agent can resume to verify the first deployment lands.

- [ ] **Step 5: Verify first deployment**

After the human completes Step 4, run:

```bash
gh repo view --json url --jq .url
```

Then check the Vercel dashboard for the project; the first deployment should be green within 2–5 minutes of the initial push.

- [ ] **Step 6: Commit any changes** (likely none beyond Task 41)

```bash
git status
git diff --quiet || git commit -am "chore: post-vercel-link tweaks"
```

---

### Task 43: Final verification + Phase 1 completion

**Goal:** end-to-end sanity check, mark Phase 1 complete in PROGRESS.md, close epic #1, push final commit.

**Files:**
- Modify: `docs/PROGRESS.md`, `docs/AGENT_JOURNAL.md`

- [ ] **Step 1: Run the full local pipeline**

Run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm --filter @record-me/web exec playwright install --with-deps chromium
pnpm build
pnpm test:e2e
pnpm lhci
```

Expected: every command green. If any fails, fix before proceeding. Do not skip.

- [ ] **Step 2: Verify CLAUDE.md ↔ AGENTS.md still byte-identical**

Run:

```bash
diff CLAUDE.md AGENTS.md && echo "OK identical"
```

Expected: `OK identical`.

- [ ] **Step 3: Verify the SessionStart hook fires**

Start a fresh Claude Code session in this repo. The team-reminder.txt content should print to the session log on start.

Expected: the reminder banner appears with the spawn command, blueprint path, and spec path.

- [ ] **Step 4: Verify CI runs green on a no-op push**

Run:

```bash
git commit --allow-empty -m "ci: verify Phase 1 pipeline"
git push
```

Expected: GitHub Actions runs the three jobs (quality, e2e, lighthouse). All pass. Watch with `gh run watch` if needed.

- [ ] **Step 5: Update `docs/PROGRESS.md` — mark Phase 1 complete**

Modify `docs/PROGRESS.md`:

```markdown
## Phase 1 · Bootstrap & Harness · complete

Plan: `docs/superpowers/plans/2026-05-28-record-me-phase-1-bootstrap.md`
Epic: #1 (closed)
Completed: <date>

- [x] Section A · Monorepo skeleton (Tasks 1–8)
- [x] Section B · Tooling (Tasks 9–14)
- [x] Section C · Agent harness (Tasks 15–28)
- [x] Section D · Documentation (Tasks 29–35)
- [x] Section E · GitHub workflow surfaces (Tasks 36–40)
- [x] Section F · Repository creation + deployment (Tasks 41–43)
```

- [ ] **Step 6: Append to `docs/AGENT_JOURNAL.md`**

Append:

```markdown
## <YYYY-MM-DD> · Phase 1 bootstrap complete

The harness is live. Six agents installed, memory tree seeded, GH workflow
infrastructure operational, CI green on the first push. Vercel linked.
Ready for Phase 2 (`/init-phase 2 design-system`).

Notable decisions during bootstrap (appended from `.claude/journal/`):
- (any clusters surfaced by `/agent-distill` if it ran during Phase 1)
```

- [ ] **Step 7: Close epic #1**

Run:

```bash
EPIC_NUM=$(gh issue list --label "epic" --search "Phase 1" --json number --jq '.[0].number')
gh issue close "$EPIC_NUM" --reason completed \
  --comment "Phase 1 complete. All sections checked off in docs/PROGRESS.md. Ready for Phase 2."
```

Expected: issue closes with the comment attached.

- [ ] **Step 8: Final commit + push**

```bash
git add docs/PROGRESS.md docs/AGENT_JOURNAL.md
git commit -m "docs: mark phase 1 complete"
git push
```

Expected: CI runs once more (green), commit lands on `main`.

- [ ] **Step 9: Print completion summary**

Print to the user:

```
✓ record-me · Phase 1 bootstrap complete

Repository:    https://github.com/<owner>/record-me
Default URL:   (Vercel-assigned; check dashboard)
Spec:          docs/superpowers/specs/2026-05-27-record-me-design.md
Plan:          docs/superpowers/plans/2026-05-28-record-me-phase-1-bootstrap.md
Epic closed:   #1
Phases ahead:  5 (design system → recorder → studio → marketing → analytics)

Next step:
  /init-phase 2 design-system
```

---

## Self-review

Performed inline after writing the plan. Findings + fixes:

1. **Spec coverage check** — every spec § 5 (architecture), § 8 (pages/SEO scaffolds), § 9 (design tokens scaffolds), § 11 (agent harness), § 12 (quality gates), § 13 (testing infra), § 15 (security headers), § 19 (repo bootstrap) is implemented by a Task. Phase 1 intentionally scaffolds — full token set, full recorder, full studio, full marketing land in Phases 2–6.
2. **Placeholder scan** — searched for TBD / TODO / FIXME / "fill in" / "later". The only remaining placeholders are `<owner>` / `<GH_LOGIN>` / `<YYYY-MM-DD>` which are runtime substitutions explicitly described in the relevant steps (Task 41 Step 1 resolves the login; Task 43 Step 5 substitutes the date). Confirmed no implicit placeholders.
3. **Type consistency** — `RecordMode` strings (`'screen+cam+cursor' | 'screen+cursor' | 'cam-only'`) match between Task 6 (recorder scaffold) and `docs/RECORDING.md` (Task 29) and `team-knowledge.md` (Task 27). Codec preference order matches between Task 6 (recorder), Task 29 (RECORDING.md), and Task 27 (team-knowledge). `owns:` globs in agent definitions (Tasks 17–22) match the matrix in the spec § 11.4 and `team-knowledge.md`.
4. **Ordering / dependency check** — Tasks within each section are ordered so each step's prerequisites are satisfied by earlier tasks. Section C (harness) depends on Section A (workspace exists). Section E (GH templates) depends on Section A (`.github/` is a new directory). Section F (repo creation) depends on everything before it. Verified.
5. **Command sanity** — every `gh` and `pnpm` command was sanity-checked against documented CLI usage. The Lighthouse CI job (Task 39) assumes `pnpm lhci` works against a built app started on port 3000; `lighthouserc.json` (Task 13) already specifies `startServerCommand`.

No spec sections left without a task. Plan ready.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-28-record-me-phase-1-bootstrap.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Note: because Phase 1 is the bootstrap, the `record-me-team` agents themselves do not exist yet to drive this. Use `superpowers:subagent-driven-development` with generic subagents until `.claude/agents/` is populated (after Task 22); from that point onward the project-scoped agents can take over for the remaining tasks.

**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints. Simpler for Phase 1 since the harness doesn't exist yet.

For Phase 1 specifically, **Inline Execution is the right pick** — there's no team to spawn until Phase 1 finishes installing one. From Phase 2 onward, **Subagent-Driven via `/spawn-record-me-team`** is the default.

**Which approach for Phase 1?**



