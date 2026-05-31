import { TransitionLink } from '@/components/TransitionLink';
import type { DocFrontmatter } from '@/lib/content/schema';

interface DocsSidebarProps {
  docs: DocFrontmatter[];
  /** The active doc slug segments, or null when on the /docs index. */
  activeSlug: string[] | null;
}

/**
 * DocsSidebar — static section-grouped docs navigation (RSC, no client JS).
 *
 * Groups docs by `section`, renders each group with a Geist Mono label.
 * The active slug gets `aria-current="page"` and amber accent styling.
 * Reserved `minWidth: 200px` prevents layout shift on load (CLS ≤ 0.05).
 *
 * No scroll-spy or client interactivity in v1 — defer to post-v1.
 */
export function DocsSidebar({ docs, activeSlug }: DocsSidebarProps) {
  // Group by section, preserving insertion order (docs are pre-sorted by
  // section+order from registry.allDocs).
  const sections = docs.reduce<Record<string, DocFrontmatter[]>>((acc, doc) => {
    (acc[doc.section] ??= []).push(doc);
    return acc;
  }, {});

  const activeKey = activeSlug?.join('-') ?? null;

  return (
    <nav
      aria-label="Documentation"
      style={{
        minWidth: '200px',
        fontFamily: 'var(--font-sans)',
        fontSize: '14px',
      }}
    >
      {Object.entries(sections).map(([section, sectionDocs]) => (
        <div key={section}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ivory-mut)',
              margin: '24px 0 8px',
            }}
          >
            {section}
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {sectionDocs.map((doc) => {
              const isActive = doc.slug.join('-') === activeKey;
              return (
                <li key={doc.slug.join('-')}>
                  <TransitionLink
                    href={`/docs/${doc.slug.join('/')}`}
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                      display: 'block',
                      padding: '4px 0 4px 10px',
                      color: isActive ? 'var(--amber)' : 'var(--ivory-dim)',
                      borderLeft: isActive ? '2px solid var(--amber)' : '2px solid transparent',
                      textDecoration: 'none',
                      lineHeight: 1.45,
                    }}
                  >
                    {doc.title}
                  </TransitionLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
