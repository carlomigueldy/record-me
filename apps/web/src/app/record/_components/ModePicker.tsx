'use client';

import { useRef } from 'react';
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
//
// Roving tabindex: the selected radio holds tabIndex=0; all others are -1.
// Tab lands once on the group; arrows move focus+selection within it (WAI-ARIA
// radiogroup pattern). Only available modes are visited by arrow keys.
export function ModePicker({ selected, available, onSelect }: ModePickerProps) {
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  const availableModes = MODES.filter((m) => available.includes(m.mode));

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    currentMode: RecordMode,
    disabled: boolean,
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) onSelect(currentMode);
      return;
    }

    const isNext = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const isPrev = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!isNext && !isPrev) return;

    e.preventDefault();
    const currentIdx = availableModes.findIndex((m) => m.mode === currentMode);
    // If current mode isn't in available, start from index 0.
    const fromIdx = currentIdx === -1 ? 0 : currentIdx;
    const delta = isNext ? 1 : -1;
    // Clamp — don't wrap at the ends.
    const nextIdx = Math.max(0, Math.min(availableModes.length - 1, fromIdx + delta));
    const nextMode = availableModes[nextIdx];
    if (!nextMode) return;

    onSelect(nextMode.mode);
    // Move DOM focus to the newly selected card.
    const nextCardIdx = MODES.findIndex((m) => m.mode === nextMode.mode);
    cardRefs.current[nextCardIdx]?.focus();
  };

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
        {MODES.map((m, idx) => {
          const disabled = !available.includes(m.mode);
          const isSelected = selected === m.mode;
          const select = () => {
            if (!disabled) onSelect(m.mode);
          };
          // Roving tabindex: selected card is reachable by Tab; others are not.
          const tabIndex = disabled ? -1 : isSelected ? 0 : -1;
          return (
            <ModeCard
              key={m.mode}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              eyebrow={m.eyebrow}
              title={m.title}
              description={m.description}
              accent={isSelected}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={disabled}
              aria-label={m.title}
              tabIndex={tabIndex}
              onClick={select}
              onKeyDown={(e) => handleKeyDown(e, m.mode, disabled)}
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
