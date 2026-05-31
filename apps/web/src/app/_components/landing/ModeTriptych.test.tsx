import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ModeTriptych } from './ModeTriptych';

describe('ModeTriptych', () => {
  it('each card links to its /features/<slug> via TransitionLink', () => {
    render(<ModeTriptych />);

    // Three "Learn more" links — one per mode card.
    const links = screen.getAllByRole('link', { name: /learn more/i });
    expect(links).toHaveLength(3);

    // Pinned slugs matching FEATURE_SLUG_TO_MODE — order must match modes array.
    expect(links[0]).toHaveAttribute('href', '/features/screen-camera-cursor');
    expect(links[1]).toHaveAttribute('href', '/features/screen-cursor');
    expect(links[2]).toHaveAttribute('href', '/features/camera-only');
  });
});
