import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Prose } from './Prose';

describe('Prose', () => {
  it('renders children inside a prose container', () => {
    render(
      <Prose>
        <p>Hello from prose</p>
      </Prose>,
    );
    expect(screen.getByText('Hello from prose')).toBeTruthy();
  });

  it('accepts an additional className prop', () => {
    const { container } = render(<Prose className="test-class">content</Prose>);
    expect(container.firstChild).toHaveClass('test-class');
  });

  it('renders as an article element by default', () => {
    const { container } = render(<Prose>content</Prose>);
    expect(container.firstChild?.nodeName).toBe('ARTICLE');
  });
});
