// packages/recorder/src/filename.ts
export function extensionForMimeType(mime: string): 'mp4' | 'webm' {
  if (mime.toLowerCase().startsWith('video/mp4')) return 'mp4';
  return 'webm';
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

export function suggestedFilename(at: Date, sequence: number, mimeType: string): string {
  const yyyy = at.getUTCFullYear();
  const mm = pad(at.getUTCMonth() + 1, 2);
  const dd = pad(at.getUTCDate(), 2);
  const seq = pad(sequence, 3);
  const ext = extensionForMimeType(mimeType);
  return `record-me-${yyyy}-${mm}-${dd}-${seq}.${ext}`;
}
