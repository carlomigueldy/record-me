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

// Content JSON-LD (5C). Builders use inline structural param shapes — they do
// NOT import from the content schema (lib/content) so the SEO surface stays
// independent of the registry's typed frontmatter. All structured markup is
// frontmatter-sourced at the call site, which structurally prevents the
// content-vs-markup mismatch Google penalizes.

export function howToLd(input: {
  name: string;
  description?: string;
  step: { name: string; text: string }[];
}): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    step: input.step.map((s) => ({ '@type': 'HowToStep', name: s.name, text: s.text })),
  };
}

export function faqPageLd(faq: { question: string; answer: string }[]): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

// Additive beyond spec § 8.4 (which lists only HowTo on features + FAQPage on
// /docs) — a BreadcrumbList for the new deep-page IA. Each crumb carries a
// resolvable ABSOLUTE URL; Google ignores relative item URLs.
export function breadcrumbLd(items: { name: string; path: string }[]): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: new URL(it.path, siteConfig.url).toString(),
    })),
  };
}

export { organizationLd, webSiteLd };
export type { Ld };
