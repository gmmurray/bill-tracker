import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import * as React from 'react';
import { FiCheck, FiMinus } from 'react-icons/fi';
import { cn } from '#/lib/utils';

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer flex h-4 w-4 shrink-0 items-center justify-center rounded border border-chill-border bg-chill-surface transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chill-teal focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:border-chill-purple data-[state=checked]:bg-chill-purple',
      'data-[state=indeterminate]:border-chill-purple data-[state=indeterminate]:bg-chill-purple',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-chill-text">
      {props.checked === 'indeterminate' ? (
        <FiMinus size={11} aria-hidden="true" />
      ) : (
        <FiCheck size={12} aria-hidden="true" />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';
