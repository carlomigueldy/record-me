---
name: tailwind-design-system
description: Project-scoped mirror — invoke `tailwind-design-system` via the Skill tool. This file is a fallback when global plugins are unavailable.
---

# Project-scoped Tailwind design system pointer

Use the global skill via the `Skill` tool:

```
Skill("tailwind-design-system")
```

If the global skill is unavailable, follow record-me's Tailwind v4 conventions:

1. **CSS-first.** No `tailwind.config.js`. Theme tokens live in
   `packages/config/tailwind/theme.css` inside an `@theme {}` block.
2. **Import chain** — `apps/web/src/app/globals.css`:
   ```css
   @import 'tailwindcss';
   @import '@record-me/config/tailwind/theme.css';
   @import '@record-me/ui/tokens.css';
   ```
3. **No hardcoded hex** in component class lists. Use the theme tokens that the
   `@theme` block generates: `bg-bg`, `text-ivory`, `text-amber`, `border-line`,
   etc.
4. **Variants via CVA.** All `@record-me/ui` interactive components use
   `class-variance-authority`. `cn()` (clsx + tailwind-merge) for class merging.
5. **Responsive breakpoints** — default Tailwind scale (sm/md/lg/xl/2xl).
   Editorial landing tends to use `sm:` and `lg:` only — desktop hero is
   `clamp(40px, 7vw, 96px)`.
6. **Dark mode** — record-me is dark-first; no `dark:` modifier needed because
   the surface is always dark.

Reference: `docs/DESIGN.md` for the full palette + typography + token list.
