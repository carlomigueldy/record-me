import { ogImage, SIZE } from '@/app/_og/template';

// Node.js runtime (default) — font loader uses fs.readFileSync, not fetch.
export const size = SIZE;
export const contentType = 'image/png';
export const alt = 'record me — documentation';

export default function DocsIndexOg() {
  return ogImage({
    title: 'Documentation',
    caption: 'Guides and reference for record me',
  });
}
