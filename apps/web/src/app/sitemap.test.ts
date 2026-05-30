import { describe, expect, it } from 'vitest';
import { siteConfig } from '@/lib/seo/site-config';
import sitemap from './sitemap';

describe('sitemap', () => {
  it('lists the live 5A routes with absolute urls', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain(`${siteConfig.url}/`);
    expect(urls).toContain(`${siteConfig.url}/record`);
    expect(urls).toContain(`${siteConfig.url}/privacy`);
    expect(urls).toContain(`${siteConfig.url}/changelog`);
  });

  it('does not list dev-only routes', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.includes('/dev'))).toBe(false);
  });

  it('assigns the homepage the highest priority', () => {
    const home = sitemap().find((e) => e.url === `${siteConfig.url}/`);
    expect(home?.priority).toBe(1);
  });
});
