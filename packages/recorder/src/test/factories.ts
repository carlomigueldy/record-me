// packages/recorder/src/test/factories.ts
import { MockMediaStream, MockMediaStreamTrack, type MockTrackKind } from './mocks/media-stream';

export function makeTrack(kind: MockTrackKind, label?: string): MockMediaStreamTrack {
  return new MockMediaStreamTrack(label === undefined ? { kind } : { kind, label });
}

export function makeStream(kinds: MockTrackKind[]): MockMediaStream {
  return new MockMediaStream(kinds.map((k) => makeTrack(k)));
}

// Wait for the next microtask + a queued macro task — sufficient to flush
// awaited promises and one RAF tick in jsdom under vi.useFakeTimers.
export async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
