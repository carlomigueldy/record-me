import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from './Breadcrumbs';

const trail = [
  { name: 'Docs', href: '/docs' },
  { name: 'Permissions', href: '/docs/permissions' },
];

describe('Breadcrumbs', () => {
  it('renders a nav landmark with breadcrumb label', () => {
    render(<Breadcrumbs items={trail} />);
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeTruthy();
  });

  it('renders all but the last item as links', () => {
    render(<Breadcrumbs items={trail} />);
    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link).toHaveAttribute('href', '/docs');
  });

  it('renders the last item as current page text (not a link)', () => {
    render(<Breadcrumbs items={trail} />);
    // "Permissions" is the last item — should not be a link.
    const links = screen.getAllByRole('link');
    expect(links.every((l) => l.textContent !== 'Permissions')).toBe(true);
    expect(screen.getByText('Permissions')).toBeTruthy();
  });

  it('marks the last item with aria-current="page"', () => {
    render(<Breadcrumbs items={trail} />);
    const current = screen.getByText('Permissions').closest('[aria-current]');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('renders a single-item trail (root page) with no links', () => {
    render(<Breadcrumbs items={[{ name: 'Docs', href: '/docs' }]} />);
    // Single item — it IS the current page, not a link.
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Docs')).toBeTruthy();
  });
});
