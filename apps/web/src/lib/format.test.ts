import { describe, it, expect } from 'vitest';
import { formatDuration, formatMegabytes, capMinutesToMs } from './format';

describe('format', () => {
  it('formats durations as mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(42_000)).toBe('00:42');
    expect(formatDuration(605_000)).toBe('10:05');
    expect(formatDuration(-100)).toBe('00:00');
  });
  it('formats megabytes to one decimal', () => {
    expect(formatMegabytes(12_400_000)).toBe('12.4 MB');
    expect(formatMegabytes(0)).toBe('0.0 MB');
  });
  it('converts cap minutes to ms', () => {
    expect(capMinutesToMs(10)).toBe(600_000);
  });
});
