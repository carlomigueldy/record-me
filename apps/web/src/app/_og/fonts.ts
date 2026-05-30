import { readFile } from 'fs/promises';
import path from 'path';

// Font loading via fs/promises + process.cwd() — the only pattern that works
// during both `next dev` and `next build` static prerendering.
//
// import.meta.url resolves to a relative /_next/static/media/... asset URL
// during static export, which is not a valid absolute URL for fetch(). Until
// Next.js resolves this (https://github.com/vercel/next.js/issues/66244), the
// fs approach is required locally. Vercel lambda deployments resolve process.cwd()
// to /var/task where the .next output is unpacked — fonts ship in .next/server/
// alongside the route bundle and are accessible at runtime.
async function loadOgFonts() {
  const fontsDir = path.join(process.cwd(), 'src/app/_og/fonts');
  const [serif, mono] = await Promise.all([
    readFile(path.join(fontsDir, 'InstrumentSerif-Regular.ttf')),
    readFile(path.join(fontsDir, 'GeistMono-Regular.ttf')),
  ]);
  return [
    {
      name: 'Instrument Serif',
      data: serif.buffer as ArrayBuffer,
      weight: 400 as const,
      style: 'normal' as const,
    },
    {
      name: 'Geist Mono',
      data: mono.buffer as ArrayBuffer,
      weight: 400 as const,
      style: 'normal' as const,
    },
  ];
}

export { loadOgFonts };
