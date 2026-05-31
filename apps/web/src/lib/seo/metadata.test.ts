import { describe, expect, it } from 'vitest';
import { buildMetadata } from './metadata';
import { siteConfig } from './site-config';

describe('buildMetadata', () => {
  it('builds an absolute canonical from path', () => {
    const m = buildMetadata({
      title: 'Privacy',
      description: 'How we treat your data.',
      path: '/privacy',
    });
    expect(m.alternates?.canonical).toBe(`${siteConfig.url}/privacy`);
  });

  it('sets title, description, and og/twitter', () => {
    const m = buildMetadata({
      title: 'Changelog',
      description: 'What shipped.',
      path: '/changelog',
    });
    expect(m.title).toBe('Changelog');
    expect(m.description).toBe('What shipped.');
    expect(m.openGraph?.url).toBe(`${siteConfig.url}/changelog`);
    expect(m.openGraph?.title).toBe('Changelog');
    // twitter is a discriminated union — narrow via 'card' in check
    expect('card' in (m.twitter ?? {})).toBe(true);
    expect((m.twitter as { card?: string })?.card).toBe('summary_large_image');
  });

  it('normalizes the root path to no trailing slash', () => {
    const m = buildMetadata({ title: 'Home', description: 'x', path: '/' });
    expect(m.alternates?.canonical).toBe(`${siteConfig.url}/`);
  });

  it('passes a robots directive through when provided', () => {
    const m = buildMetadata({
      title: 'X',
      description: 'y',
      path: '/x',
      robots: { index: false, follow: false },
    });
    expect((m.robots as { index?: boolean })?.index).toBe(false);
  });

  it('omits robots when not provided (5C routes are all indexed)', () => {
    const m = buildMetadata({ title: 'X', description: 'y', path: '/x' });
    expect('robots' in m).toBe(false);
  });
});
