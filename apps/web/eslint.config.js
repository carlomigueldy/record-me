import { nextConfig } from '@record-me/config/eslint';

export default [
  ...nextConfig,
  { ignores: ['.next/**', 'node_modules/**', '.turbo/**', 'tests/e2e/**'] },
];
