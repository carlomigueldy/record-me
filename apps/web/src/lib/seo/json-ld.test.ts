import { describe, expect, it } from 'vitest';
import {
  breadcrumbLd,
  faqPageLd,
  howToLd,
  organizationLd,
  softwareApplicationLd,
  webApplicationLd,
  webSiteLd,
} from './json-ld';
import { siteConfig } from './site-config';

describe('json-ld builders', () => {
  it('organizationLd has required schema.org fields', () => {
    const ld = organizationLd();
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('Organization');
    expect(ld.name).toBe(siteConfig.name);
    expect(ld.url).toBe(siteConfig.url);
  });

  it('webSiteLd has required schema.org fields', () => {
    const ld = webSiteLd();
    expect(ld['@type']).toBe('WebSite');
    expect(ld.name).toBe(siteConfig.name);
    expect(ld.url).toBe(siteConfig.url);
  });
});

describe('app json-ld builders', () => {
  it('softwareApplicationLd has required fields + free offer', () => {
    const ld = softwareApplicationLd();
    expect(ld['@type']).toBe('SoftwareApplication');
    expect(ld.applicationCategory).toBe('MultimediaApplication');
    expect(ld.operatingSystem).toBe('Web');
    expect((ld.offers as { price?: string }).price).toBe('0');
  });
  it('webApplicationLd has required fields', () => {
    const ld = webApplicationLd();
    expect(ld['@type']).toBe('WebApplication');
    expect(ld.browserRequirements).toMatch(/javascript/i);
  });
});

describe('content json-ld builders', () => {
  it('howToLd emits HowTo + HowToStep', () => {
    const ld = howToLd({
      name: 'Record screen + camera + cursor',
      step: [{ name: 'Pick the mode', text: 'Choose Screen + Camera + Cursor.' }],
    });
    expect(ld['@type']).toBe('HowTo');
    expect(ld.name).toBe('Record screen + camera + cursor');
    expect((ld.step as { '@type': string }[])[0]!['@type']).toBe('HowToStep');
  });

  it('howToLd omits description when not provided and includes it when given', () => {
    const without = howToLd({ name: 'A', step: [{ name: 's', text: 't' }] });
    expect('description' in without).toBe(false);
    const withDesc = howToLd({
      name: 'A',
      description: 'A short how-to.',
      step: [{ name: 's', text: 't' }],
    });
    expect(withDesc.description).toBe('A short how-to.');
  });

  it('faqPageLd emits FAQPage with Question/acceptedAnswer', () => {
    const ld = faqPageLd([{ question: 'Is it free?', answer: 'Yes — MIT.' }]);
    expect(ld['@type']).toBe('FAQPage');
    const q = (ld.mainEntity as { '@type': string; acceptedAnswer: { text: string } }[])[0]!;
    expect(q['@type']).toBe('Question');
    expect(q.acceptedAnswer.text).toBe('Yes — MIT.');
  });

  it('breadcrumbLd emits BreadcrumbList with ABSOLUTE item urls', () => {
    const ld = breadcrumbLd([
      { name: 'Docs', path: '/docs' },
      { name: 'Permissions', path: '/docs/permissions' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    const items = ld.itemListElement as { position: number; item: string }[];
    expect(items[0]!.position).toBe(1);
    expect(items[1]!.position).toBe(2);
    expect(items[1]!.item).toBe(`${siteConfig.url}/docs/permissions`); // absolute
  });
});
