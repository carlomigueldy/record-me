import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveSiteUrl } from './site-config';

describe('resolveSiteUrl', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('prefers NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://record.me');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'rec.vercel.app');
    expect(resolveSiteUrl()).toBe('https://record.me');
  });

  it('falls back to VERCEL_PROJECT_PRODUCTION_URL with https', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'rec.vercel.app');
    expect(resolveSiteUrl()).toBe('https://rec.vercel.app');
  });

  it('falls back to localhost in dev', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    expect(resolveSiteUrl()).toBe('http://localhost:3000');
  });

  it('strips a trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://record.me/');
    expect(resolveSiteUrl()).toBe('https://record.me');
  });
});
