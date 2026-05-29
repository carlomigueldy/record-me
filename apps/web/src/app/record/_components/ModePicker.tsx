'use client';

import type { RecordMode } from '@record-me/recorder';
import { ModeCard, cn } from '@record-me/ui';

interface ModeMeta {
  mode: RecordMode;
  eyebrow: string;
  title: string;
  description: string;
}

const MODES: ModeMeta[] = [
  {
    mode: 'screen+cam+cursor',
    eyebrow: 'A · the full recital',
    title: 'Screen + Camera + Cursor',
    description: 'Picture-in-picture camera, click highlights, the whole show.',
  },
  {
    mode: 'screen+cursor',
    eyebrow: 'B · just the work',
    title: 'Screen + Cursor',
    description: 'Clean walk-throughs and demos. No camera, no distraction.',
  },
  {
    mode: 'cam-only',
    eyebrow: 'C · talking head',
    title: 'Camera only',
    description: 'Async updates, round-framed and centered.',
  },
];

export interface ModePickerProps {
  selected: RecordMode;
  available: RecordMode[];
  onSelect: (mode: RecordMode) => void;
}

// ModeCard renders an <article> (with an <h3>), so it cannot live inside a
// <button> (invalid HTML). Instead ModeCard itself becomes the radio via role
// + aria, with keyboard activation. aria-disabled (not the `disabled` attr,
// which <article> doesn't support) gates unavailable modes.
export function ModePicker({ selected, available, onSelect }: ModePickerProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-2xl leading-tight text-ivory sm:text-3xl">
        Choose your <em className="italic text-amber">composition</em>.
      </h2>
      <div
        role="radiogroup"
        aria-label="Recording mode"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {MODES.map((m) => {
          const disabled = !available.includes(m.mode);
          const isSelected = selected === m.mode;
          const select = () => {
            if (!disabled) onSelect(m.mode);
          };
          return (
            <ModeCard
              key={m.mode}
              eyebrow={m.eyebrow}
              title={m.title}
              description={m.description}
              accent={isSelected}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={disabled}
              aria-label={m.title}
              tabIndex={disabled ? -1 : 0}
              onClick={select}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  select();
                }
              }}
              className={cn(
                'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/50',
                disabled && 'cursor-not-allowed opacity-40',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
