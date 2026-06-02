'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

export interface LivePreviewProps {
  stream: MediaStream | null;
  /** Ref to the surface box (for an overlay to measure the letterboxed content). */
  surfaceRef?: RefObject<HTMLDivElement | null>;
  /** Overlay rendered above the video (e.g. the camera-bubble control). */
  children?: ReactNode;
}

export function LivePreview({ stream, surfaceRef, children }: LivePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.srcObject = stream;
    return () => {
      if (el) el.srcObject = null;
    };
  }, [stream]);

  return (
    <div ref={surfaceRef} className="relative h-full max-h-[70dvh] w-full">
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        aria-label="Live recording preview"
        className="h-full w-full bg-bg object-contain"
      />
      {children}
    </div>
  );
}
