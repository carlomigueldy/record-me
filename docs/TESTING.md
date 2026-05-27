# Testing

Source of truth: `docs/superpowers/specs/2026-05-27-record-me-design.md` § 13.

## Pyramid

| Layer       | Tool                 | Scope                                                       | Where                            |
| ----------- | -------------------- | ----------------------------------------------------------- | -------------------------------- |
| Unit        | Vitest + jsdom       | `@record-me/recorder` headless · `@record-me/ui` primitives | `packages/*/src/**/*.test.ts(x)` |
| Integration | Vitest + jsdom + RTL | `useRecorder` hook · key page components                    | `apps/web/src/**/*.test.tsx`     |
| E2E         | Playwright           | One smoke per mode + Lighthouse                             | `apps/web/tests/e2e/**`          |
| Visual      | Playwright MCP       | Per-task verification by sr-frontend / e2e                  | (manual)                         |

## Coverage thresholds

| Package               | Lines | Functions | Branches | Statements |
| --------------------- | ----- | --------- | -------- | ---------- |
| `@record-me/recorder` | 90%   | 90%       | 85%      | 90%        |
| `@record-me/ui`       | 70%   | 70%       | 65%      | 70%        |
| `@record-me/web`      | 60%   | 60%       | 55%      | 60%        |

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
