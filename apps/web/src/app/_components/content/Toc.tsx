export interface TocHeading {
  id: string;
  text: string;
  /** Heading level: 2 (h2) or 3 (h3). Deeper levels collapsed to 3. */
  level: 2 | 3 | 4 | 5 | 6;
}

interface TocProps {
  headings: TocHeading[];
}

/**
 * Toc — static on-page table of contents (RSC, no scroll-spy in v1).
 *
 * Renders anchor links to heading ids injected by rehype-slug. Reserved
 * dimensions (`minHeight: 100px`, `minWidth: 200px`) prevent CLS when the
 * sticky aside snaps closed on sparse pages. No client JS — the active heading
 * is not tracked (deferred to post-v1 scroll-spy enhancement).
 */
export function Toc({ headings }: TocProps) {
  return (
    <nav
      aria-label="On this page"
      style={{
        minWidth: '200px',
        minHeight: '100px',
        position: 'sticky',
        top: '24px',
        alignSelf: 'flex-start',
      }}
    >
      {headings.length > 0 && (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ivory-mut)',
            margin: '0 0 12px',
          }}
        >
          Contents
        </p>
      )}
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {headings.map((h) => (
          <li
            key={h.id}
            style={{
              paddingLeft: h.level > 2 ? `${(h.level - 2) * 12}px` : '0',
            }}
          >
            <a
              href={`#${h.id}`}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                lineHeight: 1.4,
                color: 'var(--ivory-dim)',
                textDecoration: 'none',
                display: 'block',
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
