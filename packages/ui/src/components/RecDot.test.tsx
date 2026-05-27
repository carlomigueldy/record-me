import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecDot } from './RecDot';

describe('RecDot', () => {
  it('renders with role=status and an accessible label', () => {
    render(<RecDot />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-label', 'Recording');
  });

  it('uses the amber palette', () => {
    const { container } = render(<RecDot />);
    expect(container.innerHTML).toMatch(/bg-amber/);
  });

  it('renders a halo ring sibling when active (default)', () => {
    const { container } = render(<RecDot />);
    const halo = container.querySelector('[data-record-me-halo]');
    expect(halo).not.toBeNull();
  });

  it('pauses animation when active=false (data-active="false" + no motion-safe class)', () => {
    const { container } = render(<RecDot active={false} />);
    const status = container.querySelector('[role="status"]') as HTMLElement;
    expect(status.dataset.active).toBe('false');
    expect(status.className).not.toMatch(/motion-safe:animate-\[record-me-rec-pulse/);
  });

  it('opts into motion-safe pulse + halo when active (default)', () => {
    const { container } = render(<RecDot />);
    const status = container.querySelector('[role="status"]') as HTMLElement;
    expect(status.className).toMatch(/motion-safe:animate-\[record-me-rec-pulse/);
    const halo = container.querySelector('[data-record-me-halo]') as HTMLElement;
    expect(halo.className).toMatch(/motion-safe:animate-\[record-me-rec-halo/);
  });

  it('overrides aria-label when label is provided', () => {
    render(<RecDot label="Paused" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Paused');
  });

  it('supports sm / md / lg sizes', () => {
    const { container: sm } = render(<RecDot size="sm" />);
    expect((sm.firstChild as HTMLElement).className).toMatch(/h-2 w-2/);

    const { container: md } = render(<RecDot />);
    expect((md.firstChild as HTMLElement).className).toMatch(/h-3 w-3/);

    const { container: lg } = render(<RecDot size="lg" />);
    expect((lg.firstChild as HTMLElement).className).toMatch(/h-4 w-4/);
  });
});
