import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ComponentProps } from 'react';
import { useMDXComponents } from './mdx-components';

// The MDXComponents type is a union that includes non-callable entries.
// Cast individual entries to their expected component type for JSX.
type AProps = ComponentProps<'a'>;
type HeadingProps = ComponentProps<'h2'>;
type PProps = ComponentProps<'p'>;

describe('useMDXComponents', () => {
  const map = useMDXComponents({});
  const A = map.a as React.FC<AProps>;
  const H2 = map.h2 as React.FC<HeadingProps>;
  const H3 = map.h3 as React.FC<HeadingProps>;
  const P = map.p as React.FC<PProps>;

  it('renders an internal link through TransitionLink (real anchor)', () => {
    render(<A href="/docs/permissions">Permissions</A>);
    const link = screen.getByRole('link', { name: 'Permissions' });
    expect(link).toHaveAttribute('href', '/docs/permissions');
  });

  it('renders an external link with target=_blank and rel=noreferrer', () => {
    render(<A href="https://example.com">Example</A>);
    const link = screen.getByRole('link', { name: 'Example' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('maps h2 to a branded heading that preserves the id', () => {
    render(<H2 id="setup">Setup</H2>);
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'setup');
  });

  it('maps h3 to a branded heading that preserves the id', () => {
    render(<H3 id="step-one">Step one</H3>);
    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('id', 'step-one');
  });

  it('renders a paragraph with the p element', () => {
    render(<P>Hello world</P>);
    expect(screen.getByText('Hello world').tagName).toBe('P');
  });

  it('renders anchor-link for hash hrefs (internal)', () => {
    render(<A href="#section">Jump</A>);
    const link = screen.getByRole('link', { name: 'Jump' });
    expect(link).toHaveAttribute('href', '#section');
  });

  // MINOR: protocol-relative URLs (//example.com) start with / but are external.
  // They must NOT be routed through TransitionLink — verify they get _blank/noreferrer.
  it('treats protocol-relative URLs as external (not internal)', () => {
    render(<A href="//example.com">Proto-relative</A>);
    const link = screen.getByRole('link', { name: 'Proto-relative' });
    expect(link).toHaveAttribute('href', '//example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  // MINOR: rel/target override — caller-spread props must not override safety attrs.
  it('safety attrs (target, rel) cannot be overridden by caller-spread props', () => {
    // Pass a rel/target via rest props — the component should still emit the
    // fixed safety values because they are placed AFTER {...rest}.
    render(
      <A href="https://attacker.com" {...({ target: '_self', rel: 'opener' } as AProps)}>
        Unsafe
      </A>,
    );
    const link = screen.getByRole('link', { name: 'Unsafe' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });
});
