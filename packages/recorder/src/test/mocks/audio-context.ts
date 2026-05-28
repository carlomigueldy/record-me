// packages/recorder/src/test/mocks/audio-context.ts
// Minimal AudioContext mock. Phase 3 does not mix audio (mic-only flows pass
// the track straight to the encoder), but importing AudioContext should not
// crash in jsdom. Real audio mixing arrives in a later phase.

import { vi } from 'vitest';
import { MockMediaStream, MockMediaStreamTrack } from './media-stream';

export class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'running';
  destination = { stream: new MockMediaStream() };

  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
  createGain = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { value: 1 } }));
  createMediaStreamDestination = vi.fn(() => ({
    stream: new MockMediaStream([new MockMediaStreamTrack({ kind: 'audio', label: 'mixed' })]),
  }));
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  resume = vi.fn(async () => {
    this.state = 'running';
  });
}

export function installAudioContextGlobal(): void {
  // @ts-expect-error jsdom does not provide AudioContext
  globalThis.AudioContext = MockAudioContext;
}
