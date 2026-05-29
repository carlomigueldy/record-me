export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatMegabytes(bytes: number): string {
  return `${(Math.max(0, bytes) / 1_000_000).toFixed(1)} MB`;
}

export function capMinutesToMs(minutes: number): number {
  return minutes * 60_000;
}
