import { describe, it, expect } from 'vitest';
import {
  pipDiameter,
  resolvePip,
  nearestCorner,
  computeContentRect,
  PIP_CORNERS,
  PIP_SIZES,
} from './pip-geometry';

describe('pipDiameter', () => {
  it('rounds fraction*height at 1080p', () => {
    expect(pipDiameter('sm', 1920, 1080)).toBe(184); // round(0.17*1080)
    expect(pipDiameter('md', 1920, 1080)).toBe(238); // round(0.22*1080)
    expect(pipDiameter('lg', 1920, 1080)).toBe(324); // round(0.30*1080)
  });
  it('rounds fraction*height at 720p', () => {
    expect(pipDiameter('sm', 1280, 720)).toBe(122);
    expect(pipDiameter('md', 1280, 720)).toBe(158);
    expect(pipDiameter('lg', 1280, 720)).toBe(216);
  });
  it('clamps to 40% of the shorter side', () => {
    // Portrait canvas (200×400): raw = round(0.30*400) = 120 > ceiling = floor(0.4*200) = 80.
    expect(pipDiameter('lg', 200, 400)).toBe(Math.floor(0.4 * 200)); // 80
  });
});

describe('resolvePip', () => {
  it('places br with per-axis 32px inset at md/1080p', () => {
    const p = resolvePip('br', 'md', 1920, 1080);
    expect(p.diameter).toBe(238);
    expect(p.xNorm).toBeCloseTo(1 - (119 + 32) / 1920, 5); // ~0.9214
    expect(p.yNorm).toBeCloseTo(1 - (119 + 32) / 1080, 5); // ~0.8602
  });
  it('places tl mirrored', () => {
    const p = resolvePip('tl', 'md', 1920, 1080);
    expect(p.xNorm).toBeCloseTo((119 + 32) / 1920, 5);
    expect(p.yNorm).toBeCloseTo((119 + 32) / 1080, 5);
  });
});

describe('nearestCorner', () => {
  it('snaps a top-left-ish drop to tl', () => {
    expect(nearestCorner(0.1, 0.1, 'md', 1920, 1080)).toBe('tl');
  });
  it('snaps a bottom-right-ish drop to br', () => {
    expect(nearestCorner(0.95, 0.92, 'md', 1920, 1080)).toBe('br');
  });
  it('snaps center-bottom-left to bl', () => {
    expect(nearestCorner(0.2, 0.8, 'md', 1920, 1080)).toBe('bl');
  });
});

describe('computeContentRect', () => {
  it('letterboxes a 16:9 composite in a wider box (pillarbox)', () => {
    const r = computeContentRect(2000, 1000, 16 / 9); // box wider than 16:9
    expect(r.height).toBe(1000);
    expect(r.width).toBeCloseTo(1000 * (16 / 9), 3);
    expect(r.top).toBe(0);
    expect(r.left).toBeCloseTo((2000 - 1000 * (16 / 9)) / 2, 3);
  });
  it('letterboxes a 16:9 composite in a narrower box', () => {
    const r = computeContentRect(1600, 1000, 16 / 9); // box narrower than 16:9
    expect(r.width).toBe(1600);
    expect(r.height).toBeCloseTo(1600 / (16 / 9), 3);
    expect(r.left).toBe(0);
  });
  it('returns zero rect for a zero-size box', () => {
    expect(computeContentRect(0, 0, 16 / 9)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });
});

describe('enums', () => {
  it('exposes corner and size lists', () => {
    expect(PIP_CORNERS).toEqual(['tl', 'tr', 'bl', 'br']);
    expect(PIP_SIZES).toEqual(['sm', 'md', 'lg']);
  });
});
