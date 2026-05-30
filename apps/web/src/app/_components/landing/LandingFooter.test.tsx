import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingFooter } from './LandingFooter';

describe('LandingFooter', () => {
  it('renders the /privacy and /changelog links', () => {
    render(<LandingFooter />);
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: /changelog/i })).toHaveAttribute('href', '/changelog');
  });

  it('renders colophon text with Manila locale', () => {
    render(<LandingFooter />);
    expect(screen.getByText(/Manila/i)).toBeInTheDocument();
    expect(screen.getByText(/Instrument Serif/i)).toBeInTheDocument();
  });
});
