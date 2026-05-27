import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Phase 1 baseline. Spec § 12 sets Phase 3+ targets at 90/90/85/90 —
      // raise when the full recorder engine lands.
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 50,
        statements: 90,
      },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
    },
  },
});
