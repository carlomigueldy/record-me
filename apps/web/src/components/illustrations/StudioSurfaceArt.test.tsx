import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StudioSurfaceArt } from './StudioSurfaceArt';

describe('StudioSurfaceArt', () => {
  it('renders decoratively (aria-hidden)', () => {
    const { container } = render(<StudioSurfaceArt timer="00:42:18" />);
    expect(container.firstChild).toBeTruthy();
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('accepts and renders a timer prop', () => {
    render(<StudioSurfaceArt timer="01:23:45" />);
    expect(screen.getByText('01:23:45')).toBeInTheDocument();
  });
});
