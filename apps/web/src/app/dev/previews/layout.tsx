import type { Metadata } from 'next';

// /dev/* is already 404'd in production by /dev/layout.tsx (notFound()
// guard + force-dynamic). The noindex meta below is belt-and-suspenders:
// it covers dev/staging environments and any direct exposure during
// preview-deploy QA. Production safety is inherited from the parent.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// The parent /dev/layout.tsx wraps children in `mx-auto max-w-6xl px-6 py-12`.
// Preview routes need full-bleed canvas for 1440×900 screenshots — a fixed
// overlay is the cleanest App Router escape hatch from inherited layout chrome.
// `z-50` clears anything the parent renders; `overflow-auto` keeps long content
// scrollable for ad-hoc review; `bg-bg` ensures the parent's content is fully
// obscured for clean captures.
export default function PreviewsLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 overflow-auto bg-bg text-ivory">{children}</div>;
}
