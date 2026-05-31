import { describe, expect, it, vi, afterEach } from 'vitest';
import path from 'node:path';
import { getDocFrontmatter, getAllDocSlugs, getAllDocs, getModeFrontmatter } from './loader';

const FIXTURES = path.join(__dirname, '__fixtures__');
const DOC_FIXTURES = path.join(__dirname, '__fixtures__/docs');
const NONEXISTENT = path.join(__dirname, '__fixtures__/does-not-exist');

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('content loader', () => {
  it('parses + validates a feature fixture', () => {
    const fm = getModeFrontmatter('feature-a', FIXTURES);
    expect(fm.mode).toBe('screen+cam+cursor');
    expect(fm.howToSteps.length).toBeGreaterThan(0);
  });

  // MAJOR 1: clean-checkout guard — getAllDocs must return [] when the dir
  // doesn't exist (git drops empty dirs on a fresh clone; CI never has it
  // until Task 7 fills it with real docs).
  it('returns [] when the docs dir does not exist (clean-checkout guard)', () => {
    expect(getAllDocs(NONEXISTENT)).toEqual([]);
    expect(getAllDocSlugs(NONEXISTENT)).toEqual([]);
  });

  // MAJOR 2: single-read — getAllDocs returns full DocFrontmatter records so
  // callers never re-derive the filename from frontmatter slug.
  it('getAllDocs returns full frontmatter records (single-read, no re-read by slug)', () => {
    const docs = getAllDocs(DOC_FIXTURES);
    // Inspect the records directly — no secondary fs read.
    const titles = docs.map((d) => d.title);
    expect(titles).toContain('Getting Started');
    expect(titles).toContain('Permissions');
  });

  it('lists doc slugs and drops drafts in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const slugs = getAllDocSlugs(DOC_FIXTURES);
    // draft-doc.mdx has draft:true → excluded in production.
    expect(slugs).toEqual(expect.arrayContaining([['getting-started'], ['permissions']]));
    expect(slugs).not.toContainEqual(['draft-doc']);
  });

  it('getAllDocs includes draft slugs outside production', () => {
    // NODE_ENV is 'test' by default — drafts should be included.
    const slugs = getAllDocSlugs(DOC_FIXTURES);
    expect(slugs).toEqual(
      expect.arrayContaining([['getting-started'], ['permissions'], ['draft-doc']]),
    );
  });

  // MINOR: tighten the traversal guard — assert the specific error message so
  // removing the guard cannot silently pass the test.
  it('throws "Illegal content path" on path traversal (security guard)', () => {
    expect(() => getDocFrontmatter(['../../etc/passwd'], DOC_FIXTURES)).toThrow(
      'Illegal content path',
    );
  });
});
