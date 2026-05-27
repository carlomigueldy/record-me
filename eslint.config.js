import { nextConfig } from '@record-me/config/eslint';

// Root eslint config — used by lefthook's pre-commit hook when running across
// staged files that may span multiple packages. Each package also has its own
// eslint.config.js for `pnpm lint` runs.
export default [
  ...nextConfig,
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '.superpowers/**',
    ],
  },
];
