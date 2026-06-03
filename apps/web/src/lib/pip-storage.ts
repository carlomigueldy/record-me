import { PIP_CORNERS, PIP_SIZES, type PipCorner, type PipSize } from './pip-geometry';

export interface PipPreference {
  corner: PipCorner;
  size: PipSize;
}

const KEY = 'record-me-pip';
const DEFAULT: PipPreference = { corner: 'br', size: 'md' };

export function loadPipPreference(): PipPreference {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT };
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as { corner?: unknown; size?: unknown };
    const corner = PIP_CORNERS.includes(parsed.corner as PipCorner)
      ? (parsed.corner as PipCorner)
      : DEFAULT.corner;
    const size = PIP_SIZES.includes(parsed.size as PipSize)
      ? (parsed.size as PipSize)
      : DEFAULT.size;
    return { corner, size };
  } catch {
    return { ...DEFAULT };
  }
}

export function savePipPreference(pref: PipPreference): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify({ v: 1, corner: pref.corner, size: pref.size }));
  } catch {
    /* ignore quota / blocked storage (private mode, Brave shields) */
  }
}
