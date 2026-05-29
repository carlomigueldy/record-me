'use client';

export interface ReviewPaneProps {
  url: string;
}

export function ReviewPane({ url }: ReviewPaneProps) {
  return (
    <video
      src={url}
      controls
      aria-label="Recorded video preview"
      className="h-full max-h-[70dvh] w-full bg-bg object-contain"
    />
  );
}
