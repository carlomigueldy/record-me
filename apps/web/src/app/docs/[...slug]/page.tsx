import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { JsonLd } from '@/lib/seo/JsonLd';
import { breadcrumbLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { Prose } from '@/app/_components/content/Prose';
import { Toc } from '@/app/_components/content/Toc';
import { Breadcrumbs } from '@/app/_components/content/Breadcrumbs';
import { DocsSidebar } from '@/app/_components/content/DocsSidebar';
import { TransitionLink } from '@/components/TransitionLink';
import { getAllDocSlugs, getDocFrontmatter, getDocHeadings } from '@/lib/content/loader';
import { allDocs, prevNext } from '@/lib/content/registry';
import { DOC_BODY, type DocBodyKey } from '@/lib/content/doc-bodies';

// Unknown slugs → hard 404 (prerendered static HTML only).
export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const key = slug.join('-');
  const known = getAllDocSlugs().some((s) => s.join('-') === key);
  if (!known) return {};
  const fm = getDocFrontmatter(slug);
  return buildMetadata({
    title: fm.title,
    description: fm.description,
    path: `/docs/${slug.join('/')}`,
  });
}

/**
 * DocPage — static RSC for /docs/[...slug].
 *
 * Layout: DocsSidebar (220px) | Breadcrumbs + h1 + Prose<Body/> + prev/next | Toc aside (200px)
 *
 * Double-guarded body lookup:
 * 1. allow-list guard: validate slug against getAllDocSlugs() → notFound() on miss
 * 2. parity guard: check DOC_BODY has the key → notFound() if author forgot to
 *    add to the static map (caught at test time by the parity test)
 */
export default async function DocPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;

  // MINOR 1 — self-sufficient segment-count guard: v1 slugs are single-segment.
  // This is defense-in-depth — in production dynamicParams=false handles unknown
  // slugs at the router level, but in dev the catch-all could alias a multi-
  // segment path (e.g. /docs/getting/started) to the flat key "getting-started".
  // The guard makes the allow-list self-sufficient without relying on the router.
  if (slug.length !== 1) notFound();

  const key = slug.join('-');

  // Allow-list guard — validate against the fs-driven allow-list.
  const known = getAllDocSlugs().some((s) => s.join('-') === key);
  if (!known) notFound();

  // Parity guard — on disk but missing from DOC_BODY (caught at test time).
  const Body = DOC_BODY[key as DocBodyKey];
  if (!Body) notFound();

  const fm = getDocFrontmatter(slug);
  const docs = allDocs();
  const nav = prevNext(slug);
  const path = `/docs/${slug.join('/')}`;

  // MAJOR — extract h2/h3 headings from the raw MDX body using github-slugger
  // (same algorithm as rehype-slug) so TOC anchor ids match rendered heading ids.
  // Server-side regex parse of the source MDX — no compiled output needed.
  const headings = getDocHeadings(slug);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Docs', path: '/docs' },
            { name: fm.title, path },
          ]),
        ]}
      />

      {/* Three-column layout */}
      <div
        style={{
          display: 'flex',
          gap: '48px',
          paddingTop: '48px',
          alignItems: 'flex-start',
        }}
      >
        {/* Left: sidebar */}
        <aside style={{ flexShrink: 0 }}>
          <DocsSidebar docs={docs} activeSlug={slug} />
        </aside>

        {/* Center: article */}
        <main style={{ flex: 1, minWidth: 0, maxWidth: '72ch' }}>
          {/* Breadcrumbs */}
          <div style={{ marginBottom: '32px' }}>
            <Breadcrumbs
              items={[
                { name: 'Docs', href: '/docs' },
                { name: fm.title, href: path },
              ]}
            />
          </div>

          {/* Page title */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              fontSize: 'clamp(26px, 4vw, 40px)',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              color: 'var(--ivory)',
              margin: '0 0 12px',
            }}
          >
            {fm.title}
          </h1>

          {/* Description */}
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '16px',
              lineHeight: 1.6,
              color: 'var(--ivory-dim)',
              margin: '0 0 40px',
            }}
          >
            {fm.description}
          </p>

          {/* MDX body */}
          <Prose>
            <Body />
          </Prose>

          {/* Prev / Next navigation */}
          {(nav.prev || nav.next) && (
            <nav
              aria-label="Doc pagination"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '64px',
                paddingTop: '24px',
                borderTop: '1px solid var(--line)',
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
              }}
            >
              {nav.prev ? (
                <TransitionLink
                  href={`/docs/${nav.prev.slug.join('/')}`}
                  style={{ color: 'var(--ivory-dim)', textDecoration: 'none' }}
                >
                  ← {nav.prev.title}
                </TransitionLink>
              ) : (
                <span />
              )}
              {nav.next && (
                <TransitionLink
                  href={`/docs/${nav.next.slug.join('/')}`}
                  style={{ color: 'var(--ivory-dim)', textDecoration: 'none' }}
                >
                  {nav.next.title} →
                </TransitionLink>
              )}
            </nav>
          )}
        </main>

        {/* Right: TOC */}
        <aside
          style={{
            flexShrink: 0,
            display: 'none', // hidden on narrow viewports; shown via CSS in a real impl
          }}
          className="docs-toc"
        >
          <style>{`@media (min-width: 1100px) { .docs-toc { display: block !important; } }`}</style>
          <Toc headings={headings} />
        </aside>
      </div>
    </>
  );
}
