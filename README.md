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
