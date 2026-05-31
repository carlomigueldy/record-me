import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import { TransitionLink } from '@/components/TransitionLink';

// Prose heading styles — Instrument Serif for h1–h3, Geist for h4–h6.
// Applied via inline style so the element map is self-contained: consuming
// layouts don't need a shared Tailwind class prefix and there is no concern
// about class-name purging in the MDX route bundle.

const headingBase: React.CSSProperties = {
  margin: '0 0 0.5em',
  lineHeight: 1.18,
  letterSpacing: '-0.01em',
  color: 'var(--ivory)',
};

const serifHeading: React.CSSProperties = {
  ...headingBase,
  fontFamily: 'var(--font-serif)',
  fontWeight: 400,
};

const sansHeading: React.CSSProperties = {
  ...headingBase,
  fontFamily: 'var(--font-sans)',
  fontWeight: 500,
  color: 'var(--ivory-dim)',
};

/**
 * useMDXComponents — the brand seam for the Next.js App Router MDX pipeline.
 *
 * The root `mdx-components.tsx` file is required by `@next/mdx` and applied at
 * compile time (not a runtime `MDXProvider`). Every `.mdx` route in the app
 * inherits these mappings automatically.
 *
 * Design decisions:
 * - Internal hrefs (starts with `/` or `#`) → TransitionLink for view-transition.
 * - External hrefs → plain <a> with `target="_blank" rel="noreferrer"` (security).
 * - `img` → `next/image` with explicit dimensions (CLS-safe: avoids layout shift).
 * - `code`/`pre` wrappers are left structurally intact so rehype-pretty-code's
 *   resolved inline `style="color:#…"` per-token output (single github-dark-default
 *   theme) is preserved. The code-block WRAPPER styling lives in globals.css.
 * - No raw hex values — CSS variables only. The exception is Shiki's build-time
 *   per-token inline `style="color:#…"`, which is a documented build boundary
 *   equivalent to the _og/template.tsx font path.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // ── Links ──────────────────────────────────────────────────────────────
    a: ({ href = '', children, ...rest }) => {
      // Protocol-relative URLs (`//example.com`) start with `/` but are NOT
      // internal — they must be excluded from the TransitionLink branch. The
      // `!href.startsWith('//')` guard prevents them from being mis-classified.
      const internal = (href.startsWith('/') && !href.startsWith('//')) || href.startsWith('#');
      return internal ? (
        <TransitionLink
          href={href}
          style={{ color: 'var(--amber)', textDecorationColor: 'var(--amber)' }}
          {...rest}
        >
          {children}
        </TransitionLink>
      ) : (
        // `{...rest}` BEFORE the safety attrs so callers cannot override them.
        <a
          href={href}
          style={{ color: 'var(--amber)', textDecorationColor: 'var(--amber)' }}
          {...rest}
          target="_blank"
          rel="noreferrer"
        >
          {children}
        </a>
      );
    },

    // ── Images ─────────────────────────────────────────────────────────────
    // Explicit width/height avoids CLS. MDX authors should supply {width}{height}
    // props in the image alt syntax; fallback to 1200×675 (16:9) when absent.
    img: ({ src = '', alt = '', width, height }) => (
      <Image
        src={src}
        alt={alt}
        width={Number(width) || 1200}
        height={Number(height) || 675}
        style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
      />
    ),

    // ── Headings ───────────────────────────────────────────────────────────
    // rehype-slug injects `id` attributes; we forward all props to preserve them.
    h1: ({ children, ...rest }) => (
      <h1
        style={{ ...serifHeading, fontSize: 'clamp(28px, 5vw, 40px)', marginTop: '1.5em' }}
        {...rest}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...rest }) => (
      <h2
        style={{ ...serifHeading, fontSize: 'clamp(22px, 3.5vw, 30px)', marginTop: '2em' }}
        {...rest}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...rest }) => (
      <h3 style={{ ...serifHeading, fontSize: '20px', marginTop: '1.75em' }} {...rest}>
        {children}
      </h3>
    ),
    h4: ({ children, ...rest }) => (
      <h4 style={{ ...sansHeading, fontSize: '16px', marginTop: '1.5em' }} {...rest}>
        {children}
      </h4>
    ),
    h5: ({ children, ...rest }) => (
      <h5 style={{ ...sansHeading, fontSize: '14px', marginTop: '1.25em' }} {...rest}>
        {children}
      </h5>
    ),
    h6: ({ children, ...rest }) => (
      <h6 style={{ ...sansHeading, fontSize: '13px', marginTop: '1.25em' }} {...rest}>
        {children}
      </h6>
    ),

    // ── Body text ──────────────────────────────────────────────────────────
    p: ({ children, ...rest }) => (
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '16px',
          lineHeight: 1.7,
          color: 'var(--ivory-dim)',
          margin: '0 0 1em',
        }}
        {...rest}
      >
        {children}
      </p>
    ),

    // ── Lists ──────────────────────────────────────────────────────────────
    ul: ({ children, ...rest }) => (
      <ul
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '16px',
          lineHeight: 1.65,
          color: 'var(--ivory-dim)',
          paddingLeft: '1.5em',
          margin: '0 0 1em',
          listStyleType: 'disc',
        }}
        {...rest}
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...rest }) => (
      <ol
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '16px',
          lineHeight: 1.65,
          color: 'var(--ivory-dim)',
          paddingLeft: '1.5em',
          margin: '0 0 1em',
          listStyleType: 'decimal',
        }}
        {...rest}
      >
        {children}
      </ol>
    ),
    li: ({ children, ...rest }) => (
      <li style={{ marginBottom: '8px' }} {...rest}>
        {children}
      </li>
    ),

    // ── Blockquote ─────────────────────────────────────────────────────────
    blockquote: ({ children, ...rest }) => (
      <blockquote
        style={{
          borderLeft: '2px solid var(--amber)',
          paddingLeft: '1.25em',
          margin: '1.5em 0',
          fontStyle: 'italic',
          color: 'var(--ivory-mut)',
          fontFamily: 'var(--font-sans)',
        }}
        {...rest}
      >
        {children}
      </blockquote>
    ),

    // ── Inline code ────────────────────────────────────────────────────────
    // rehype-pretty-code adds a `data-language` attribute to the <code> element
    // inside fenced code blocks. Those block <code> nodes must pass through
    // unstyled so Shiki's resolved inline `style="color:#…"` per-token output
    // (single github-dark-default theme) is preserved intact. Only bare inline
    // backtick spans — which have no `data-language` — receive the surface badge
    // styling below. Font size 0.875em → ~11.4px at the 13px body base.
    code: ({ children, ...rest }) => {
      const isBlock = 'data-language' in rest;
      if (isBlock) {
        // Block code — let rehype-pretty-code's output pass through unmodified.
        return <code {...rest}>{children}</code>;
      }
      return (
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875em',
            color: 'var(--ivory-mut)',
            background: 'var(--surface)',
            borderRadius: '3px',
            padding: '2px 5px',
          }}
          {...rest}
        >
          {children}
        </code>
      );
    },

    // ── Divider ────────────────────────────────────────────────────────────
    hr: (rest) => (
      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--line)',
          margin: '2.5em 0',
        }}
        {...rest}
      />
    ),

    // ── Table ──────────────────────────────────────────────────────────────
    table: ({ children, ...rest }) => (
      <div style={{ overflowX: 'auto', margin: '1.5em 0' }}>
        <table
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            borderCollapse: 'collapse',
            width: '100%',
            color: 'var(--ivory-dim)',
          }}
          {...rest}
        >
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...rest }) => (
      <th
        style={{
          fontWeight: 600,
          color: 'var(--ivory)',
          textAlign: 'left',
          padding: '8px 12px',
          borderBottom: '1px solid var(--line)',
          fontFamily: 'var(--font-sans)',
        }}
        {...rest}
      >
        {children}
      </th>
    ),
    td: ({ children, ...rest }) => (
      <td
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--line-soft)',
        }}
        {...rest}
      >
        {children}
      </td>
    ),

    // Caller-provided overrides take precedence (spread last).
    ...components,
  };
}
