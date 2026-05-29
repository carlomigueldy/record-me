import type { Metadata } from 'next';
import { Studio } from './_components/Studio';

export const metadata: Metadata = {
  title: 'the studio — record me',
  description:
    'Record your screen, camera, and cursor. No accounts, no upload — everything stays in your browser.',
};

export default function RecordPage() {
  return <Studio />;
}
