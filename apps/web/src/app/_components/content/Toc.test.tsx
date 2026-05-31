import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Toc } from './Toc';

describe('Toc', () => {
  it('renders anchor links to heading ids', () => {
    render(<Toc headings={[{ id: 'setup', text: 'Setup', level: 2 }]} />);
    expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute('href', '#setup');
  });

  it('renders multiple headings in order', () => {
    render(
      <Toc
        headings={[
          { id: 'intro', text: 'Introduction', level: 2 },
          { id: 'detail', text: 'Detail', level: 3 },
        ]}
      />,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '#intro');
    expect(links[1]).toHaveAttribute('href', '#detail');
  });

  it('renders an empty nav gracefully with no headings', () => {
    const { container } = render(<Toc headings={[]} />);
    expect(container.querySelector('nav')).toBeTruthy();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('renders a nav landmark', () => {
    render(<Toc headings={[{ id: 'x', text: 'X', level: 2 }]} />);
    expect(screen.getByRole('navigation')).toBeTruthy();
  });
});
