import { ogImage, SIZE } from '../_og/template';

export const size = SIZE;
export const contentType = 'image/png';
export const alt = 'record me — Privacy';

export default function OgImage() {
  return ogImage({ title: 'Your recordings never leave your browser.', caption: 'privacy' });
}
