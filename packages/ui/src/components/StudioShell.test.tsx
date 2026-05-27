import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudioShell } from './StudioShell';

describe('StudioShell', () => {
  it('renders the slotted chrome (header) and stage (children)', () => {
    render(
      <StudioShell header={<span>chrome</span>}>
        <div data-testid="stage">live preview</div>
      </StudioShell>,
    );
    expect(screen.getByText('chrome')).toBeInTheDocument();
    expect(screen.getByTestId('stage')).toBeInTheDocument();
  });

  it('renders an optional footer', () => {
    render(
      <StudioShell header={<span>chrome</span>} footer={<span>00:00:00</span>}>
        <div />
      </StudioShell>,
    );
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
  });

  it('uses semantic <section> as the root with an aria-label', () => {
    render(
      <StudioShell header={<span>chrome</span>} aria-label="Recording studio">
        <div />
      </StudioShell>,
    );
    expect(screen.getByRole('region', { name: 'Recording studio' })).toBeInTheDocument();
  });

  it('uses elevated surface tokens for the frame', () => {
    const { container } = render(
      <StudioShell header={<span>chrome</span>}>
        <div />
      </StudioShell>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/bg-surface-2/);
    expect(root.className).toMatch(/border-line/);
  });

  it('forwards className', () => {
    const { container } = render(
      <StudioShell className="max-w-5xl" header={<span>chrome</span>}>
        <div />
      </StudioShell>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/max-w-5xl/);
  });
});
