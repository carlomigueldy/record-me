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

| Route                   | Type | Owner       | Status                                                                                                                      |
| ----------------------- | ---- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/`                     | RSC  | sr-frontend | Phase 2 scaffold · Phase 5 ships the editorial landing                                                                      |
| `/dev/primitives`       | RSC  | sr-frontend | Dev-only showcase for brand primitives. 404 in production via `/dev/layout.tsx`.                                            |
| `/dev/previews/landing` | RSC  | sr-frontend | Phase 5 landing hero mockup (dev-only)                                                                                      |
| `/dev/previews/modes`   | RSC  | sr-frontend | Three-ModeCard composition (dev-only)                                                                                       |
| `/dev/previews/studio`  | RSC  | sr-frontend | Phase 4 studio mockup (dev-only)                                                                                            |
| `/record`               | ○    | sr-frontend | Phase 4 · shipped. Renders static RSC shell; `<Studio>` hydrates client-side (capability probe + recorder are client-only). |
| `/features/[mode]`      | RSC  | sr-frontend | Phase 5                                                                                                                     |
| `/docs`                 | RSC  | sr-frontend | Phase 5                                                                                                                     |
| `/privacy`              | RSC  | sr-frontend | Phase 5                                                                                                                     |
| `/changelog`            | RSC  | sr-frontend | Phase 5                                                                                                                     |

Update this table after every phase.

## Hooks (Phase 4)

- `useRecorder()` — thin React wrapper around `createRecorder()` from
  `@record-me/recorder`. Returns `{ state, durationMs, bytes, previewStream, result, error, start, pause, resume, stop, reset }`.
  Lifecycle: `reset()` disposes the handle + releases the result (privacy —
  camera/mic off); `start()` disposes any prior handle and releases the prior
  result's object URL; unmount releases the latest result's object URL.

## Component inventory

### @record-me/ui primitives

| Component       | Description                                         |
| --------------- | --------------------------------------------------- |
| `<WordMark>`    | Brand wordmark — italic amber "me"                  |
| `<RecDot>`      | Pulsing amber recording indicator with halo         |
| `<MetaChip>`    | Mono uppercase metadata pill                        |
| `<ModeCard>`    | Triptych card with eyebrow, serif title, stage slot |
| `<StudioShell>` | Framed shell for the live recording surface         |
| `<Button>`      | shadcn-style Button with Twilight CVA variants      |
| `cn()`          | clsx + tailwind-merge helper                        |

### Studio components (Phase 4 · `/record`)

**Orchestrator**

- `<Studio>` (`_components/Studio.tsx`) — 'use client' root. Manages state machine (setup → live → review), permission probing, error handling. Renders `<StudioShell>` + phase-specific UI.

**Setup phase (mode + cap selection)**

- `<ModePicker>` — Triptych radio picker (A/B/C modes, available-mode gating).
- `<CapSelector>` — Cap minutes selector (10–60 min), resolution (1080p/720p), cursor highlight toggle. Warns on >10 min.

**Live phase (recording)**

- `<LivePreview>` — `<video srcObject>` mirror bound to `onPreviewReady` stream (composite video-only).

**Review phase (playback + download)**

- `<ReviewPane>` — `<video controls>` for playback with result URL.

**Error + unsupported**

- `<ErrorState>` — Editorial error cards per kind (permission-denied device-specific, track-failed interrupted, etc.). "Try again" callback.
- `<UnsupportedState>` — Browser-unsupported gate (no MediaRecorder, no getDisplayMedia, etc.).

**Utilities**

- `derivePhase()` + `StudioPhase` type (`_components/studio-phase.ts`) — Pure phase state machine derivation.

### Studio library modules (Phase 4 · `apps/web/src/lib`)

- `analytics.ts` — Typed Vercel Analytics event taxonomy (7 studio events: modeSelected, recordingStarted, recordingStopped, recordingDownloaded, permissionDenied, browserUnsupported, cursorHighlightDisabled).
- `capabilities.ts` — `deriveStudioCapabilities()` + `browserName()` UA sniff. Probe-to-mode derivation.
- `format.ts` — `formatDuration()` (mm:ss), `formatMegabytes()` (1 decimal), `capMinutesToMs()`.
