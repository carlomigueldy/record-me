// packages/recorder/src/capabilities.ts
// Spec § 7.4 — MP4-first codec negotiation.

export interface CapabilityReport {
  hasMediaRecorder: boolean;
  hasGetDisplayMedia: boolean;
  hasGetUserMedia: boolean;
  supportedMimeType: string | null;
  isSafari: boolean;
  isMobile: boolean;
}

export const MIME_PREFERENCE = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=h264,aac',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
] as const;

export function supportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const mime of MIME_PREFERENCE) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

export function probeCapabilities(): CapabilityReport {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const ua = nav?.userAgent ?? '';
  return {
    hasMediaRecorder: typeof MediaRecorder !== 'undefined',
    hasGetDisplayMedia: Boolean(nav?.mediaDevices?.getDisplayMedia),
    hasGetUserMedia: Boolean(nav?.mediaDevices?.getUserMedia),
    supportedMimeType: supportedMimeType(),
    isSafari: /^((?!chrome|android).)*safari/i.test(ua),
    isMobile: /Mobi|Android/i.test(ua),
  };
}
