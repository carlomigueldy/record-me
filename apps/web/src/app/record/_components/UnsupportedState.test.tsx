import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnsupportedState } from './UnsupportedState';

describe('UnsupportedState', () => {
  it('lists supported browsers', () => {
    render(<UnsupportedState />);
    expect(screen.getByText(/doesn't support/i)).toBeInTheDocument();
    expect(screen.getByText(/Chrome, Edge, Firefox, or Arc/i)).toBeInTheDocument();
  });
});
