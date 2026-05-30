import { siteConfig } from '@/lib/seo/site-config';
import { softwareApplicationLd, webApplicationLd } from '@/lib/seo/json-ld';
import { JsonLd } from '@/lib/seo/JsonLd';
import { buildMetadata } from '@/lib/seo/metadata';
import { LandingNav } from './_components/landing/LandingNav';
import { Hero } from './_components/landing/Hero';
import { ModesSection } from './_components/landing/ModesSection';
import { StudioSection } from './_components/landing/StudioSection';
import { FieldNotesTicker } from './_components/landing/FieldNotesTicker';
import { LandingFooter } from './_components/landing/LandingFooter';

export const metadata = buildMetadata({
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  path: '/',
});

export default function HomePage() {
  return (
    <>
      {/* Structured data: SoftwareApplication + WebApplication */}
      <JsonLd data={[softwareApplicationLd(), webApplicationLd()]} />

      <div
        style={{
          position: 'relative',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '24px 36px 72px',
        }}
      >
        <LandingNav />
        <Hero />
        <ModesSection />
        <StudioSection />
        <FieldNotesTicker />
        <LandingFooter />
      </div>
    </>
  );
}
