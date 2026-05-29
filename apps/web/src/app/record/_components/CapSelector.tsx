'use client';

import type { RecordingResolution } from '@record-me/recorder';

const CAP_OPTIONS = [10, 20, 30, 45, 60] as const;
const LONG_WARNING =
  'Longer recordings depend on your machine. Download and processing may take a while. We recommend 10 minutes for the smoothest result.';

export interface CapSelectorProps {
  capMinutes: number;
  resolution: RecordingResolution;
  cursorHighlights: boolean;
  /** Show the click-highlight toggle (only meaningful for modes A/B). */
  showCursorToggle: boolean;
  onCapChange: (minutes: number) => void;
  onResolutionChange: (resolution: RecordingResolution) => void;
  onCursorHighlightsChange: (enabled: boolean) => void;
}

export function CapSelector({
  capMinutes,
  resolution,
  cursorHighlights,
  showCursorToggle,
  onCapChange,
  onResolutionChange,
  onCursorHighlightsChange,
}: CapSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 font-mono text-xs uppercase tracking-wider text-ivory-dim">
        <label className="flex items-center gap-2">
          <span>recording cap</span>
          <select
            aria-label="Recording cap"
            value={capMinutes}
            onChange={(e) => onCapChange(Number(e.target.value))}
            className="rounded-sm border border-line bg-surface px-2 py-1 text-ivory"
          >
            {CAP_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span>quality</span>
          <select
            aria-label="Resolution"
            value={resolution}
            onChange={(e) => onResolutionChange(e.target.value as RecordingResolution)}
            className="rounded-sm border border-line bg-surface px-2 py-1 text-ivory"
          >
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
          </select>
        </label>

        {showCursorToggle ? (
          <label className="flex items-center gap-2 normal-case">
            <input
              type="checkbox"
              checked={cursorHighlights}
              onChange={(e) => onCursorHighlightsChange(e.target.checked)}
              className="accent-amber"
            />
            <span>highlight my clicks</span>
          </label>
        ) : null}
      </div>

      {capMinutes > 10 ? (
        <p className="max-w-prose text-xs leading-relaxed text-ivory-dim">{LONG_WARNING}</p>
      ) : null}
    </div>
  );
}
