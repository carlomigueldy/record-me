import { describe, expect, it } from 'vitest';
import { organizationLd, softwareApplicationLd, webApplicationLd, webSiteLd } from './json-ld';
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
