import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Pin the file-tracing root to the monorepo root so Next does not infer the
  // wrong root when multiple lockfiles exist (e.g. inside a git worktree),
  // which breaks production page-data collection.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // The OG routes read their .ttf fonts at runtime via fs + process.cwd()
  // (fetch(new URL(import.meta.url)) is broken in static prerender — Next
  // #66244). Because those paths are computed, @vercel/nft cannot see them,
  // so force the font files into each OG route's serverless bundle or they
  // render tofu on Vercel. Include globs are resolved relative to the project
  // dir (apps/web), so the path is project-relative even though
  // outputFileTracingRoot points at the monorepo root.
  outputFileTracingIncludes: {
    '/opengraph-image': ['src/app/_og/fonts/**'],
    '/privacy/opengraph-image': ['src/app/_og/fonts/**'],
    '/changelog/opengraph-image': ['src/app/_og/fonts/**'],
  },
  transpilePackages: ['@record-me/ui', '@record-me/recorder'],
  async headers() {
    // Next's dev client (webpack HMR / React Refresh) evaluates strings as
    // JavaScript, which requires 'unsafe-eval'. Gate it to non-production so
    // the production CSP stays strict (no eval) while `next dev` works.
    const isDev = process.env.NODE_ENV !== 'production';
    const scriptSrc =
      "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com" +
      (isDev ? " 'unsafe-eval'" : '');

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
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default config;
