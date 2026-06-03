// packages/recorder/src/acquire.ts
import { mapDomException } from './errors';
import type { RecordMode } from './types';

export interface AcquireOptions {
  mode: RecordMode;
  /** Only meaningful for mode 'screen+cursor'. Defaults to true. */
  includeMic?: boolean;
}

export interface AcquiredTracks {
  screen: MediaStreamTrack | undefined;
  camera: MediaStreamTrack | undefined;
  mic: MediaStreamTrack | undefined;
  /** All acquired tracks — caller stops these on cleanup. */
  all: MediaStreamTrack[];
}

// Cursor capture is best-effort per browser; `cursor` isn't in lib.dom's
// MediaTrackConstraints but real browsers honor it as a DisplayMedia extension.
const DISPLAY_VIDEO = {
  cursor: 'always',
} as MediaTrackConstraints;

// No hard aspectRatio: 1 — that can throw OverconstrainedError on cameras that
// can't deliver it. coverSquare() is the source-of-truth crop; ideal 720x720
// gives the composer enough pixels for the largest bubble at 1080p.
const CAM_PIP_VIDEO: MediaTrackConstraints = {
  width: { ideal: 720 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
};

// No hard aspectRatio: 1 — same reasoning as CAM_PIP_VIDEO; drawCamFull cover-crops
// via coverSquare(), so a hard 1:1 constraint is both redundant and fragile.
const CAM_SQUARE_VIDEO: MediaTrackConstraints = {
  width: { ideal: 720 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
};

function stopAll(...tracks: (MediaStreamTrack | undefined)[]): void {
  for (const t of tracks) {
    try {
      t?.stop();
    } catch {
      /* c8 ignore next */
      // best-effort — we are already cleaning up
    }
  }
}

export async function acquireTracks(opts: AcquireOptions): Promise<AcquiredTracks> {
  const { mode, includeMic = true } = opts;

  if (mode === 'cam-only') {
    let camStream: MediaStream;
    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: CAM_SQUARE_VIDEO,
        audio: true,
      });
    } catch (err) {
      throw mapDomException(err, 'camera');
    }
    const camera = camStream.getVideoTracks()[0];
    const mic = camStream.getAudioTracks()[0];
    const all = [camera, mic].filter((t): t is MediaStreamTrack => t !== undefined);
    return { screen: undefined, camera, mic, all };
  }

  let screenStream: MediaStream;
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: DISPLAY_VIDEO,
      audio: false,
    });
  } catch (err) {
    throw mapDomException(err, 'screen');
  }
  const screen = screenStream.getVideoTracks()[0];

  if (mode === 'screen+cursor') {
    if (!includeMic) {
      const all = [screen].filter((t): t is MediaStreamTrack => t !== undefined);
      return { screen, camera: undefined, mic: undefined, all };
    }
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      stopAll(screen);
      throw mapDomException(err, 'mic');
    }
    const mic = micStream.getAudioTracks()[0];
    const all = [screen, mic].filter((t): t is MediaStreamTrack => t !== undefined);
    return { screen, camera: undefined, mic, all };
  }

  // mode === 'screen+cam+cursor'
  let camStream: MediaStream;
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: CAM_PIP_VIDEO,
      audio: true,
    });
  } catch (err) {
    stopAll(screen);
    throw mapDomException(err, 'camera');
  }
  const camera = camStream.getVideoTracks()[0];
  const mic = camStream.getAudioTracks()[0];
  const all = [screen, camera, mic].filter((t): t is MediaStreamTrack => t !== undefined);
  return { screen, camera, mic, all };
}
