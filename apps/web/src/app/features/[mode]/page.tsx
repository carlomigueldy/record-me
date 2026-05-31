import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { JsonLd } from '@/lib/seo/JsonLd';
import { howToLd, breadcrumbLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { Prose } from '@/app/_components/content/Prose';
import { TransitionLink } from '@/components/TransitionLink';
import { FEATURE_SLUGS, FEATURE_BODY, type FeatureSlug } from '@/lib/content/features';
import { getModeFrontmatter } from '@/lib/content/loader';

// Unknown slugs → hard 404 in production (prerendered static HTML only).
export const dynamicParams = false;

export async function generateStaticParams() {
  return FEATURE_SLUGS.map((mode) => ({ mode }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mode: string }>;
}): Promise<Metadata> {
  const { mode } = await params;
  if (!FEATURE_SLUGS.includes(mode as FeatureSlug)) return {};
  const fm = getModeFrontmatter(mode as FeatureSlug);
  // Pass the bare § 8.2 segment — the root title.template appends ' — record me'.
  return buildMetadata({
    title: fm.title,
    description: fm.deck,
    path: `/features/${mode}`,
  });
}

/**
 * FeaturePage — static RSC for /features/[mode].
 *
 * Composition (top → bottom):
 * 1. JSON-LD: HowTo + BreadcrumbList
 * 2. Eyebrow (§ Mode X)
 * 3. H1 — Instrument Serif, large display
 * 4. Deck — Geist body, var(--ivory-dim)
 * 5. Prose<Body /> — MDX body via @next/mdx root file convention
 * 6. Cross-links — /record + related /docs/*
 */
export default async function FeaturePage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!FEATURE_SLUGS.includes(mode as FeatureSlug)) notFound();

  const slug = mode as FeatureSlug;
  const fm = getModeFrontmatter(slug);
  const Body = FEATURE_BODY[slug];

  return (
    <>
      {/* Structured data */}
      <JsonLd
        data={[
          howToLd({ name: fm.title, description: fm.deck, step: fm.howToSteps }),
          breadcrumbLd([
            { name: 'Features', path: '/features' },
            { name: fm.title, path: `/features/${slug}` },
          ]),
        ]}
      />

      <article style={{ paddingTop: '60px', paddingBottom: '80px' }}>
        {/* Eyebrow */}
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ivory-mut)',
            margin: '0 0 20px',
          }}
        >
          {fm.eyebrow}
        </p>

        {/* Headline */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: 'clamp(36px, 6vw, 64px)',
            lineHeight: 1.1,
            letterSpacing: '-0.015em',
            color: 'var(--ivory)',
            margin: '0 0 24px',
            maxWidth: '20ch',
          }}
        >
          {fm.title}
        </h1>

        {/* Deck */}
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '18px',
            lineHeight: 1.6,
            color: 'var(--ivory-dim)',
            margin: '0 0 56px',
            maxWidth: '56ch',
          }}
        >
          {fm.deck}
        </p>

        {/* MDX body — root mdx-components.tsx applies the element map */}
        <Prose>
          <Body />
        </Prose>

        {/* Cross-links */}
        <div
          style={{
            marginTop: '64px',
            paddingTop: '32px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          <TransitionLink
            href="/record"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--amber)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Open the Studio →
          </TransitionLink>
          {fm.related.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
              }}
            >
              <span style={{ color: 'var(--ivory-mut)' }}>Related docs:</span>
              {fm.related.map((docSlug) => (
                <TransitionLink
                  key={docSlug}
                  href={`/docs/${docSlug}`}
                  style={{ color: 'var(--ivory-dim)', textDecoration: 'none' }}
                >
                  {docSlug}
                </TransitionLink>
              ))}
            </div>
          )}
        </div>
      </article>
    </>
  );
}
