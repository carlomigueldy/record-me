import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChangelogPage from './page';

describe('ChangelogPage', () => {
  it('renders the seed release', () => {
    render(<ChangelogPage />);
    expect(screen.getByRole('heading', { level: 1, name: /changelog/i })).toBeInTheDocument();
    expect(screen.getByText(/record me, version one/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument();
  });
});
