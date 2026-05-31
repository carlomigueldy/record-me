import { describe, expect, it } from 'vitest';
import { generateStaticParams, generateMetadata } from './page';

describe('features/[mode]', () => {
  it('generateStaticParams returns the 3 pinned slugs', async () => {
    const params = await generateStaticParams();
    expect(params.map((p) => p.mode)).toEqual([
      'screen-camera-cursor',
      'screen-cursor',
      'camera-only',
    ]);
  });

  // The bare title MUST equal the master-spec § 8.2 segment verbatim (the root
  // title.template appends ' — record me' at render — asserted in e2e). Guards
  // against a paraphrased title diverging from the § 8.2 contract.
  it.each([
    ['screen-camera-cursor', 'Mode A — Screen, Camera & Cursor'],
    ['screen-cursor', 'Mode B — Screen & Cursor'],
    ['camera-only', 'Mode C — Camera Only'],
  ])('generateMetadata title for %s is the exact § 8.2 segment', async (mode, segment) => {
    const md = await generateMetadata({ params: Promise.resolve({ mode }) });
    expect(md.title).toBe(segment);
  });
});
