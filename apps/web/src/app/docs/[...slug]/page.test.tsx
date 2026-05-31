import { describe, expect, it } from 'vitest';
import { generateStaticParams } from './page';
import { DOC_BODY } from '@/lib/content/doc-bodies';

describe('docs/[...slug]', () => {
  it('generateStaticParams returns one entry per non-draft doc', async () => {
    const params = await generateStaticParams();
    expect(params).toContainEqual({ slug: ['permissions'] });
    expect(params).toContainEqual({ slug: ['codecs'] });
  });

  // v1 invariant: every doc slug is a single segment, so the loader's
  // `slug.join('-')` → flat-file mapping is unambiguous (no nesting/collision).
  // Drop/relax this only when the slug→file convention changes to support nested URLs.
  it('all v1 doc slugs are single-segment (flat-file invariant)', async () => {
    const params = await generateStaticParams();
    for (const p of params) expect(p.slug).toHaveLength(1);
  });

  // Parity: every filesystem doc slug (getAllDocSlugs, the routing source of
  // truth) has a static DOC_BODY entry. Guarantees the fs-driven param list and
  // the hand-maintained static import map never drift — a doc on disk with no
  // DOC_BODY entry would 404 its own body, which this fails loudly at test time.
  it('every doc slug has a static DOC_BODY entry (no orphan body)', async () => {
    const params = await generateStaticParams();
    for (const p of params) expect(DOC_BODY).toHaveProperty(p.slug.join('-'));
  });
});
