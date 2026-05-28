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

## Per-route inventory

| Route                   | Type | Owner       | Status                                                                           |
| ----------------------- | ---- | ----------- | -------------------------------------------------------------------------------- |
| `/`                     | RSC  | sr-frontend | Phase 2 scaffold · Phase 5 ships the editorial landing                           |
| `/dev/primitives`       | RSC  | sr-frontend | Dev-only showcase for brand primitives. 404 in production via `/dev/layout.tsx`. |
| `/dev/previews/landing` | RSC  | sr-frontend | Phase 5 landing hero mockup (dev-only)                                           |
| `/dev/previews/modes`   | RSC  | sr-frontend | Three-ModeCard composition (dev-only)                                            |
| `/dev/previews/studio`  | RSC  | sr-frontend | Phase 4 studio mockup (dev-only)                                                 |
| `/record`               | RSC  | sr-frontend | Phase 1 placeholder · Phase 4 ships the studio                                   |
| `/features/[mode]`      | RSC  | sr-frontend | Phase 5                                                                          |
| `/docs`                 | RSC  | sr-frontend | Phase 5                                                                          |
| `/privacy`              | RSC  | sr-frontend | Phase 5                                                                          |
| `/changelog`            | RSC  | sr-frontend | Phase 5                                                                          |

Update this table after every phase.

## Hooks (Phase 4)

- `useRecorder()` — thin React wrapper around `createRecorder()` from
  `@record-me/recorder`. Returns `{ state, start, pause, resume, stop, dispose }`.

## Component inventory

| Component       | Package         | Description                                         |
| --------------- | --------------- | --------------------------------------------------- |
| `<WordMark>`    | `@record-me/ui` | Brand wordmark — italic amber "me"                  |
| `<RecDot>`      | `@record-me/ui` | Pulsing amber recording indicator with halo         |
| `<MetaChip>`    | `@record-me/ui` | Mono uppercase metadata pill                        |
| `<ModeCard>`    | `@record-me/ui` | Triptych card with eyebrow, serif title, stage slot |
| `<StudioShell>` | `@record-me/ui` | Framed shell for the live recording surface         |
| `<Button>`      | `@record-me/ui` | shadcn-style Button with Twilight CVA variants      |
| `cn()`          | `@record-me/ui` | clsx + tailwind-merge helper                        |
