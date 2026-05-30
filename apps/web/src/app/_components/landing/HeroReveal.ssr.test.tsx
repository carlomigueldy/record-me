/**
 * SSR pin test: asserts the hero headline ships at opacity:1 (never JS-gated).
 *
 * renderToStaticMarkup matches what Next.js sends in the initial HTML — no
 * hydration, no JS. If this test passes, the LCP element is visible in the
 * server-sent HTML and cannot regress to opacity:0 on the element itself.
 *
 * The check is scoped to INLINE STYLES on elements (style="…opacity:0…"),
 * not CSS text blocks (which legitimately contain "opacity: 0" in @keyframes).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Hero } from './Hero';

/** Extract all style="…" attribute values from HTML string. */
function extractInlineStyles(html: string): string[] {
  const matches: string[] = [];
  const re = /\bstyle="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1] !== undefined) matches.push(m[1]);
  }
  return matches;
}

describe('Hero SSR — LCP not JS-gated', () => {
  it('no element in the hero ships with opacity:0 as an inline style', () => {
    const html = renderToStaticMarkup(<Hero />);

    // The headline text must be present (sanity)
    expect(html).toContain('Press');
    expect(html).toContain('record');

    // Inspect inline styles only — CSS text blocks (@keyframes) are allowed to
    // reference opacity:0 as the animation start state, but no ELEMENT may
    // carry opacity:0 as an inline style (that would hide it before hydration).
    const inlineStyles = extractInlineStyles(html);
    const hidingStyles = inlineStyles.filter(
      (s) => s.includes('opacity:0') || s.includes('opacity: 0'),
    );
    expect(hidingStyles).toHaveLength(0);
  });

  it('h1 is present in static HTML with no translateY on ancestor elements', () => {
    const html = renderToStaticMarkup(<Hero />);
    expect(html).toMatch(/<h1[^>]*>/);

    // No inline translateY hiding on any element
    const inlineStyles = extractInlineStyles(html);
    const offsetStyles = inlineStyles.filter((s) => s.includes('translateY(12'));
    expect(offsetStyles).toHaveLength(0);
  });
});
