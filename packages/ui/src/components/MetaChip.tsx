import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const metaChipVariants = cva(
  [
    'inline-flex items-center gap-1.5 px-2 py-0.5',
    'rounded-sm font-mono uppercase tracking-wider text-[10px] leading-none',
    'border border-line-soft',
  ].join(' '),
  {
    variants: {
      tone: {
        muted: 'text-ivory-mut bg-transparent',
        amber: 'text-amber bg-amber/5 border-amber/30',
        success: 'text-success bg-success/5 border-success/30',
        danger: 'text-danger bg-danger/5 border-danger/30',
      },
    },
    defaultVariants: { tone: 'muted' },
  },
);

export interface MetaChipProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof metaChipVariants> {}

export const MetaChip = React.forwardRef<HTMLSpanElement, MetaChipProps>(
  ({ tone, className, children, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(metaChipVariants({ tone }), className)} {...props}>
        {children}
      </span>
    );
  },
);
MetaChip.displayName = 'MetaChip';
