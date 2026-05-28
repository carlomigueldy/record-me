// packages/recorder/src/acquire.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { acquireTracks } from './acquire';
import {
  setDisplayMediaResponse,
  setUserMediaResponse,
  getDisplayMediaCalls,
  getUserMediaCalls,
  resetMediaDevices,
} from './test/mocks/media-devices';

describe('acquireTracks', () => {
  beforeEach(() => resetMediaDevices());

  it('mode A · screen+cam+cursor — calls both APIs with the right constraints', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    setUserMediaResponse({ kind: 'resolve', tracks: ['video', 'audio'] });

    const result = await acquireTracks({ mode: 'screen+cam+cursor' });

    expect(result.screen).toBeDefined();
    expect(result.camera).toBeDefined();
    expect(result.mic).toBeDefined();
    expect(getDisplayMediaCalls()).toHaveLength(1);
    expect(getDisplayMediaCalls()[0]).toMatchObject({
      video: expect.objectContaining({ cursor: 'always' }),
    });
    expect(getUserMediaCalls()).toHaveLength(1);
    expect(getUserMediaCalls()[0]).toMatchObject({ video: expect.anything(), audio: true });
  });

  it('mode B · screen+cursor — display media required, mic optional and on by default', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    setUserMediaResponse({ kind: 'resolve', tracks: ['audio'] });

    const result = await acquireTracks({ mode: 'screen+cursor' });

    expect(result.screen).toBeDefined();
    expect(result.camera).toBeUndefined();
    expect(result.mic).toBeDefined();
    expect(getUserMediaCalls()[0]).toEqual({ audio: true });
  });

  it('mode B · skips mic when includeMic=false', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });

    const result = await acquireTracks({ mode: 'screen+cursor', includeMic: false });

    expect(result.mic).toBeUndefined();
    expect(getUserMediaCalls()).toHaveLength(0);
  });

  it('mode C · cam-only — calls only getUserMedia with square aspect ratio', async () => {
    setUserMediaResponse({ kind: 'resolve', tracks: ['video', 'audio'] });

    const result = await acquireTracks({ mode: 'cam-only' });

    expect(result.screen).toBeUndefined();
    expect(result.camera).toBeDefined();
    expect(result.mic).toBeDefined();
    expect(getDisplayMediaCalls()).toHaveLength(0);
    expect(getUserMediaCalls()[0]).toMatchObject({
      video: expect.objectContaining({ aspectRatio: 1 }),
    });
  });

  it('throws RecorderError(permission-denied) when screen is denied (mode A)', async () => {
    setDisplayMediaResponse({
      kind: 'reject',
      error: new DOMException('denied', 'NotAllowedError'),
    });
    await expect(acquireTracks({ mode: 'screen+cam+cursor' })).rejects.toMatchObject({
      kind: 'permission-denied',
      message: expect.stringContaining('screen'),
    });
  });

  it('throws RecorderError(permission-denied) when camera is denied (mode A) and stops the screen track', async () => {
    setDisplayMediaResponse({ kind: 'resolve', tracks: ['video'] });
    setUserMediaResponse({
      kind: 'reject',
      error: new DOMException('denied', 'NotAllowedError'),
    });
    await expect(acquireTracks({ mode: 'screen+cam+cursor' })).rejects.toMatchObject({
      kind: 'permission-denied',
      message: expect.stringContaining('camera'),
    });
  });

  it('throws RecorderError(track-failed) when device is not readable', async () => {
    setUserMediaResponse({
      kind: 'reject',
      error: new DOMException('busy', 'NotReadableError'),
    });
    await expect(acquireTracks({ mode: 'cam-only' })).rejects.toMatchObject({
      kind: 'track-failed',
    });
  });
});
