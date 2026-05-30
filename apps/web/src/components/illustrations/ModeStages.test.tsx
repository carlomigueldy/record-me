import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ModeStageA } from './ModeStageA';
import { ModeStageB } from './ModeStageB';
import { ModeStageC } from './ModeStageC';

describe('mode stage illustrations', () => {
  it.each([
    ['A', ModeStageA],
    ['B', ModeStageB],
    ['C', ModeStageC],
  ] as const)('%s renders decoratively', (_n, C) => {
    const { container } = render(<C />);
    expect(container.firstChild).toBeTruthy();
    // decorative — must be aria-hidden so it isn't announced
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});
