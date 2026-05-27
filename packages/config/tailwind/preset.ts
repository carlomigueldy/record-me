/*
 * @record-me/config · Tailwind v4 preset
 * Phase 1 ships the token import. Phase 2 extends with plugin presets.
 */

export const tailwindThemeImport = '@record-me/config/tailwind/theme.css';

export const recordMeTailwindPreset = {
  themeImport: tailwindThemeImport,
} as const;

export default recordMeTailwindPreset;
