import { siteConfig } from '@/lib/seo/site-config';
import { ogImage, SIZE } from './_og/template';

export const size = SIZE;
export const contentType = 'image/png';
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;

export default function OgImage() {
  return ogImage({
    title: 'Press record. Get a beautifully cut clip.',
    caption: 'record your screen, beautifully',
  });
}
