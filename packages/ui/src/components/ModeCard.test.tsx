import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModeCard } from './ModeCard';

describe('ModeCard', () => {
  it('renders eyebrow, title, and description', () => {
    render(
      <ModeCard
        eyebrow="Mode A"
        title="Screen, camera & cursor"
        description="The full recital, with picture-in-picture camera and click highlights."
      />,
    );
    expect(screen.getByText('Mode A')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Screen, camera & cursor' })).toBeInTheDocument();
    expect(
      screen.getByText(/The full recital, with picture-in-picture camera/),
    ).toBeInTheDocument();
  });

  it('renders the stage slot when children are passed', () => {
    render(
      <ModeCard eyebrow="A" title="t" description="d">
        <div data-testid="stage">stage</div>
      </ModeCard>,
    );
    expect(screen.getByTestId('stage')).toBeInTheDocument();
  });

  it('renders a footer slot when provided', () => {
    render(
      <ModeCard
        eyebrow="A"
        title="t"
        description="d"
        footer={<a href="/features/screen-camera-cursor">Learn more</a>}
      />,
    );
    expect(screen.getByRole('link', { name: 'Learn more' })).toBeInTheDocument();
  });

  it('applies the accent ring when accent is true', () => {
    const { container } = render(<ModeCard accent eyebrow="A" title="t" description="d" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/ring-amber/);
  });

  it('uses semantic <article> as the root', () => {
    render(<ModeCard eyebrow="A" title="t" description="d" />);
    const article = document.querySelector('article');
    expect(article).not.toBeNull();
  });
});
