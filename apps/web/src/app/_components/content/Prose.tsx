import type { ReactNode } from 'react';
import { cn } from '@record-me/ui';

interface ProseProps {
  children: ReactNode;
  className?: string;
}

/**
 * Prose — a token-based wrapper for MDX body content.
 *
 * Applies the Twilight surface container and constrains the reading column
 * to a comfortable measure (~72ch). The element map in `mdx-components.tsx`
 * handles individual element styling; this wrapper provides:
 *
 * - Max-width reading column (constrained for legibility)
 * - `font-sans` base (Geist) so browser fallback text is never unstyled
 * - `color: var(--ivory-dim)` body default with headings overriding per-element
 * - Renders as `<article>` for semantic correctness on long-form content routes
 *
 * The code-block WRAPPER (`pre`/`figure[data-rehype-pretty-code-figure]`)
 * styling lives in `globals.css` — scoped to rehype's data-attribute selector
 * so it only targets build-time highlighted blocks, not arbitrary `<pre>` tags.
 */
export function Prose({ children, className }: ProseProps) {
  return (
    <article
      className={cn('prose-content', className)}
      style={{
        fontFamily: 'var(--font-sans)',
        color: 'var(--ivory-dim)',
        maxWidth: '72ch',
        width: '100%',
        // Clearfix: ensures floated images don't overflow the container.
        overflow: 'hidden',
      }}
    >
      {children}
    </article>
  );
}
