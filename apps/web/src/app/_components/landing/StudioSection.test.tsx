import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudioSection } from './StudioSection';

// Stub matchMedia for the usePrefersReducedMotion hook
vi.stubGlobal(
  'matchMedia',
  vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
);

describe('StudioSection', () => {
  it('has id="studio" for anchor navigation', () => {
    const { container } = render(<StudioSection />);
    expect(container.querySelector('#studio')).toBeTruthy();
  });

  it('renders the field-note headings', () => {
    render(<StudioSection />);
    expect(screen.getByText(/Container format/i)).toBeInTheDocument();
    expect(screen.getByText(/Render specs/i)).toBeInTheDocument();
  });

  it('renders corrected codec spec — MP4 and H.264, not VP9', () => {
    render(<StudioSection />);
    const content = document.body.textContent ?? '';
    expect(content).toMatch(/MP4/);
    expect(content).toMatch(/H\.264/);
    expect(content).not.toMatch(/VP9/);
  });
});
