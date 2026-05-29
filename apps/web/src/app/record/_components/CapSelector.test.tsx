import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CapSelector } from './CapSelector';

const defaults = {
  capMinutes: 10,
  resolution: '1080p' as const,
  cursorHighlights: true,
  showCursorToggle: true,
  onCapChange: () => {},
  onResolutionChange: () => {},
  onCursorHighlightsChange: () => {},
};

describe('CapSelector', () => {
  it('shows no warning at the 10-minute default', () => {
    render(<CapSelector {...defaults} />);
    expect(screen.queryByText(/depend on your machine/i)).not.toBeInTheDocument();
  });

  it('surfaces the long-recording warning above 10 minutes', () => {
    render(<CapSelector {...defaults} capMinutes={30} />);
    expect(screen.getByText(/depend on your machine/i)).toBeInTheDocument();
  });

  it('calls onCapChange with the selected minutes', async () => {
    const onCapChange = vi.fn();
    render(<CapSelector {...defaults} onCapChange={onCapChange} />);
    await userEvent.selectOptions(screen.getByLabelText(/recording cap/i), '20');
    expect(onCapChange).toHaveBeenCalledWith(20);
  });

  it('toggling the cursor checkbox reports the new value', async () => {
    const onCursorHighlightsChange = vi.fn();
    render(<CapSelector {...defaults} onCursorHighlightsChange={onCursorHighlightsChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /highlight my clicks/i }));
    expect(onCursorHighlightsChange).toHaveBeenCalledWith(false);
  });

  it('hides the cursor toggle when showCursorToggle is false', () => {
    render(<CapSelector {...defaults} showCursorToggle={false} />);
    expect(
      screen.queryByRole('checkbox', { name: /highlight my clicks/i }),
    ).not.toBeInTheDocument();
  });
});
