// packages/recorder/src/test/mocks/media-devices.ts
// Mocks navigator.mediaDevices.getDisplayMedia + getUserMedia. Each call routes
// through a per-test "responder" registry so individual tests can decide
// whether to resolve with a stream, reject with a DOMException, or hang.

import { MockMediaStream, MockMediaStreamTrack, type MockTrackKind } from './media-stream';

export type MediaResponder =
  | { kind: 'resolve'; tracks: MockTrackKind[] }
  | { kind: 'reject'; error: DOMException };

interface MediaDevicesState {
  displayResponder: MediaResponder;
  userResponder: MediaResponder;
  displayCalls: DisplayMediaStreamOptions[];
  userCalls: MediaStreamConstraints[];
}

const state: MediaDevicesState = {
  displayResponder: { kind: 'resolve', tracks: ['video'] },
  userResponder: { kind: 'resolve', tracks: ['video', 'audio'] },
  displayCalls: [],
  userCalls: [],
};

function buildStream(kinds: MockTrackKind[]): MockMediaStream {
  return new MockMediaStream(
    kinds.map((kind) => new MockMediaStreamTrack({ kind, label: `mock-${kind}` })),
  );
}

async function getDisplayMedia(
  constraints: DisplayMediaStreamOptions = {},
): Promise<MockMediaStream> {
  state.displayCalls.push(constraints);
  const r = state.displayResponder;
  if (r.kind === 'reject') throw r.error;
  return buildStream(r.tracks);
}

async function getUserMedia(constraints: MediaStreamConstraints = {}): Promise<MockMediaStream> {
  state.userCalls.push(constraints);
  const r = state.userResponder;
  if (r.kind === 'reject') throw r.error;
  return buildStream(r.tracks);
}

export function installMediaDevices(): void {
  const mediaDevices = {
    getDisplayMedia,
    getUserMedia,
    enumerateDevices: async () => [],
  };
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: mediaDevices,
  });
}

// ── Test helpers ──────────────────────────────────────────────────────────────

export function setDisplayMediaResponse(r: MediaResponder): void {
  state.displayResponder = r;
}

export function setUserMediaResponse(r: MediaResponder): void {
  state.userResponder = r;
}

export function getDisplayMediaCalls(): readonly DisplayMediaStreamOptions[] {
  return state.displayCalls;
}

export function getUserMediaCalls(): readonly MediaStreamConstraints[] {
  return state.userCalls;
}

export function resetMediaDevices(): void {
  state.displayResponder = { kind: 'resolve', tracks: ['video'] };
  state.userResponder = { kind: 'resolve', tracks: ['video', 'audio'] };
  state.displayCalls = [];
  state.userCalls = [];
}
