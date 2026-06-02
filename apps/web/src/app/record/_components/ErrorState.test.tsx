import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows a device-specific message for permission denial', () => {
    render(
      <ErrorState
        error={{
          name: 'RecorderError',
          kind: 'permission-denied',
          message: 'x',
          subject: 'camera',
        }}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(/need camera access/i)).toBeInTheDocument();
  });

  it('shows an interrupted message for a mid-recording track failure', () => {
    render(
      <ErrorState
        error={{ name: 'RecorderError', kind: 'track-failed', message: 'x' }}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(/interrupted/i)).toBeInTheDocument();
  });

  it('Try again calls onRetry', async () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        error={{ name: 'RecorderError', kind: 'permission-denied', message: 'x', subject: 'mic' }}
        onRetry={onRetry}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers "Save partial recording" only for track-failed errors', () => {
    const onSavePartial = vi.fn();
    const { rerender } = render(
      <ErrorState
        error={{ name: 'RecorderError', message: '', kind: 'track-failed' }}
        onRetry={vi.fn()}
        onSavePartial={onSavePartial}
      />,
    );
    const save = screen.getByRole('button', { name: /save partial recording/i });
    fireEvent.click(save);
    expect(onSavePartial).toHaveBeenCalledTimes(1);

    rerender(
      <ErrorState
        error={{ name: 'RecorderError', message: '', kind: 'permission-denied', subject: 'screen' }}
        onRetry={vi.fn()}
        onSavePartial={onSavePartial}
      />,
    );
    expect(screen.queryByRole('button', { name: /save partial recording/i })).toBeNull();
  });
});
