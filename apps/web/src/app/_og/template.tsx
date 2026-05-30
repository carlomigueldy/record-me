import { ImageResponse } from 'next/og';
import { loadOgFonts } from './fonts';

const SIZE = { width: 1200, height: 630 };

// Twilight tokens (kept literal — next/og can't read CSS variables)
const BG = '#0d0b14';
const IVORY = '#ece7de';
const IVORY_DIM = '#b9b3a8';
const AMBER = '#e0a04d';
const LINE = '#2a2735';

async function ogImage({
  title,
  caption,
}: {
  title: string;
  caption: string;
}): Promise<ImageResponse> {
  const fonts = await loadOgFonts();
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BG,
        padding: '72px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 1, background: AMBER }} />
        <span
          style={{
            fontFamily: 'Geist Mono',
            fontSize: 22,
            letterSpacing: 4,
            color: IVORY_DIM,
            textTransform: 'uppercase',
          }}
        >
          record me
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          fontFamily: 'Instrument Serif',
          fontSize: 88,
          lineHeight: 1.05,
          color: IVORY,
          maxWidth: 980,
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `1px solid ${LINE}`,
          paddingTop: 24,
        }}
      >
        <span style={{ fontFamily: 'Geist Mono', fontSize: 20, color: AMBER, letterSpacing: 2 }}>
          {caption}
        </span>
        <span style={{ fontFamily: 'Geist Mono', fontSize: 18, color: IVORY_DIM }}>
          browser-native · no upload
        </span>
      </div>
    </div>,
    { ...SIZE, fonts },
  );
}

export { ogImage, SIZE };
