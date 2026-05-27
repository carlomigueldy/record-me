import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetaChip } from './MetaChip';

describe('MetaChip', () => {
  it('renders children inside a span', () => {
    render(<MetaChip>1080p · 30fps</MetaChip>);
    expect(screen.getByText('1080p · 30fps')).toBeInTheDocument();
  });

  it('applies mono font and uppercase styling', () => {
    const { container } = render(<MetaChip>MP4</MetaChip>);
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).toMatch(/font-mono/);
    expect(chip.className).toMatch(/uppercase/);
    expect(chip.className).toMatch(/tracking-wider/);
  });

  it('defaults to the muted tone (ivory-dim for WCAG AA contrast on bg)', () => {
    const { container } = render(<MetaChip>x</MetaChip>);
    const chip = container.firstChild as HTMLElement;
    // ivory-dim (#B5AFA2) gives ~8.2:1 contrast on --bg (#0F1115) — passes WCAG AAA.
    // ivory-mut (#7A766D) was tried first but yields ~4.0:1 — fails AA's 4.5:1 floor
    // for the 10px text used in MetaChip.
    expect(chip.className).toMatch(/text-ivory-dim/);
    expect(chip.className).not.toMatch(/text-ivory-mut/);
  });

  it('supports amber, success, and danger tones', () => {
    const { container: amber } = render(<MetaChip tone="amber">REC</MetaChip>);
    expect((amber.firstChild as HTMLElement).className).toMatch(/text-amber/);

    const { container: success } = render(<MetaChip tone="success">OK</MetaChip>);
    expect((success.firstChild as HTMLElement).className).toMatch(/text-success/);

    const { container: danger } = render(<MetaChip tone="danger">ERR</MetaChip>);
    expect((danger.firstChild as HTMLElement).className).toMatch(/text-danger/);
  });

  it('forwards className', () => {
    const { container } = render(<MetaChip className="ml-2">x</MetaChip>);
    expect((container.firstChild as HTMLElement).className).toMatch(/ml-2/);
  });
});
