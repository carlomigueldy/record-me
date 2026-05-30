function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`.replace(/\/$/, '');

  return 'http://localhost:3000';
}

export { resolveSiteUrl };

export const siteConfig = {
  name: 'record me',
  tagline: 'record your screen, beautifully',
  description:
    'An editorial, privacy-first, browser-native video recording instrument. Screen, camera, cursor — composed in the browser, downloaded to disk. No accounts, no upload.',
  url: resolveSiteUrl(),
} as const;
