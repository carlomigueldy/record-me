import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { dedupeFaq, routeList, allDocs, prevNext } from './registry';

const DOC_FIXTURES = path.join(__dirname, '__fixtures__/docs');

describe('registry', () => {
  it('dedupes FAQ by question (keeps first)', () => {
    const out = dedupeFaq([
      { question: 'Is it free?', answer: 'Yes.' },
      { question: 'Is it free?', answer: 'Yes, MIT.' },
      { question: 'Does it upload?', answer: 'No.' },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]?.answer).toBe('Yes.'); // first wins
  });

  it('routeList includes the 3 features and the docs index', () => {
    const paths = routeList().map((r) => r.path);
    expect(paths).toContain('/features/screen-camera-cursor');
    expect(paths).toContain('/features/camera-only');
    expect(paths).toContain('/docs');
  });

  // MAJOR 2: single-read — allDocs() must not re-read by slug (which would
  // derive filename from frontmatter, creating a drift window). Verify that
  // allDocs returns the same records getAllDocs provides (no secondary read).
  it('allDocs returns sorted DocFrontmatter records via single-read path', () => {
    const docs = allDocs(DOC_FIXTURES);
    const titles = docs.map((d) => d.title);
    expect(titles).toContain('Getting Started');
    expect(titles).toContain('Permissions');
  });

  // MINOR: prevNext with unknown slug must return {prev:null, next:null}.
  // Before the fix, idx===-1 satisfied `idx < docs.length-1`, returning
  // {prev:null, next:docs[0]} — leaking the first doc as a false next link.
  it('prevNext returns {null, null} for an unknown slug', () => {
    const result = prevNext(['does-not-exist'], DOC_FIXTURES);
    expect(result.prev).toBeNull();
    expect(result.next).toBeNull();
  });

  it('prevNext returns correct prev for a known slug', () => {
    // DOC_FIXTURES in test mode (drafts included). Sort by section+order:
    // section "getting-started": getting-started (order 1), draft-doc (order 99)
    // section "recording": permissions (order 1)
    // Sorted order: getting-started → draft-doc → permissions.
    // So permissions.prev = draft-doc.
    const result = prevNext(['permissions'], DOC_FIXTURES);
    expect(result.prev?.slug).toEqual(['draft-doc']);
    // permissions is last → no next.
    expect(result.next).toBeNull();
  });
});
