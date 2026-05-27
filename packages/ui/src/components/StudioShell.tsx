import * as React from 'react';
import { cn } from '../lib/cn';

export interface StudioShellProps extends React.HTMLAttributes<HTMLElement> {
  header: React.ReactNode;
  footer?: React.ReactNode;
}

export const StudioShell = React.forwardRef<HTMLElement, StudioShellProps>(
  ({ header, footer, className, children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-2xl border bg-surface-2 border-line',
          'shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_24px_64px_-24px_rgba(0,0,0,0.6)]',
          className,
        )}
        {...props}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line-soft bg-surface px-4 py-3">
          {header}
        </header>

        <div className="relative flex-1 bg-bg">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-between gap-4 border-t border-line-soft bg-surface px-4 py-3 text-xs text-ivory-mut">
            {footer}
          </footer>
        ) : null}
      </section>
    );
  },
);
StudioShell.displayName = 'StudioShell';
