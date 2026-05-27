import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/recorder/vitest.config.ts',
  {
    test: {
      name: 'ui',
      root: 'packages/ui',
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      globals: true,
    },
  },
  {
    test: {
      name: 'web',
      root: 'apps/web',
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      globals: true,
    },
  },
]);
