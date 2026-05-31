import path from 'node:path';
import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Allow .md/.mdx files to be treated as routable/importable pages so the
  // build-time MDX content system (features + docs) compiles to static HTML.
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
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
    // 5C OG routes — same computed-path tofu risk as the entries above (fonts
    // read via fs + process.cwd(), invisible to @vercel/nft). Keys must match
    // Next's traced route ids; verify against the .next build manifest on a
    // preview deploy (Task 10).
    '/features/[mode]/opengraph-image': ['src/app/_og/fonts/**'],
    '/docs/[...slug]/opengraph-image': ['src/app/_og/fonts/**'],
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

// IMPORTANT: never add `--turbopack` to the `dev` script. @next/mdx cannot pass
// function-form remark/rehype plugins to Turbopack and rehype-pretty-code's
// options are not fully serializable — Turbopack would silently strip
// highlighting. Both `next dev` and Vercel `next build` are webpack here; keep
// it that way.
const withMDX = createMDX({
  // Match BOTH .md and .mdx so the `pageExtensions` 'md'/'mdx' support is
  // honest. @next/mdx defaults `extension` to /\.mdx$/, so without this a bare
  // .md page would route but never compile (the MDX loader wouldn't claim it).
  extension: /\.mdx?$/,
  options: {
    // remark-frontmatter MUST run first: it teaches the MDX parser to recognize
    // the leading `---` YAML block as a frontmatter node so it is STRIPPED from
    // the compiled body. Without it, @next/mdx renders the raw `slug:/mode:/
    // title:` YAML as visible text (a thematic break + paragraph). gray-matter
    // still reads frontmatter independently for the typed registry — this only
    // affects what <Body/> renders.
    remarkPlugins: [remarkFrontmatter, remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap' }],
      [
        rehypePrettyCode,
        {
          keepBackground: false,
          // SINGLE dark theme — this app is dark-only (no theme toggle, no
          // data-theme/class on <html>, no ThemeProvider; layout.tsx sets only
          // font-variable classes). Single-theme mode emits a resolved inline
          // `style="color:#…"` per token (NO --shiki-light/--shiki-dark var
          // pair, NO multi-value data-theme), so code renders correctly on the
          // Twilight surface with one honest path and no dead CSS. Do NOT switch
          // to dual-theme `{ dark, light }` unless a real data-theme='dark' is
          // first added on <html> (out of 5C scope) — dual theme would default
          // to the LIGHT token colors here (light-on-dark).
          theme: 'github-dark-default',
        },
      ],
    ],
  },
});

export default withMDX(config);
