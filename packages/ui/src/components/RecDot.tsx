import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const recDotVariants = cva('relative inline-block rounded-full bg-amber', {
  variants: {
    size: {
      sm: 'h-2 w-2',
      md: 'h-3 w-3',
      lg: 'h-4 w-4',
    },
  },
  defaultVariants: { size: 'md' },
});

// Tailwind arbitrary-animation values (spaces → underscores). The `motion-safe:`
// modifier compiles to `@media (prefers-reduced-motion: no-preference)`, so users
// who opt out of motion get a still amber dot instead of a pulse.
const PULSE = 'motion-safe:animate-[record-me-rec-pulse_1.4s_ease-in-out_infinite]';
const HALO = 'motion-safe:animate-[record-me-rec-halo_1.6s_ease-out_infinite]';

export interface RecDotProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof recDotVariants> {
  active?: boolean;
  label?: string;
}

export const RecDot = React.forwardRef<HTMLSpanElement, RecDotProps>(
  ({ size, active = true, label = 'Recording', className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        role="status"
        aria-label={label}
        data-active={active}
        className={cn(recDotVariants({ size }), active && PULSE, className)}
        {...props}
      >
        <span
          data-record-me-halo
          aria-hidden="true"
          className={cn('absolute inset-0 rounded-full bg-amber', active && HALO)}
        />
      </span>
    );
  },
);
RecDot.displayName = 'RecDot';
