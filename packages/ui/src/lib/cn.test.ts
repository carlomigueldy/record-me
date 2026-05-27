import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins multiple class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('resolves conflicting tailwind classes (later wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-ivory', 'text-amber')).toBe('text-amber');
  });

  it('accepts conditional objects (clsx semantics)', () => {
    expect(cn('a', { b: true, c: false }, ['d'])).toBe('a b d');
  });
});
