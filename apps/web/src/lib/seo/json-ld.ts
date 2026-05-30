import { siteConfig } from './site-config';

type Ld = Record<string, unknown> & { '@context': 'https://schema.org'; '@type': string };

function organizationLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

function webSiteLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

export { organizationLd, webSiteLd };
export type { Ld };
