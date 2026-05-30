import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FieldNotesTicker } from './FieldNotesTicker';

describe('FieldNotesTicker', () => {
  it('renders all claim strings', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    render(<FieldNotesTicker />);
    expect(screen.getAllByText(/Recorded in browser/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No accounts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Free · MIT/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Built on Next\.js/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tailwind v4/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Vercel/i).length).toBeGreaterThan(0);
  });

  it('shows static content when reduced motion is preferred', () => {
    // Stub matchMedia to return prefers-reduced-motion: reduce
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    const { container } = render(<FieldNotesTicker />);
    const ticker = container.querySelector('[id="field"]');
    expect(ticker).toBeTruthy();
    // data-reduced flag should be set when reduced motion
    expect(container.querySelector('[data-reduced="true"]')).toBeTruthy();
  });
});
