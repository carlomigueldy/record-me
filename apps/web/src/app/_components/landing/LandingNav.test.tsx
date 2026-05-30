import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingNav } from './LandingNav';

describe('LandingNav', () => {
  it('renders WordMark and the three anchor links', () => {
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
  });
});
