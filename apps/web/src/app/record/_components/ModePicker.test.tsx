import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModePicker } from './ModePicker';

describe('ModePicker', () => {
  it('renders the three mode titles', () => {
    render(
      <ModePicker
        selected="screen+cursor"
        available={['screen+cam+cursor', 'screen+cursor', 'cam-only']}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Screen + Camera + Cursor')).toBeInTheDocument();
    expect(screen.getByText('Screen + Cursor')).toBeInTheDocument();
    expect(screen.getByText('Camera only')).toBeInTheDocument();
  });

  it('calls onSelect with the clicked mode', async () => {
    const onSelect = vi.fn();
    render(
      <ModePicker
        selected="screen+cursor"
        available={['screen+cam+cursor', 'screen+cursor', 'cam-only']}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole('radio', { name: /Camera only/ }));
    expect(onSelect).toHaveBeenCalledWith('cam-only');
  });

  it('disables modes not in `available` and does not select them', async () => {
    const onSelect = vi.fn();
    render(<ModePicker selected="cam-only" available={['cam-only']} onSelect={onSelect} />);
    const screenCard = screen.getByRole('radio', { name: /Screen \+ Camera \+ Cursor/ });
    expect(screenCard).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screenCard);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ArrowRight on the focused radio calls onSelect with the next available mode', async () => {
    const onSelect = vi.fn();
    render(
      <ModePicker
        selected="screen+cam+cursor"
        available={['screen+cam+cursor', 'screen+cursor', 'cam-only']}
        onSelect={onSelect}
      />,
    );
    const firstCard = screen.getByRole('radio', { name: /Screen \+ Camera \+ Cursor/ });
    firstCard.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenCalledWith('screen+cursor');
  });

  it('ArrowLeft on the focused radio calls onSelect with the previous available mode', async () => {
    const onSelect = vi.fn();
    render(
      <ModePicker
        selected="cam-only"
        available={['screen+cam+cursor', 'screen+cursor', 'cam-only']}
        onSelect={onSelect}
      />,
    );
    const lastCard = screen.getByRole('radio', { name: /Camera only/ });
    lastCard.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onSelect).toHaveBeenCalledWith('screen+cursor');
  });

  it('selected card has tabIndex=0; non-selected available cards have tabIndex=-1', () => {
    render(
      <ModePicker
        selected="screen+cursor"
        available={['screen+cam+cursor', 'screen+cursor', 'cam-only']}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole('radio', { name: /Screen \+ Cursor/ })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByRole('radio', { name: /Screen \+ Camera \+ Cursor/ })).toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(screen.getByRole('radio', { name: /Camera only/ })).toHaveAttribute('tabindex', '-1');
  });
});
