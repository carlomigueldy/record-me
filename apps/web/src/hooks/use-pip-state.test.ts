import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePipState } from './use-pip-state';

describe('usePipState', () => {
  beforeEach(() => localStorage.clear());

  it('starts at the persisted default', () => {
    const { result } = renderHook(() => usePipState());
    expect(result.current.corner).toBe('br');
    expect(result.current.size).toBe('md');
  });

  it('updates and persists corner + size', () => {
    const { result } = renderHook(() => usePipState());
    act(() => result.current.setCorner('tl'));
    act(() => result.current.setSize('lg'));
    expect(result.current.corner).toBe('tl');
    expect(result.current.size).toBe('lg');
    expect(JSON.parse(localStorage.getItem('record-me-pip')!)).toEqual({
      v: 1,
      corner: 'tl',
      size: 'lg',
    });
  });
});
