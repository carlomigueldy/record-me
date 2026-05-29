import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetaChip } from '@record-me/ui';

describe('test harness', () => {
  it('renders a primitive and matches jest-dom', () => {
    render(<MetaChip>live</MetaChip>);
    expect(screen.getByText('live')).toBeInTheDocument();
  });
});
