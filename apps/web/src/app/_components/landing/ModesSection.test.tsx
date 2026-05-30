import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModesSection } from './ModesSection';

// Stub matchMedia for client components
vi.stubGlobal(
  'matchMedia',
  vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
);

describe('ModesSection', () => {
  it('has id="modes" for anchor navigation', () => {
    const { container } = render(<ModesSection />);
    expect(container.querySelector('#modes')).toBeTruthy();
  });

  it('renders all three mode titles (three h3 headings)', () => {
    render(<ModesSection />);
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(3);
    // Verify the three modes are represented
    const text = headings.map((h) => h.textContent ?? '').join(' | ');
    expect(text).toMatch(/Screen, camera/i);
    expect(text).toMatch(/Screen\s*&\s*cursor/i);
    expect(text).toMatch(/Camera\s*only/i);
  });

  it('renders the three section blurbs', () => {
    render(<ModesSection />);
    expect(screen.getByText(/full recital|screen capture with picture/i)).toBeInTheDocument();
    expect(screen.getByText(/just the work|product walk/i)).toBeInTheDocument();
    expect(screen.getByText(/talking head|just you/i)).toBeInTheDocument();
  });
});
