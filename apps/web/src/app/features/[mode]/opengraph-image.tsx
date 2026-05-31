import { ogImage, SIZE } from '@/app/_og/template';
import { getModeFrontmatter } from '@/lib/content/loader';
import { FEATURE_SLUGS, type FeatureSlug } from '@/lib/content/features';

// Node.js runtime (default) — reads fonts via fs.readFileSync at build time.
// Do NOT add `export const runtime = 'edge'` — the font loader uses fs.
export const size = SIZE;
export const contentType = 'image/png';
export const alt = 'record me — feature mode';

export async function generateImageMetadata({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!FEATURE_SLUGS.includes(mode as FeatureSlug)) return [];
  const fm = getModeFrontmatter(mode as FeatureSlug);
  return [{ id: mode, alt: fm.title }];
}

export default async function FeatureOg({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!FEATURE_SLUGS.includes(mode as FeatureSlug)) {
    // Fallback for unknown slugs — dynamic params = false prevents this in prod.
    return ogImage({ title: 'record me', caption: 'record your screen, beautifully' });
  }
  const fm = getModeFrontmatter(mode as FeatureSlug);
  return ogImage({
    title: fm.title,
    // Caption capped at 60 chars to stay within the OG template's mono label.
    caption: fm.deck.slice(0, 60),
  });
}
