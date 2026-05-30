import { readFile } from 'fs/promises';
import path from 'path';

async function loadOgFonts() {
  // Fonts are bundled into the app directory and read via the filesystem at
  // runtime — this is the supported pattern for next/og (satori) font loading.
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
