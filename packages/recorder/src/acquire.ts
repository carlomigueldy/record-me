// packages/recorder/src/acquire.ts
import { mapDomException } from './errors';
import type { RecordMode } from './types';

export interface AcquireOptions {
  mode: RecordMode;
  /** Only meaningful for mode 'screen+cursor'. Defaults to true. */
  includeMic?: boolean;
}

export interface AcquiredTracks {
  screen?: MediaStreamTrack;
  camera?: MediaStreamTrack;
  mic?: MediaStreamTrack;
  /** All acquired tracks — caller stops these on cleanup. */
  all: MediaStreamTrack[];
}

// Cursor capture is best-effort per browser; `cursor` isn't in lib.dom's
// MediaTrackConstraints but real browsers honor it as a DisplayMedia extension.
const DISPLAY_VIDEO = {
  cursor: 'always',
} as MediaTrackConstraints;

const CAM_PIP_VIDEO: MediaTrackConstraints = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 30 },
};

const CAM_SQUARE_VIDEO: MediaTrackConstraints = {
  aspectRatio: 1,
  width: { ideal: 720 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
};

function stopAll(...tracks: (MediaStreamTrack | undefined)[]): void {
  for (const t of tracks) {
    try {
      t?.stop();
    } catch {
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
    return {
      ...(camera ? { camera } : {}),
      ...(mic ? { mic } : {}),
      all,
    };
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
      return screen ? { screen, all: [screen] } : { all: [] };
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
    return {
      ...(screen ? { screen } : {}),
      ...(mic ? { mic } : {}),
      all,
    };
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
  return {
    ...(screen ? { screen } : {}),
    ...(camera ? { camera } : {}),
    ...(mic ? { mic } : {}),
    all,
  };
}
