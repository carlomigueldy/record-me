import type { MetadataRoute } from 'next';
import { FEATURE_SLUGS, type FeatureSlug } from './features';
import { getAllDocs, getDocFrontmatter, getModeFrontmatter } from './loader';
import type { DocFrontmatter, FeatureFrontmatter, Qa } from './schema';

export function dedupeFaq(faqs: Qa[]): Qa[] {
  const seen = new Set<string>();
  return faqs.filter((f) => (seen.has(f.question) ? false : (seen.add(f.question), true)));
}

export const allFeatures = (): (FeatureFrontmatter & { slug: FeatureSlug })[] =>
  FEATURE_SLUGS.map((slug) => ({ ...getModeFrontmatter(slug), slug }));

/**
 * allDocs — the single-read source of truth for doc aggregation.
 *
 * Consumes getAllDocs() (the single filesystem enumeration) rather than
 * re-reading by slug — eliminates the MAJOR 2 dual-read draft-leak risk:
 * getAllDocs() parses each file once and enforces the basename===slug.join('-')
 * invariant, so a draft whose filename differs from its slug can never leak.
 */
export const allDocs = (dir?: string): DocFrontmatter[] =>
  getAllDocs(dir).sort((a, b) => a.section.localeCompare(b.section) || a.order - b.order);

export function docsBySection(dir?: string): Record<string, DocFrontmatter[]> {
  return allDocs(dir).reduce<Record<string, DocFrontmatter[]>>((acc, doc) => {
    (acc[doc.section] ??= []).push(doc);
    return acc;
  }, {});
}

export function getFeatureBySlug(slug: string): FeatureFrontmatter & { slug: FeatureSlug } {
  const feature = allFeatures().find((f) => f.slug === slug);
  if (!feature) throw new Error(`Feature not found: ${slug}`);
  return feature;
}

export function getDocBySlug(slug: string[]): DocFrontmatter {
  return getDocFrontmatter(slug);
}

export function prevNext(
  slug: string[],
  dir?: string,
): {
  prev: DocFrontmatter | null;
  next: DocFrontmatter | null;
} {
  const docs = allDocs(dir);
  const key = slug.join('-');
  const idx = docs.findIndex((d) => d.slug.join('-') === key);
  // MINOR: unknown slug (idx === -1) must return {null, null}. Without this,
  // idx === -1 satisfies `idx < docs.length - 1`, yielding {prev:null, next:docs[0]}.
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? (docs[idx - 1] ?? null) : null,
    next: idx < docs.length - 1 ? (docs[idx + 1] ?? null) : null,
  };
}

export function routeList(): {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}[] {
  return [
    ...FEATURE_SLUGS.map((s) => ({
      path: `/features/${s}`,
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    })),
    { path: '/docs', priority: 0.6, changeFrequency: 'monthly' as const },
    ...allDocs().map((d) => ({
      path: `/docs/${d.slug.join('/')}`,
      priority: 0.6,
      changeFrequency: 'monthly' as const,
    })),
  ];
}
