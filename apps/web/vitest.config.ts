import { defineConfig } from 'vitest/config';

// Vitest config for apps/web — restricts test discovery to src/**/*.test.{ts,tsx}
// so Playwright specs in tests/e2e/**/*.spec.ts are not picked up.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', '.turbo', 'tests/e2e/**'],
  },
});
