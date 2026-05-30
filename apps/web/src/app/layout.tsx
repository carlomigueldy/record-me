import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd } from '@/lib/seo/JsonLd';
import { organizationLd, webSiteLd } from '@/lib/seo/json-ld';
import { siteConfig } from '@/lib/seo/site-config';
import './globals.css';

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const base = buildMetadata({
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  path: '/',
});

export const metadata: Metadata = {
  ...base,
  metadataBase: new URL(siteConfig.url),
  // Override the string title from `base` with the default+template object so
  // child pages with a string title render as "<Page> — record me".
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
};

export const viewport: Viewport = {
  themeColor: '#0F1115',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body className="font-sans">
        <JsonLd data={[organizationLd(), webSiteLd()]} />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
