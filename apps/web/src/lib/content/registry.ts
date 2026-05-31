import type { MetadataRoute } from 'next';
import { FEATURE_SLUGS, type FeatureSlug } from './features';
import { getAllDocSlugs, getDocFrontmatter, getModeFrontmatter } from './loader';
import type { DocFrontmatter, FeatureFrontmatter, Qa } from './schema';

export function dedupeFaq(faqs: Qa[]): Qa[] {
  const seen = new Set<string>();
  return faqs.filter((f) => (seen.has(f.question) ? false : (seen.add(f.question), true)));
}

export const allFeatures = (): (FeatureFrontmatter & { slug: FeatureSlug })[] =>
  FEATURE_SLUGS.map((slug) => ({ ...getModeFrontmatter(slug), slug }));

export const allDocs = (): DocFrontmatter[] =>
  getAllDocSlugs()
    .map((slug) => getDocFrontmatter(slug))
    .sort((a, b) => a.section.localeCompare(b.section) || a.order - b.order);

export function docsBySection(): Record<string, DocFrontmatter[]> {
  return allDocs().reduce<Record<string, DocFrontmatter[]>>((acc, doc) => {
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

export function prevNext(slug: string[]): {
  prev: DocFrontmatter | null;
  next: DocFrontmatter | null;
} {
  const docs = allDocs();
  const key = slug.join('-');
  const idx = docs.findIndex((d) => d.slug.join('-') === key);
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
