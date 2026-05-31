import { describe, expect, it } from 'vitest';
import { featureFrontmatterSchema, docFrontmatterSchema } from './schema';

describe('frontmatter schemas', () => {
  it('accepts a valid feature frontmatter', () => {
    const fm = featureFrontmatterSchema.parse({
      slug: 'screen-camera-cursor',
      mode: 'screen+cam+cursor',
      title: 'Mode A — Screen, Camera & Cursor',
      deck: 'The full recital.',
      eyebrow: '§ Mode A',
      order: 1,
      howToSteps: [{ name: 'Pick the mode', text: 'Choose Screen + Camera + Cursor.' }],
      faq: [{ question: 'Is it free?', answer: 'Yes — MIT.' }],
      related: ['permissions'],
    });
    expect(fm.mode).toBe('screen+cam+cursor');
  });

  it('rejects an invalid RecordMode', () => {
    expect(() =>
      featureFrontmatterSchema.parse({
        slug: 'x',
        mode: 'camera-only', // engine value is cam-only — must reject the slug
        title: 't',
        deck: 'd',
        eyebrow: 'e',
        order: 1,
        howToSteps: [{ name: 'a', text: 'b' }],
        faq: [],
        related: [],
      }),
    ).toThrow();
  });

  it('rejects a doc description over 160 chars', () => {
    expect(() =>
      docFrontmatterSchema.parse({
        title: 't',
        description: 'x'.repeat(161),
        slug: ['permissions'],
        section: 'recording',
        order: 1,
      }),
    ).toThrow();
  });

  it('defaults draft to false', () => {
    const fm = docFrontmatterSchema.parse({
      title: 'Getting started',
      description: 'How to record.',
      slug: ['getting-started'],
      section: 'getting-started',
      order: 1,
    });
    expect(fm.draft).toBe(false);
  });
});
