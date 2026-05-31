import { describe, expect, it, vi, afterEach } from 'vitest';
import path from 'node:path';
import {
  getDocFrontmatter,
  getAllDocSlugs,
  getAllDocs,
  getModeFrontmatter,
  getDocHeadings,
} from './loader';

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

  // Basename invariant — getAllDocs() must throw loudly when a file's basename
  // does not match its frontmatter slug.join('-'). This is the load-bearing guard
  // against the dual-read drift described in MAJOR 2: a doc named wrong-name.mdx
  // with slug: [permissions] would silently serve the wrong content to any caller
  // that derived the filename from the frontmatter slug post-read. The fixture dir
  // is isolated so this throw doesn't pollute the other loader tests.
  it('throws "Content file name mismatch" when basename !== slug.join("-")', () => {
    const MISMATCH_DIR = path.join(__dirname, '__fixtures__/docs-mismatch');
    expect(() => getAllDocs(MISMATCH_DIR)).toThrow('Content file name mismatch');
  });

  // MAJOR fix verification — getDocHeadings extracts h2/h3 headings from the
  // raw MDX body using github-slugger so TOC anchor ids match rehype-slug output.
  it('getDocHeadings returns h2 headings with github-slugger ids', () => {
    // The permissions fixture has: ## Permissions
    const headings = getDocHeadings(['permissions'], DOC_FIXTURES);
    expect(headings.length).toBeGreaterThan(0);
    const h2 = headings.find((h) => h.text === 'Permissions');
    expect(h2).toBeDefined();
    expect(h2?.level).toBe(2);
    // github-slugger: "Permissions" → "permissions"
    expect(h2?.id).toBe('permissions');
  });

  it('getDocHeadings excludes frontmatter from heading scan', () => {
    // Frontmatter YAML (title:, description:, etc.) must not be treated as headings.
    const headings = getDocHeadings(['permissions'], DOC_FIXTURES);
    // None of the headings should have an id derived from frontmatter keys.
    const ids = headings.map((h) => h.id);
    expect(ids).not.toContain('title');
    expect(ids).not.toContain('description');
    expect(ids).not.toContain('slug');
  });
});
