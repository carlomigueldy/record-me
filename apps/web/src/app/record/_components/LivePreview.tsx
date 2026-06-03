'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

export interface LivePreviewProps {
  stream: MediaStream | null;
  /**
   * Composite aspect ratio (width / height). Gives the surface a DEFINITE height
   * (via aspect-ratio) so the `h-full` <video> resolves correctly instead of
   * falling back to its intrinsic height and overflowing the box — which would
   * both mis-measure the overlay and spill the video over the footer controls
   * (covering the Stop button). Defaults to 16/9.
   */
  aspect?: number;
  /** Ref to the surface box (for an overlay to measure the letterboxed content). */
  surfaceRef?: RefObject<HTMLDivElement | null>;
  /** Overlay rendered above the video (e.g. the camera-bubble control). */
  children?: ReactNode;
}

export function LivePreview({ stream, aspect = 16 / 9, surfaceRef, children }: LivePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.srcObject = stream;
    return () => {
      if (el) el.srcObject = null;
    };
  }, [stream]);

  return (
    <div
      ref={surfaceRef}
      className="relative mx-auto max-h-[70dvh] w-full overflow-hidden bg-bg"
      style={{ aspectRatio: aspect }}
    >
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
