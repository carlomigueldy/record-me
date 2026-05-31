import { describe, expect, it, vi, afterEach } from 'vitest';
import path from 'node:path';
import { getDocFrontmatter, getAllDocSlugs, getModeFrontmatter } from './loader';

const FIXTURES = path.join(__dirname, '__fixtures__');
const DOC_FIXTURES = path.join(__dirname, '__fixtures__/docs');

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('content loader', () => {
  it('parses + validates a feature fixture', () => {
    const fm = getModeFrontmatter('feature-a', FIXTURES);
    expect(fm.mode).toBe('screen+cam+cursor');
    expect(fm.howToSteps.length).toBeGreaterThan(0);
  });

  it('lists doc slugs and drops drafts in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const slugs = getAllDocSlugs(DOC_FIXTURES);
    // draft-doc.mdx has draft:true → excluded in production.
    expect(slugs).toEqual(expect.arrayContaining([['getting-started'], ['permissions']]));
    expect(slugs).not.toContainEqual(['draft-doc']);
  });

  it('includes draft slugs outside production', () => {
    // NODE_ENV is 'test' by default — drafts should be included.
    const slugs = getAllDocSlugs(DOC_FIXTURES);
    expect(slugs).toEqual(
      expect.arrayContaining([['getting-started'], ['permissions'], ['draft-doc']]),
    );
  });

  it('throws on a slug not present (security-relevant guard)', () => {
    expect(() => getDocFrontmatter(['../../etc/passwd'], DOC_FIXTURES)).toThrow();
  });
});
