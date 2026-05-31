import { TransitionLink } from '@/components/TransitionLink';

export interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumbs — horizontal trail nav (RSC).
 *
 * The last item is always the current page and is rendered as plain text with
 * `aria-current="page"` (not a link). All preceding items are TransitionLinks
 * for view-transition-aware navigation. Separator is a decorative `/` in
 * `var(--ivory-low)`.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0 4px',
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        lineHeight: 1.4,
      }}
    >
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0',
        }}
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.href} style={{ display: 'flex', alignItems: 'center' }}>
              {isLast ? (
                // Current page — not a link, aria-current for a11y.
                <span aria-current="page" style={{ color: 'var(--ivory)' }}>
                  {item.name}
                </span>
              ) : (
                <TransitionLink
                  href={item.href}
                  style={{
                    color: 'var(--ivory-dim)',
                    textDecoration: 'none',
                  }}
                >
                  {item.name}
                </TransitionLink>
              )}
              {!isLast && (
                <span
                  aria-hidden="true"
                  style={{
                    color: 'var(--ivory-low)',
                    margin: '0 6px',
                    userSelect: 'none',
                  }}
                >
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
