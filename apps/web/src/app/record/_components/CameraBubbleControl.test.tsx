import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { CameraBubbleControl } from './CameraBubbleControl';

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe() {
        this.cb([], this as unknown as ResizeObserver);
      }
      disconnect() {}
      unobserve() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

const baseProps = {
  corner: 'br' as const,
  size: 'md' as const,
  aspect: 16 / 9,
  canvasWidth: 1920,
  canvasHeight: 1080,
  surfaceRef: createRef<HTMLElement>(),
  variant: 'setup' as const,
  onCommitCorner: () => {},
  onCommitSize: () => {},
};

describe('CameraBubbleControl', () => {
  it('renders the draggable handle with an accessible label', () => {
    render(<CameraBubbleControl {...baseProps} />);
    expect(screen.getByRole('button', { name: /camera bubble position/i })).toBeInTheDocument();
  });

  it('renders the CAM placeholder label in setup variant', () => {
    render(<CameraBubbleControl {...baseProps} variant="setup" />);
    expect(screen.getByText('CAM')).toBeInTheDocument();
  });

  it('moves to an adjacent corner with the arrow keys', async () => {
    const onCommitCorner = vi.fn();
    render(<CameraBubbleControl {...baseProps} corner="br" onCommitCorner={onCommitCorner} />);
    const handle = screen.getByRole('button', { name: /camera bubble position/i });
    handle.focus();
    await userEvent.keyboard('{ArrowLeft}'); // br -> bl
    expect(onCommitCorner).toHaveBeenCalledWith('bl');
    await userEvent.keyboard('{ArrowUp}'); // br -> tr
    expect(onCommitCorner).toHaveBeenCalledWith('tr');
  });

  it('changes size via the S/M/L radio group', async () => {
    const onCommitSize = vi.fn();
    render(<CameraBubbleControl {...baseProps} onCommitSize={onCommitSize} />);
    await userEvent.click(screen.getByRole('radio', { name: /large/i }));
    expect(onCommitSize).toHaveBeenCalledWith('lg');
  });
});
