---
name: next-best-practices
description: Project-scoped mirror — invoke `next-best-practices` via the Skill tool. This file is a fallback when global plugins are unavailable.
---

# Project-scoped Next.js best practices pointer

Use the global skill via the `Skill` tool:

```
Skill("next-best-practices")
```

If the global skill is unavailable, follow record-me's Next.js 15 conventions:

1. **App Router only.** No `pages/` directory. Routes live under
   `apps/web/src/app/`.
2. **RSC by default.** `'use client'` only at the leaf component that needs
   interactivity. The recording UI (`/record`) is the main client-heavy
   surface; everything else stays server.
3. **Async APIs (Next 15)** — `cookies()`, `headers()`, `params`, `searchParams`
   all return promises. Always `await` them in RSCs and route handlers.
4. **Metadata API** — every route exports `generateMetadata` or a static
   `metadata` object. No silent inheritance. Title, description, OG image,
   Twitter card, canonical URL.
5. **`next/font` for typography.** Loaded once in `apps/web/src/app/layout.tsx`;
   exposed to CSS as `--font-instrument-serif`, `--font-geist`, `--font-geist-mono`.
6. **`next/image`** for all images with explicit width/height.
7. **`transpilePackages`** — `@record-me/ui` and `@record-me/recorder` are
   listed in `apps/web/next.config.ts`.
8. **Headers** — security headers (CSP, Permissions-Policy, X-Frame-Options)
   live in `apps/web/next.config.ts` `async headers()`.

Reference: `docs/FRONTEND.md` for the route tree and per-route plan.
