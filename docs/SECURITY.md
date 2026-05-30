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
5. **IndexedDB stores are wiped on discard, re-record, page leave, or next
   session start.** stop() only assembles the Blob — chunks remain in IDB
   while the recording is in the review pane. Once you discard, re-record,
   leave the page, or start a new session, release()/dispose() clears the
   store. No recording artifacts persist between sessions.
6. **CSP headers via `apps/web/next.config.ts`** block third-party scripts
   beyond Vercel itself.

## Headers (set in `apps/web/next.config.ts`)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(self), display-capture=(self)`
- (Phase 5A · shipped) `Content-Security-Policy`:

```
default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

Allows Vercel Analytics (`va.vercel-scripts.com`) and Speed Insights
(`vitals.vercel-insights.com`) while blocking third-party scripts + XSS.

## What to never do

- Add an API route that receives video bytes.
- Add a third-party analytics provider (Plausible/PostHog/etc.).
- Set any cookie.
- Log video metadata server-side (the bytes never reach the server; metadata
  shouldn't either).
- Add a `crossOrigin` attribute that allows third-party script execution.

## Reporting a vulnerability

Open a private security advisory at the GitHub repo. Do not file a public issue.
