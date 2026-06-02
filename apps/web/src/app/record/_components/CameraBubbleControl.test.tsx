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
  // jsdom does not implement pointer capture — stub so pointer events don't throw.
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
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

  // M1: the size control must be reachable by keyboard — the group wrapper uses
  // group-focus-within so focusing the handle (a descendant) reveals the radios.
  it('size radiogroup is in the DOM when the handle is focused', async () => {
    render(<CameraBubbleControl {...baseProps} />);
    const handle = screen.getByRole('button', { name: /camera bubble position/i });
    handle.focus();
    // The radiogroup is always in the DOM (opacity toggled via CSS class); verify it exists
    // and that the radios are reachable.
    expect(screen.getByRole('radiogroup', { name: /camera bubble size/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /small/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /medium/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /large/i })).toBeInTheDocument();
  });

  // m2: a plain click (pointer down + up with no movement) must NOT fire onCommitCorner.
  it('does not fire onCommitCorner on a plain click with no drag movement', async () => {
    const onCommitCorner = vi.fn();
    render(<CameraBubbleControl {...baseProps} corner="br" onCommitCorner={onCommitCorner} />);
    const handle = screen.getByRole('button', { name: /camera bubble position/i });
    // Click fires pointerdown + pointerup without any pointermove in between.
    await userEvent.click(handle);
    expect(onCommitCorner).not.toHaveBeenCalled();
  });
});
