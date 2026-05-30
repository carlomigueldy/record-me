// Registers jest-dom matchers (toBeInTheDocument, toBeDisabled, …) for Vitest.
// RTL auto-cleanup activates because vitest runs with globals: true.
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import type * as NextNavigation from 'next/navigation';

// next/navigation's useRouter throws outside an AppRouterContext provider.
// Components that use <TransitionLink> call useRouter for view-transition
// navigation, so stub it app-wide. Individual specs can override this mock
// (e.g. to assert push() was called) — a later vi.mock in a test file wins.
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof NextNavigation>();
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
  };
});

// jsdom does not implement IntersectionObserver. Stub it so that
// motion's whileInView feature can mount without throwing.
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverStub,
  });
}
