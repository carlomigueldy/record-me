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

export function softwareApplicationLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteConfig.name,
    url: siteConfig.url,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    description: siteConfig.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

export function webApplicationLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteConfig.name,
    url: siteConfig.url,
    browserRequirements: 'Requires JavaScript and a browser with MediaRecorder support.',
  };
}

export { organizationLd, webSiteLd };
export type { Ld };
