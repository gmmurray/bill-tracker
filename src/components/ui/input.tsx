import * as React from 'react';
import { cn } from '#/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex w-full rounded border border-chill-border bg-chill-surface px-3 py-2 text-sm text-chill-text placeholder:text-chill-text-muted',
      'focus:outline-none focus:ring-2 focus:ring-chill-teal focus:border-transparent',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
