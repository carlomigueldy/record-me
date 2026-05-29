'use client';

import { useEffect, useRef } from 'react';

export interface LivePreviewProps {
  stream: MediaStream | null;
}

export function LivePreview({ stream }: LivePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.srcObject = stream;
    return () => {
      if (el) el.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      muted
      autoPlay
      playsInline
      aria-label="Live recording preview"
      className="h-full max-h-[70dvh] w-full bg-bg object-contain"
    />
  );
}
