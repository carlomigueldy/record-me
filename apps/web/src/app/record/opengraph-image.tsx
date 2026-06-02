import { ogImage, SIZE } from '../_og/template';

export const size = SIZE;
export const contentType = 'image/png';
export const alt = 'record me — Studio';

export default function OgImage() {
  return ogImage({ title: 'Record your screen. Keep it to yourself.', caption: 'studio' });
}
