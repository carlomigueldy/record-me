---
name: frontend-design
description: Project-scoped mirror — invoke `frontend-design:frontend-design` via the Skill tool. This file is a fallback when global plugins are unavailable.
---

# Project-scoped frontend-design pointer

Use the global skill via the `Skill` tool:

```
Skill("frontend-design:frontend-design")
```

This skill is **non-negotiable** for any new UI surface in record-me: landing
page, per-mode pages, the studio (`/record`), docs surfaces, brand primitives.
Invoke it **before** writing component code so the aesthetic direction is
established and the output isn't generic AI-styled.

If the global skill is unavailable, work from the design intent encoded in:

- `docs/superpowers/specs/2026-05-27-record-me-design.md` § 8 (the editorial
  landing IA), § 9 (palette + typography + motion tokens).
- `docs/DESIGN.md` — the in-repo design system reference.
- `packages/ui/src/tokens.css` — the live Twilight tokens.

Output target:

- Brand primitives → `packages/ui/src/components/<name>.tsx`.
- Page-level components → `apps/web/src/app/<route>/components/<name>.tsx` or
  inline in the route file.

Discipline rules (from spec § 9 and § 12):

- No hardcoded hex values in UI code. Use CSS variables or Tailwind theme
  tokens (`bg-bg`, `text-ivory`, `text-amber`, `border-line`).
- Typography only via `next/font` — no raw `@import` of Google Fonts in CSS.
- Motion serves meaning. No decorative animation. Defaults: 200 ms ease-out
  for subtle UI transitions; 400–600 ms cubic-bezier for stage transitions in
  the studio.
- CWV first: LCP < 1.8s, INP < 200ms, CLS < 0.05 (Speed Insights p75).
