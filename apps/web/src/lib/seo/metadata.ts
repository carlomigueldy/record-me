import type { Metadata } from 'next';
import { siteConfig } from './site-config';

type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
  /** Optional OG image override (absolute or root-relative). Defaults to the route's opengraph-image. */
  og?: string;
};

function buildMetadata({ title, description, path, og }: BuildMetadataInput): Metadata {
  const url = new URL(path, siteConfig.url).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      title,
      description,
      url,
      ...(og ? { images: [{ url: og, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(og ? { images: [og] } : {}),
    },
  };
}

export { buildMetadata };
export type { BuildMetadataInput };
