import { baseConfig } from '@record-me/config/eslint';

export default [
  ...baseConfig,
  { ignores: ['dist/**', 'node_modules/**', '.turbo/**', 'coverage/**'] },
];
