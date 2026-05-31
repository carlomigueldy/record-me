import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocsSidebar } from './DocsSidebar';
import type { DocFrontmatter } from '@/lib/content/schema';

// Minimal docs for testing — two sections.
const docs: DocFrontmatter[] = [
  {
    title: 'Getting Started',
    description: 'How to get started.',
    slug: ['getting-started'],
    section: 'getting-started',
    order: 1,
    draft: false,
  },
  {
    title: 'Permissions',
    description: 'About permissions.',
    slug: ['permissions'],
    section: 'recording',
    order: 1,
    draft: false,
  },
  {
    title: 'Codecs',
    description: 'About codecs.',
    slug: ['codecs'],
    section: 'recording',
    order: 2,
    draft: false,
  },
];

describe('DocsSidebar', () => {
  it('renders links to all docs', () => {
    render(<DocsSidebar docs={docs} activeSlug={null} />);
    expect(screen.getByRole('link', { name: 'Getting Started' })).toHaveAttribute(
      'href',
      '/docs/getting-started',
    );
    expect(screen.getByRole('link', { name: 'Permissions' })).toHaveAttribute(
      'href',
      '/docs/permissions',
    );
    expect(screen.getByRole('link', { name: 'Codecs' })).toHaveAttribute('href', '/docs/codecs');
  });

  it('groups docs by section', () => {
    render(<DocsSidebar docs={docs} activeSlug={null} />);
    // Both sections should render a heading/label.
    expect(screen.getByText(/getting-started/i)).toBeTruthy();
    expect(screen.getByText(/recording/i)).toBeTruthy();
  });

  it('marks the active doc link with aria-current="page"', () => {
    render(<DocsSidebar docs={docs} activeSlug={['permissions']} />);
    const activeLink = screen.getByRole('link', { name: 'Permissions' });
    expect(activeLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark non-active links with aria-current', () => {
    render(<DocsSidebar docs={docs} activeSlug={['permissions']} />);
    const codecs = screen.getByRole('link', { name: 'Codecs' });
    expect(codecs).not.toHaveAttribute('aria-current');
  });

  it('renders a nav landmark', () => {
    render(<DocsSidebar docs={docs} activeSlug={null} />);
    expect(screen.getByRole('navigation')).toBeTruthy();
  });
});
