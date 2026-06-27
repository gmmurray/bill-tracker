import { Label as LabelPrimitive } from 'radix-ui';
import * as React from 'react';
import { cn } from '#/lib/utils';

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-semibold text-chill-text', className)}
    {...props}
  />
));
Label.displayName = 'Label';
