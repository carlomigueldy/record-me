import type { Metadata } from 'next';
import { TransitionLink } from '@/components/TransitionLink';
import { JsonLd } from '@/lib/seo/JsonLd';
import { faqPageLd, breadcrumbLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { allDocs, docsBySection, dedupeFaq } from '@/lib/content/registry';
import { DocsSidebar } from '@/app/_components/content/DocsSidebar';

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: 'Documentation',
    description:
      'Guides and reference for record me — permissions, codecs, browser support, and troubleshooting.',
    path: '/docs',
  });
}

/**
 * DocsIndexPage — /docs
 *
 * Section-grouped doc links + a visible FAQ block (deduped, mirrors FAQPage JSON-LD).
 * Layout: DocsSidebar left (220px) | main content right.
 */
export default function DocsIndexPage() {
  const docs = allDocs();
  const sections = docsBySection();
  const faqs = dedupeFaq(docs.flatMap((d) => d.faq ?? []));

  return (
    <>
      <JsonLd data={[faqPageLd(faqs), breadcrumbLd([{ name: 'Docs', path: '/docs' }])]} />

      <div
        style={{
          display: 'flex',
          gap: '48px',
          paddingTop: '48px',
          alignItems: 'flex-start',
        }}
      >
        {/* Sidebar */}
        <aside style={{ flexShrink: 0 }}>
          <DocsSidebar docs={docs} activeSlug={null} />
        </aside>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0 }}>
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
            Documentation
          </p>

          {/* Headline */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              fontSize: 'clamp(28px, 4vw, 44px)',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              color: 'var(--ivory)',
              margin: '0 0 12px',
            }}
          >
            record me docs
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '16px',
              lineHeight: 1.6,
              color: 'var(--ivory-dim)',
              margin: '0 0 48px',
              maxWidth: '52ch',
            }}
          >
            Guides and reference for browser-native recording — getting started, permissions, codec
            output, and browser compatibility.
          </p>

          {/* Section groups */}
          {Object.entries(sections).map(([section, sectionDocs]) => (
            <section key={section} style={{ marginBottom: '40px' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--ivory-mut)',
                  margin: '0 0 12px',
                }}
              >
                {section}
              </h2>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {sectionDocs.map((doc) => (
                  <li key={doc.slug.join('-')}>
                    <TransitionLink
                      href={`/docs/${doc.slug.join('/')}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        style={{
                          padding: '12px 16px',
                          border: '1px solid var(--line)',
                          borderRadius: '8px',
                          background: 'var(--surface)',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '15px',
                            fontWeight: 500,
                            color: 'var(--ivory)',
                            marginBottom: '4px',
                          }}
                        >
                          {doc.title}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '13px',
                            color: 'var(--ivory-dim)',
                          }}
                        >
                          {doc.description}
                        </div>
                      </div>
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* Visible FAQ block — mirrors the FAQPage JSON-LD exactly */}
          {faqs.length > 0 && (
            <section
              aria-label="Frequently asked questions"
              style={{
                marginTop: '60px',
                paddingTop: '40px',
                borderTop: '1px solid var(--line)',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 400,
                  fontSize: '24px',
                  color: 'var(--ivory)',
                  margin: '0 0 28px',
                }}
              >
                Common questions
              </h2>
              <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {faqs.map((faq, i) => (
                  <div
                    key={i}
                    style={{
                      paddingBottom: '24px',
                      borderBottom: i < faqs.length - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <dt
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '15px',
                        fontWeight: 500,
                        color: 'var(--ivory)',
                        margin: '0 0 8px',
                      }}
                    >
                      {faq.question}
                    </dt>
                    <dd
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '14px',
                        lineHeight: 1.65,
                        color: 'var(--ivory-dim)',
                        margin: 0,
                      }}
                    >
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
