import { Slot as SlotPrimitive } from 'radix-ui';
import * as React from 'react';
import { cn } from '#/lib/utils';

type ButtonVariant = 'default' | 'primary' | 'pay' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'border border-chill-border bg-chill-surface hover:bg-chill-purple',
  primary: 'bg-chill-teal text-chill-text hover:opacity-90 transition-opacity',
  pay: 'bg-chill-mint text-chill-text hover:bg-chill-mint-hover',
  ghost: 'hover:bg-chill-surface',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-7 py-3.5 text-sm',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'default', size = 'md', asChild = false, className, ...props },
    ref,
  ) => {
    const classes = cn(
      'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      variantClasses[variant],
      sizeClasses[size],
      className,
    );
    if (asChild) {
      return (
        <SlotPrimitive.Slot
          ref={ref as React.Ref<HTMLElement>}
          className={classes}
          {...(props as React.HTMLAttributes<HTMLElement>)}
        />
      );
    }
    return <button ref={ref} className={classes} {...props} />;
  },
);

Button.displayName = 'Button';
