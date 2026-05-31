import { describe, expect, it } from 'vitest';
import { dedupeFaq, routeList } from './registry';

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
});
