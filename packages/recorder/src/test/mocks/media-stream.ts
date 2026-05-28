// packages/recorder/src/test/mocks/media-stream.ts
// Minimal, controllable mocks for MediaStream and MediaStreamTrack.
// jsdom does not implement either; this is sufficient for our recorder tests.

export type MockTrackKind = 'video' | 'audio';

export interface MockMediaStreamTrackInit {
  kind: MockTrackKind;
  label?: string;
  enabled?: boolean;
}

export class MockMediaStreamTrack extends EventTarget {
  public readonly kind: MockTrackKind;
  public readonly label: string;
  public enabled: boolean;
  public readyState: 'live' | 'ended' = 'live';
  public readonly id: string;
  public stopCalls = 0;

  constructor(init: MockMediaStreamTrackInit) {
    super();
    this.kind = init.kind;
    this.label = init.label ?? `${init.kind}-track`;
    this.enabled = init.enabled ?? true;
    this.id = `track-${Math.random().toString(36).slice(2, 10)}`;
  }

  stop(): void {
    this.stopCalls += 1;
    if (this.readyState === 'ended') return;
    this.readyState = 'ended';
    this.dispatchEvent(new Event('ended'));
  }

  // Helper for tests to simulate a remote track ending (e.g. user clicks "Stop
  // sharing" in the browser screen-share UI).
  _simulateEnded(): void {
    this.stop();
  }
}

export class MockMediaStream {
  public readonly id: string;
  private tracks: MockMediaStreamTrack[];

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.id = `stream-${Math.random().toString(36).slice(2, 10)}`;
    this.tracks = [...tracks];
  }

  getTracks(): MockMediaStreamTrack[] {
    return [...this.tracks];
  }

  getVideoTracks(): MockMediaStreamTrack[] {
    return this.tracks.filter((t) => t.kind === 'video');
  }

  getAudioTracks(): MockMediaStreamTrack[] {
    return this.tracks.filter((t) => t.kind === 'audio');
  }

  addTrack(track: MockMediaStreamTrack): void {
    if (!this.tracks.includes(track)) this.tracks.push(track);
  }

  removeTrack(track: MockMediaStreamTrack): void {
    this.tracks = this.tracks.filter((t) => t !== track);
  }
}

export function installMediaStreamGlobals(): void {
  // @ts-expect-error jsdom does not provide MediaStream
  globalThis.MediaStream = MockMediaStream;
  // @ts-expect-error jsdom does not provide MediaStreamTrack
  globalThis.MediaStreamTrack = MockMediaStreamTrack;
}
