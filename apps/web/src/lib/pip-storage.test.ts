import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadPipPreference, savePipPreference } from './pip-storage';

describe('pip-storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns the default when nothing is stored', () => {
    expect(loadPipPreference()).toEqual({ corner: 'br', size: 'md' });
  });

  it('round-trips a saved preference with a version field', () => {
    savePipPreference({ corner: 'tl', size: 'lg' });
    expect(JSON.parse(localStorage.getItem('record-me-pip')!)).toEqual({
      v: 1,
      corner: 'tl',
      size: 'lg',
    });
    expect(loadPipPreference()).toEqual({ corner: 'tl', size: 'lg' });
  });

  it('falls back to defaults for out-of-range values', () => {
    localStorage.setItem('record-me-pip', JSON.stringify({ v: 1, corner: 'xx', size: 'huge' }));
    expect(loadPipPreference()).toEqual({ corner: 'br', size: 'md' });
  });

  it('falls back to defaults for malformed JSON', () => {
    localStorage.setItem('record-me-pip', '{not json');
    expect(loadPipPreference()).toEqual({ corner: 'br', size: 'md' });
  });

  it('does not throw when localStorage access throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadPipPreference()).toEqual({ corner: 'br', size: 'md' });
    spy.mockRestore();
  });
});
