import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from './page';

// Stub matchMedia for all client components in the tree
vi.stubGlobal(
  'matchMedia',
  vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
);

describe('HomePage (landing)', () => {
  it('renders the hero, all sections, and is not the Phase-2 scaffold', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/Phase 2 scaffold/i)).toBeNull();
    expect(document.getElementById('modes')).toBeTruthy();
    expect(document.getElementById('studio')).toBeTruthy();
  });
});
