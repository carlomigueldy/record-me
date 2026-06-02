import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryPressureBanner } from './MemoryPressureBanner';

describe('MemoryPressureBanner', () => {
  it('renders the calm long-recording advisory with role=status', () => {
    render(<MemoryPressureBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent(/recording is getting long/i);
    expect(banner).toHaveTextContent(/recommend stopping soon/i);
  });
});
