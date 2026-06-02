import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorageFallbackToast } from './StorageFallbackToast';

describe('StorageFallbackToast', () => {
  it('explains the in-memory fallback as an alert', () => {
    render(<StorageFallbackToast />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveTextContent(/saving to memory/i);
    expect(toast).toHaveTextContent(/keep this tab open|don.?t close this tab|stop sooner/i);
  });
});
