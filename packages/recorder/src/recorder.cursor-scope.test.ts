import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRecorder } from './recorder';
import { MockMediaRecorder } from './test/mocks/media-recorder';
import { MockMediaStreamTrack } from './test/mocks/media-stream';
import { setDisplayMediaResponse, resetMediaDevices } from './test/mocks/media-devices';
import { flushAsync } from './test/factories';

afterEach(() => {
  MockMediaRecorder.reset();
  resetMediaDevices();
});

describe('createRecorder · cursor scope', () => {
  it('fires onCursorScopeMissed when highlights are on but the surface is a window', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onCursorScopeMissed = vi.fn();
    const handle = createRecorder({
      mode: 'screen+cursor',
      cursorHighlights: true,
      onCursorScopeMissed,
    });
    // Make the produced screen track report a non-browser surface.
    const origBuild = MockMediaStreamTrack.prototype.getSettings;
    vi.spyOn(MockMediaStreamTrack.prototype, 'getSettings').mockReturnValue({
      displaySurface: 'window',
    } as MediaTrackSettings);

    await handle.start();
    await flushAsync();
    expect(onCursorScopeMissed).toHaveBeenCalledTimes(1);

    vi.mocked(MockMediaStreamTrack.prototype.getSettings).mockRestore();
    void origBuild;
    handle.dispose();
  });

  it('does NOT fire when highlights are disabled', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onCursorScopeMissed = vi.fn();
    const handle = createRecorder({
      mode: 'screen+cursor',
      cursorHighlights: false,
      onCursorScopeMissed,
    });
    await handle.start();
    await flushAsync();
    expect(onCursorScopeMissed).not.toHaveBeenCalled();
    handle.dispose();
  });

  it('does NOT fire when mode is cam-only', async () => {
    const onCursorScopeMissed = vi.fn();
    const handle = createRecorder({
      mode: 'cam-only',
      cursorHighlights: true,
      onCursorScopeMissed,
    });
    await handle.start();
    await flushAsync();
    expect(onCursorScopeMissed).not.toHaveBeenCalled();
    handle.dispose();
  });

  it('does NOT fire when displaySurface is browser (correct tab)', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onCursorScopeMissed = vi.fn();
    const handle = createRecorder({
      mode: 'screen+cursor',
      cursorHighlights: true,
      onCursorScopeMissed,
    });
    vi.spyOn(MockMediaStreamTrack.prototype, 'getSettings').mockReturnValue({
      displaySurface: 'browser',
    } as MediaTrackSettings);

    await handle.start();
    await flushAsync();
    expect(onCursorScopeMissed).not.toHaveBeenCalled();

    vi.mocked(MockMediaStreamTrack.prototype.getSettings).mockRestore();
    handle.dispose();
  });

  it('does NOT fire when displaySurface is not set (undefined / empty settings)', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    const onCursorScopeMissed = vi.fn();
    const handle = createRecorder({
      mode: 'screen+cursor',
      cursorHighlights: true,
      onCursorScopeMissed,
    });
    // Default MockMediaStreamTrack.getSettings returns {} (no displaySurface).
    await handle.start();
    await flushAsync();
    expect(onCursorScopeMissed).not.toHaveBeenCalled();
    handle.dispose();
  });
});
