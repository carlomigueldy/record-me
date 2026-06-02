import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { webApplicationLd, breadcrumbLd } from '@/lib/seo/json-ld';
import { JsonLd } from '@/lib/seo/JsonLd';
import { Studio } from './_components/Studio';

export const metadata: Metadata = buildMetadata({
  title: 'The studio',
  description:
    'Record your screen, camera, and cursor. No accounts, no upload — everything stays in your browser.',
  path: '/record',
});

export default function RecordPage() {
  return (
    <>
      <JsonLd
        data={[
          webApplicationLd(),
          breadcrumbLd([
            { name: 'record me', path: '/' },
            { name: 'The studio', path: '/record' },
          ]),
        ]}
      />
      <Studio />
    </>
  );
}
