import { describe, it, expect } from 'vitest';
import { derivePhase } from './studio-phase';

describe('derivePhase', () => {
  it('reports unsupported regardless of engine state', () => {
    expect(derivePhase('idle', null, null, false)).toBe('unsupported');
  });
  it('maps idle → setup', () => {
    expect(derivePhase('idle', null, null, true)).toBe('setup');
  });
  it('maps requesting-permissions → requesting', () => {
    expect(derivePhase('requesting-permissions', null, null, true)).toBe('requesting');
  });
  it('maps recording → live and paused → paused', () => {
    expect(derivePhase('recording', null, null, true)).toBe('live');
    expect(derivePhase('paused', null, null, true)).toBe('paused');
  });
  it('maps ready → review only when a result exists', () => {
    expect(derivePhase('ready', { url: 'blob:x' } as never, null, true)).toBe('review');
    expect(derivePhase('ready', null, null, true)).toBe('finalizing');
  });
  it('any error wins over the engine state', () => {
    expect(
      derivePhase('recording', null, { name: 'e', kind: 'track-failed', message: 'x' }, true),
    ).toBe('error');
  });
});
