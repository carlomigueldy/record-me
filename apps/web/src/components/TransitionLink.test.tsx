import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { TransitionLink } from './TransitionLink';

// startViewTransition is in the TS DOM lib but may be absent at runtime in
// older browsers. These helpers set/clear it through a single cast so the
// supported/unsupported paths can be exercised without scattering casts.
type MaybeStartViewTransition = {
  startViewTransition: Document['startViewTransition'] | undefined;
};
function setStartViewTransition(fn: Document['startViewTransition'] | undefined) {
  (document as unknown as MaybeStartViewTransition).startViewTransition = fn;
}

afterEach(() => {
  vi.restoreAllMocks();
  push.mockReset();
  setStartViewTransition(undefined);
});

describe('TransitionLink', () => {
  it('renders an anchor with the resolved href (navigation works without JS)', () => {
    render(<TransitionLink href="/record">Start recording</TransitionLink>);
    const link = screen.getByRole('link', { name: /start recording/i });
    expect(link).toHaveAttribute('href', '/record');
  });

  it('forwards arbitrary props (className, aria) to the anchor', () => {
    render(
      <TransitionLink href="/privacy" className="x" aria-label="privacy">
        Privacy
      </TransitionLink>,
    );
    const link = screen.getByLabelText('privacy');
    expect(link).toHaveClass('x');
  });

  it('wraps navigation in document.startViewTransition when supported', () => {
    const startViewTransition = vi.fn((cb?: () => void) => {
      cb?.();
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition: () => {},
      } as ViewTransition;
    });
    setStartViewTransition(startViewTransition);

    render(<TransitionLink href="/record">go</TransitionLink>);
    fireEvent.click(screen.getByRole('link', { name: 'go' }));

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/record');
  });

  it('navigates normally (no startViewTransition) when the API is unsupported', () => {
    // No document.startViewTransition defined — our handler must not intercept.
    // An onClick that calls preventDefault stands in for the browser's default
    // navigation (which jsdom does not implement) so the assertion stays focused
    // on "we did not hijack it" without the unimplemented-navigation noise.
    const onClick = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    render(
      <TransitionLink href="/record" onClick={onClick}>
        go
      </TransitionLink>,
    );
    expect(() => fireEvent.click(screen.getByRole('link', { name: 'go' }))).not.toThrow();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('does not intercept modified clicks (new tab / middle click)', () => {
    const startViewTransition = vi.fn();
    setStartViewTransition(startViewTransition as unknown as typeof document.startViewTransition);

    const onClick = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    render(
      <TransitionLink href="/record" onClick={onClick}>
        go
      </TransitionLink>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'go' }), { metaKey: true });

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
