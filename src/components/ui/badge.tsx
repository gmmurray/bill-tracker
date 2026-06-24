import type * as React from 'react';
import { cn } from '#/lib/utils';

type BadgeVariant = 'default' | 'teal' | 'peach' | 'coral' | 'amber';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-chill-border text-chill-text',
  teal: 'bg-chill-teal-light text-chill-text',
  peach: 'bg-chill-peach border border-chill-peach-border text-chill-text',
  coral: 'bg-transparent border border-chill-coral text-chill-coral',
  amber: 'bg-transparent border border-amber-500 text-amber-700',
};

export function Badge({
  variant = 'default',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
