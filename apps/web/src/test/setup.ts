// Registers jest-dom matchers (toBeInTheDocument, toBeDisabled, …) for Vitest.
// RTL auto-cleanup activates because vitest runs with globals: true.
import '@testing-library/jest-dom/vitest';

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
