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

  it('lists the 3 feature deep pages at priority 0.8', () => {
    const entries = sitemap();
    for (const slug of ['screen-camera-cursor', 'screen-cursor', 'camera-only']) {
      const entry = entries.find((e) => e.url === `${siteConfig.url}/features/${slug}`);
      expect(entry, `missing /features/${slug}`).toBeDefined();
      expect(entry?.priority).toBe(0.8);
    }
  });

  it('lists the /docs index and per-doc pages at priority 0.6', () => {
    const entries = sitemap();
    const index = entries.find((e) => e.url === `${siteConfig.url}/docs`);
    expect(index?.priority).toBe(0.6);
    const permissions = entries.find((e) => e.url === `${siteConfig.url}/docs/permissions`);
    expect(permissions, 'missing /docs/permissions').toBeDefined();
    expect(permissions?.priority).toBe(0.6);
  });

  it('uses absolute urls and a monthly change frequency for 5C routes', () => {
    const entry = sitemap().find((e) => e.url === `${siteConfig.url}/features/camera-only`);
    expect(entry?.url.startsWith('https://') || entry?.url.startsWith('http://')).toBe(true);
    expect(entry?.changeFrequency).toBe('monthly');
  });
});
