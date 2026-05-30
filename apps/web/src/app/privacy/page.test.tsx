import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PrivacyPage from './page';

describe('PrivacyPage', () => {
  it('renders the core privacy promise', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: /privacy/i })).toBeInTheDocument();
    expect(screen.getByText(/never leave/i)).toBeInTheDocument();
    expect(screen.getByText(/no accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/cookieless/i)).toBeInTheDocument();
  });
});
