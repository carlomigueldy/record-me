import * as React from 'react';
import { cn } from '../lib/cn';
import { MetaChip } from './MetaChip';

export interface ModeCardProps extends React.HTMLAttributes<HTMLElement> {
  eyebrow: string;
  title: string;
  description: string;
  footer?: React.ReactNode;
  accent?: boolean;
}

export const ModeCard = React.forwardRef<HTMLElement, ModeCardProps>(
  ({ eyebrow, title, description, footer, accent = false, className, children, ...props }, ref) => {
    return (
      <article
        ref={ref}
        className={cn(
          'group relative flex flex-col gap-6 rounded-xl border bg-surface p-6',
          'border-line transition-colors duration-200',
          accent ? 'ring-1 ring-amber/40 border-amber/30' : 'hover:border-line-soft',
          className,
        )}
        {...props}
      >
        {children ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line-soft bg-bg-2">
            {children}
          </div>
        ) : null}

        <header className="flex flex-col gap-2">
          <MetaChip tone={accent ? 'amber' : 'muted'}>{eyebrow}</MetaChip>
          <h3 className="font-serif text-2xl leading-tight text-ivory">{title}</h3>
        </header>

        <p className="text-sm leading-relaxed text-ivory-dim">{description}</p>

        {footer ? <footer className="mt-auto pt-2 text-sm">{footer}</footer> : null}
      </article>
    );
  },
);
ModeCard.displayName = 'ModeCard';
