import { probeCapabilities, type CapabilityReport, type RecordMode } from '@record-me/recorder';

export interface StudioCapabilities extends CapabilityReport {
  /** True if the browser can record at least one mode. */
  supported: boolean;
  /** Modes selectable on this device, in A → B → C order. */
  availableModes: RecordMode[];
}

export function deriveStudioCapabilities(report: CapabilityReport): StudioCapabilities {
  const supported =
    report.hasMediaRecorder && report.hasGetUserMedia && Boolean(report.supportedMimeType);
  const screenCapable = report.hasGetDisplayMedia && !report.isMobile;
  const availableModes: RecordMode[] = [];
  if (screenCapable) availableModes.push('screen+cam+cursor', 'screen+cursor');
  if (report.hasGetUserMedia) availableModes.push('cam-only');
  return { ...report, supported, availableModes };
}

export function browserName(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome|chromium|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Unknown';
}

/** Client-only. Call inside an effect — `probeCapabilities` reads `navigator`. */
export function getStudioCapabilities(): StudioCapabilities {
  return deriveStudioCapabilities(probeCapabilities());
}
