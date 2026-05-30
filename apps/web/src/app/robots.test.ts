import { describe, expect, it } from 'vitest';
import { siteConfig } from '@/lib/seo/site-config';
import robots from './robots';

describe('robots', () => {
  it('allows all and disallows api + dev', () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule?.allow).toBe('/');
    expect(rule?.disallow).toEqual(expect.arrayContaining(['/api/', '/dev/']));
  });

  it('points at the sitemap', () => {
    expect(robots().sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
  });
});
