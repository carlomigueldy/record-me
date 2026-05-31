// Static, fully analyzable slug → MDX body map (mirrors FEATURE_BODY in features.ts).
// Keyed by `slug.join('-')` (v1 slugs are single-segment, so this is just the slug).
//
// NO dynamic import() of interpolated input — an aliased import(`@/content/docs/${x}.mdx`)
// is a webpack dynamic-context footgun (the @/ alias prefix can fail to generate
// the context → build error or runtime MODULE_NOT_FOUND for every doc) AND a
// code-injection seam. This static map is fully analyzable and prerenders cleanly.
//
// The filesystem-driven getAllDocSlugs() stays the source of truth for routing +
// metadata. This map only renders the body. The parity test in docs/[...slug]/
// page.test.tsx asserts the two never drift.
import GettingStarted from '@/content/docs/getting-started.mdx';
import Permissions from '@/content/docs/permissions.mdx';
import Codecs from '@/content/docs/codecs.mdx';
import Safari from '@/content/docs/safari.mdx';
import BrowserSupport from '@/content/docs/browser-support.mdx';
import Troubleshooting from '@/content/docs/troubleshooting.mdx';

export const DOC_BODY = {
  'getting-started': GettingStarted,
  permissions: Permissions,
  codecs: Codecs,
  safari: Safari,
  'browser-support': BrowserSupport,
  troubleshooting: Troubleshooting,
} as const;

export type DocBodyKey = keyof typeof DOC_BODY;
