import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingNav } from './LandingNav';

describe('LandingNav', () => {
  it('renders WordMark and the nav links', () => {
    render(<LandingNav />);
    // Wordmark text present
    expect(screen.getByText(/record/i)).toBeInTheDocument();

    // Anchor links with correct hrefs
    const modesLink = screen.getByRole('link', { name: /modes/i });
    expect(modesLink).toHaveAttribute('href', '#modes');

    const studioLink = screen.getByRole('link', { name: /studio/i });
    expect(studioLink).toHaveAttribute('href', '#studio');

    const fieldLink = screen.getByRole('link', { name: /field/i });
    expect(fieldLink).toHaveAttribute('href', '#field');

    // Cross-links to route pages (added in Task 8).
    const featuresLink = screen.getByRole('link', { name: /^features$/i });
    expect(featuresLink).toHaveAttribute('href', '/features/screen-camera-cursor');

    const docsLink = screen.getByRole('link', { name: /^docs$/i });
    expect(docsLink).toHaveAttribute('href', '/docs');
  });

  it('nav has aria-label "Site navigation" (holds route links, not only page anchors)', () => {
    render(<LandingNav />);
    expect(screen.getByRole('navigation', { name: 'Site navigation' })).toBeTruthy();
  });
});
