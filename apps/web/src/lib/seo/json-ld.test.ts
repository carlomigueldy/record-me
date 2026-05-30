import { describe, expect, it } from 'vitest';
import { organizationLd, webSiteLd } from './json-ld';
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
