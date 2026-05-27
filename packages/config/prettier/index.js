/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  plugins: [],
  overrides: [
    { files: '*.md', options: { proseWrap: 'preserve', printWidth: 100 } },
    { files: '*.{yml,yaml}', options: { tabWidth: 2 } },
  ],
};
