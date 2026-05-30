import { ogImage, SIZE } from '../_og/template';

export const size = SIZE;
export const contentType = 'image/png';
export const alt = 'record me — Changelog';

export default function OgImage() {
  return ogImage({ title: 'What shipped, version by version.', caption: 'changelog' });
}
