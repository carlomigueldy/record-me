import type { MetadataRoute } from 'next';
import { routeList } from '@/lib/content/registry';
import { siteConfig } from '@/lib/seo/site-config';

// Static 5A/5B routes. The 5C content routes (features + docs) are NOT listed
// here — they are appended from registry.routeList() below so the sitemap and
// generateStaticParams share one source and cannot diverge.
const STATIC_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}[] = [
  { path: '/', priority: 1.0, changeFrequency: 'monthly' },
  { path: '/record', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/changelog', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  // routeList() supplies the 5C content surface: 3× /features/* @0.8, /docs @0.6,
  // and each /docs/<slug> @0.6 — registry-driven so it matches the static params.
  const routes = [...STATIC_ROUTES, ...routeList()];
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified,
    changeFrequency,
    priority,
  }));
}
