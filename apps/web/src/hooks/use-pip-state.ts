'use client';

import { useCallback, useState } from 'react';
import { loadPipPreference, savePipPreference, type PipPreference } from '../lib/pip-storage';
import type { PipCorner, PipSize } from '../lib/pip-geometry';

export interface PipStateApi {
  corner: PipCorner;
  size: PipSize;
  setCorner: (corner: PipCorner) => void;
  setSize: (size: PipSize) => void;
}

export function usePipState(): PipStateApi {
  const [pref, setPref] = useState<PipPreference>(() => loadPipPreference());

  const setCorner = useCallback((corner: PipCorner) => {
    setPref((prev) => {
      const next = { ...prev, corner };
      savePipPreference(next);
      return next;
    });
  }, []);

  const setSize = useCallback((size: PipSize) => {
    setPref((prev) => {
      const next = { ...prev, size };
      savePipPreference(next);
      return next;
    });
  }, []);

  return { corner: pref.corner, size: pref.size, setCorner, setSize };
}
