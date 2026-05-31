import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ModeTriptych } from './ModeTriptych';

describe('ModeTriptych', () => {
  it('each card links to its /features/<slug> with a distinct aria-label', () => {
    render(<ModeTriptych />);

    // Three distinct "Learn more about <mode>" links — each has a unique accessible
    // name via aria-label to avoid the a11y violation of identical link text
    // ("Learn more →" × 3) pointing to different destinations.
    const linkA = screen.getByRole('link', { name: /learn more about screen, camera & cursor/i });
    const linkB = screen.getByRole('link', { name: /learn more about screen & cursor/i });
    const linkC = screen.getByRole('link', { name: /learn more about camera only/i });

    // Pinned slugs matching FEATURE_SLUG_TO_MODE — verified against types.ts L4.
    expect(linkA).toHaveAttribute('href', '/features/screen-camera-cursor');
    expect(linkB).toHaveAttribute('href', '/features/screen-cursor');
    expect(linkC).toHaveAttribute('href', '/features/camera-only');
  });
});
