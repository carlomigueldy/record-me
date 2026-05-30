import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FieldNotesTicker } from './FieldNotesTicker';

describe('FieldNotesTicker', () => {
  it('renders all claim strings (always in DOM, CSS handles reduced-motion)', () => {
    render(<FieldNotesTicker />);
    // Claims appear at least once (visible items; duplicates are aria-hidden)
    expect(screen.getAllByText(/Recorded in browser/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No accounts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Free · MIT/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Built on Next\.js/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tailwind v4/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Vercel/i).length).toBeGreaterThan(0);
  });

  it('renders the #field section with a ticker-track element', () => {
    const { container } = render(<FieldNotesTicker />);
    expect(container.querySelector('#field')).toBeTruthy();
    // The animated track is always in the DOM; CSS @media controls animation
    expect(container.querySelector('.ticker-track')).toBeTruthy();
  });
});
