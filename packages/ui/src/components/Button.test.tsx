import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders a button with the children text', () => {
    render(<Button>Start recording</Button>);
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
  });

  it('applies the primary variant by default (amber background)', () => {
    render(<Button>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button.className).toMatch(/bg-amber\b/);
    expect(button.className).not.toMatch(/bg-surface\b/);
  });

  it('applies the secondary variant when requested', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const button = screen.getByRole('button', { name: 'Cancel' });
    expect(button.className).toMatch(/bg-surface\b/);
  });

  it('applies the ghost variant when requested', () => {
    render(<Button variant="ghost">Discard</Button>);
    const button = screen.getByRole('button', { name: 'Discard' });
    expect(button.className).toMatch(/text-ivory-dim/);
  });

  it('forwards arbitrary className through cn() (later wins)', () => {
    render(<Button className="px-12">Wide</Button>);
    const button = screen.getByRole('button', { name: 'Wide' });
    expect(button.className).toMatch(/px-12/);
    expect(button.className).not.toMatch(/px-4 px-12/); // tailwind-merge collapses conflicts
  });

  it('renders as a Slot when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/record">Studio</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Studio' });
    expect(link).toHaveAttribute('href', '/record');
    expect(link.tagName).toBe('A');
  });
});
