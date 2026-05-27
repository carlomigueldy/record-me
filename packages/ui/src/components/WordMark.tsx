import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const wordMarkVariants = cva('inline-flex items-baseline font-serif leading-none text-ivory', {
  variants: {
    size: {
      sm: 'text-xl',
      md: 'text-3xl',
      lg: 'text-6xl',
    },
  },
  defaultVariants: { size: 'md' },
});

export interface WordMarkProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof wordMarkVariants> {}

export const WordMark = React.forwardRef<HTMLSpanElement, WordMarkProps>(
  ({ size, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        aria-label="record me"
        className={cn(wordMarkVariants({ size }), className)}
        {...props}
      >
        <span aria-hidden="true">record&nbsp;</span>
        <em aria-hidden="true" className="italic text-amber">
          me
        </em>
      </span>
    );
  },
);
WordMark.displayName = 'WordMark';
