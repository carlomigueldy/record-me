import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordMark } from './WordMark';

describe('WordMark', () => {
  it('renders the wordmark as role=img with an accessible name (avoids aria-prohibited-attr)', () => {
    render(<WordMark />);
    // role="img" makes `aria-label` ARIA-valid on this otherwise-generic element.
    // Without the role, axe / Lighthouse flag aria-prohibited-attr.
    expect(screen.getByRole('img', { name: 'record me' })).toBeInTheDocument();
  });

  it('renders "record" in roman and "me" in italic', () => {
    render(<WordMark />);
    expect(screen.getByText('record')).toBeInTheDocument();
    const italicMe = screen.getByText('me');
    expect(italicMe.tagName).toBe('EM');
  });

  it('uses the serif typeface', () => {
    const { container } = render(<WordMark />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/font-serif/);
  });

  it('supports md (default), sm, and lg sizes', () => {
    const { container: smContainer } = render(<WordMark size="sm" />);
    expect((smContainer.firstChild as HTMLElement).className).toMatch(/text-xl/);

    const { container: mdContainer } = render(<WordMark />);
    expect((mdContainer.firstChild as HTMLElement).className).toMatch(/text-3xl/);

    const { container: lgContainer } = render(<WordMark size="lg" />);
    expect((lgContainer.firstChild as HTMLElement).className).toMatch(/text-6xl/);
  });

  it('forwards className', () => {
    const { container } = render(<WordMark className="text-amber" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/text-amber/);
  });
});
