import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from './Hero';

describe('Hero', () => {
  it('renders the LCP headline + CTAs with correct hrefs (server content, no JS gating)', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/record/i);
    expect(screen.getByRole('link', { name: /start recording/i })).toHaveAttribute(
      'href',
      '/record',
    );
    expect(screen.getByRole('link', { name: /three modes/i })).toHaveAttribute('href', '#modes');
    expect(screen.getByText(/MP4 · H\.264/)).toBeInTheDocument(); // corrected codec copy
  });
});
