import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { Studio } from './_components/Studio';

export const metadata: Metadata = buildMetadata({
  title: 'The studio',
  description:
    'Record your screen, camera, and cursor. No accounts, no upload — everything stays in your browser.',
  path: '/record',
});

export default function RecordPage() {
  return <Studio />;
}
