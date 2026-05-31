import path from 'path';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite plugin that stubs .mdx imports at test time. MDX compilation is a
// build-time concern (@next/mdx + webpack); unit tests that import content
// registries (features.ts, doc-bodies.ts) only need the module to resolve,
// not to render. The stub exports a no-op React component.
function mdxStubPlugin(): Plugin {
  return {
    name: 'mdx-stub',
    transform(_code, id) {
      if (id.endsWith('.mdx')) {
        return { code: 'export default function MdxStub() { return null; }', map: null };
      }
    },
  };
}

// Vitest config for apps/web — restricts test discovery to src/**/*.test.{ts,tsx}
// so Playwright specs in tests/e2e/**/*.spec.ts are not picked up.
// The react plugin handles JSX transform (tsconfig uses jsx: "preserve" for Next.js).
export default defineConfig({
  plugins: [mdxStubPlugin(), react()],
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
