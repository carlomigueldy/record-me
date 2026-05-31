import { describe, expect, it } from 'vitest';
import { generateMetadata } from './page';

describe('docs/page', () => {
  it('generateMetadata returns a title and description', async () => {
    const md = await generateMetadata();
    expect(typeof md.title).toBe('string');
    expect((md.title as string).length).toBeGreaterThan(0);
    expect(typeof md.description).toBe('string');
  });
});
