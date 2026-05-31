import type { RecordMode } from '@record-me/recorder';

// PINNED — URL slug → engine RecordMode. The off-by-one this map prevents:
// 'camera-only' (URL) maps to 'cam-only' (engine), NOT 'camera-only'.
export const FEATURE_SLUG_TO_MODE = {
  'screen-camera-cursor': 'screen+cam+cursor',
  'screen-cursor': 'screen+cursor',
  'camera-only': 'cam-only',
} as const satisfies Record<string, RecordMode>;

export type FeatureSlug = keyof typeof FEATURE_SLUG_TO_MODE;
export const FEATURE_SLUGS = Object.keys(FEATURE_SLUG_TO_MODE) as FeatureSlug[];

// Fixed static import map for the 3 colocated bodies (statically analyzable
// by webpack — no dynamic import, no interpolated path). Keyed by FeatureSlug.
// In Vitest these are stubbed via moduleNameMapper ('.mdx$' → mdx-stub.tsx)
// since MDX compilation is a build-time (Next.js + webpack) concern.
import ScreenCameraCursor from '@/app/features/[mode]/_content/screen-camera-cursor.mdx';
import ScreenCursor from '@/app/features/[mode]/_content/screen-cursor.mdx';
import CameraOnly from '@/app/features/[mode]/_content/camera-only.mdx';

export const FEATURE_BODY: Record<FeatureSlug, typeof ScreenCameraCursor> = {
  'screen-camera-cursor': ScreenCameraCursor,
  'screen-cursor': ScreenCursor,
  'camera-only': CameraOnly,
};
