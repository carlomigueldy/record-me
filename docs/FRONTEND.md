# Frontend

Authoritative reference for `apps/web` and `packages/ui`. Source of truth:
`docs/superpowers/specs/2026-05-27-record-me-design.md` § 6, § 8.

## Route tree (target)

```
apps/web/src/app/
├── layout.tsx                  # root · <Analytics/> · <SpeedInsights/> · next/font
├── page.tsx                    # /
├── opengraph-image.tsx         # default OG
├── sitemap.ts · robots.ts · manifest.ts
│
├── record/
│   ├── page.tsx                # /record (the studio)
│   ├── layout.tsx              # minimal chrome
│   └── opengraph-image.tsx
│
├── features/
│   ├── layout.tsx
│   └── [mode]/page.tsx         # /features/screen-camera-cursor | /screen-cursor | /camera-only
│
├── docs/{page.tsx, [...slug]/page.tsx}
├── privacy/page.tsx
├── changelog/page.tsx
│
└── api/og/route.ts             # v1.x optional
```

## Per-route inventory (Phase 1)

| Route              | Status                                                    |
| ------------------ | --------------------------------------------------------- |
| `/`                | Phase 1 placeholder · Phase 5 ships the editorial landing |
| `/record`          | Phase 1 placeholder · Phase 4 ships the studio            |
| `/features/[mode]` | Phase 5                                                   |
| `/docs`            | Phase 5                                                   |
| `/privacy`         | Phase 5                                                   |
| `/changelog`       | Phase 5                                                   |

Update this table after every phase.

## Hooks (Phase 4)

- `useRecorder()` — thin React wrapper around `createRecorder()` from
  `@record-me/recorder`. Returns `{ state, start, pause, resume, stop, dispose }`.

## Component inventory (Phase 2)

| Component           | Package         | Phase |
| ------------------- | --------------- | ----- |
| `<Button>` (shadcn) | `@record-me/ui` | 2     |
| `<Card>` (shadcn)   | `@record-me/ui` | 2     |
| `<RecDot>`          | `@record-me/ui` | 2     |
| `<ModeCard>`        | `@record-me/ui` | 2     |
| `<StudioShell>`     | `@record-me/ui` | 2     |
| `<MetaChip>`        | `@record-me/ui` | 2     |
| `<WordMark>`        | `@record-me/ui` | 2     |
