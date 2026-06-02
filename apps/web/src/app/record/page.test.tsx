import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecordPage from './page';

// Stub the Studio — a heavy client component that requires media APIs. The
// page test focuses on the JSON-LD layer, not the recording UI.
vi.mock('./_components/Studio', () => ({
  Studio: () => <div data-testid="studio-stub" />,
}));

describe('RecordPage (/record)', () => {
  it('renders WebApplication JSON-LD with the correct @type', () => {
    render(<RecordPage />);
    const scripts = document
      .querySelectorAll('script[type="application/ld+json"]')
      // The JsonLd component serialises an array so look for the one that
      // contains a WebApplication entry.
      .values();

    let foundWebApp = false;
    for (const script of scripts) {
      const data: unknown = JSON.parse(script.textContent ?? '[]');
      const items = Array.isArray(data) ? data : [data];
      if (
        items.some(
          (item) =>
            typeof item === 'object' &&
            item !== null &&
            (item as Record<string, unknown>)['@type'] === 'WebApplication',
        )
      ) {
        foundWebApp = true;
        break;
      }
    }

    expect(foundWebApp).toBe(true);
  });

  it('renders BreadcrumbList JSON-LD with the /record crumb', () => {
    render(<RecordPage />);
    const scripts = document.querySelectorAll('script[type="application/ld+json"]').values();

    let studioName: string | undefined;
    for (const script of scripts) {
      const data: unknown = JSON.parse(script.textContent ?? '[]');
      const items = Array.isArray(data) ? data : [data];
      const breadcrumb = items.find(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          (item as Record<string, unknown>)['@type'] === 'BreadcrumbList',
      ) as Record<string, unknown> | undefined;

      if (breadcrumb) {
        const elements = breadcrumb['itemListElement'] as Array<Record<string, unknown>>;
        const recordCrumb = elements.find((el) => String(el['item'] ?? '').includes('/record'));
        studioName = recordCrumb?.['name'] as string | undefined;
        break;
      }
    }

    expect(studioName).toBe('The studio');
  });

  it('renders the studio stub', () => {
    render(<RecordPage />);
    expect(screen.getByTestId('studio-stub')).toBeInTheDocument();
  });
});
