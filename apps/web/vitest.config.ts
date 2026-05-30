import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest config for apps/web — restricts test discovery to src/**/*.test.{ts,tsx}
// so Playwright specs in tests/e2e/**/*.spec.ts are not picked up.
// The react plugin handles JSX transform (tsconfig uses jsx: "preserve" for Next.js).
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the @/ alias from tsconfig.json so Vitest can resolve it.
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', '.turbo', 'tests/e2e/**'],
  },
});
