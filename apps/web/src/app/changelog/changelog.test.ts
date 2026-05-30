import { describe, expect, it } from 'vitest';
import { changelog } from './changelog';

describe('changelog data', () => {
  it('has at least one entry', () => {
    expect(changelog.length).toBeGreaterThan(0);
  });

  it('entries are sorted newest-first by date', () => {
    const dates = changelog.map((e) => e.date);
    const sorted = [...dates].sort((a, b) => (a < b ? 1 : -1));
    expect(dates).toEqual(sorted);
  });

  it('versions are unique and dates are ISO yyyy-mm-dd', () => {
    const versions = changelog.map((e) => e.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const e of changelog) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.highlights.length).toBeGreaterThan(0);
    }
  });
});
