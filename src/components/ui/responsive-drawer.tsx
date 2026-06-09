import { Dialog } from 'radix-ui';
import * as React from 'react';
import { cn } from '#/lib/utils';

export function ResponsiveDrawer({
  children,
  ...props
}: React.ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root {...props}>{children}</Dialog.Root>;
}

export const ResponsiveDrawerContent = React.forwardRef<
  React.ComponentRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content>
>(({ className, children, ...props }, ref) => (
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
    <Dialog.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col bg-chill-surface shadow-xl outline-none overflow-hidden',
        // Mobile: full-screen bottom sheet
        'inset-x-0 bottom-0 top-0 rounded-t-2xl',
        // Desktop: fixed right drawer
        'md:inset-y-0 md:right-0 md:left-auto md:w-[480px] md:rounded-none',
        // Mobile animations (slide from bottom)
        'data-[state=open]:animate-slide-in-from-bottom data-[state=closed]:animate-slide-out-to-bottom',
        // Desktop animations (slide from right, overrides mobile)
        'md:data-[state=open]:animate-slide-in-from-right md:data-[state=closed]:animate-slide-out-to-right',
        className,
      )}
      {...props}
    >
      {children}
    </Dialog.Content>
  </Dialog.Portal>
));
ResponsiveDrawerContent.displayName = 'ResponsiveDrawerContent';

export function ResponsiveDrawerHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-start justify-between px-6 py-5 border-b border-chill-border',
        className,
      )}
      {...props}
    />
  );
}

export const ResponsiveDrawerTitle = React.forwardRef<
  React.ComponentRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn('text-lg font-semibold text-chill-text', className)}
    {...props}
  />
));
ResponsiveDrawerTitle.displayName = 'ResponsiveDrawerTitle';

export const ResponsiveDrawerDescription = React.forwardRef<
  React.ComponentRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn('mt-1 text-sm text-chill-text-muted', className)}
    {...props}
  />
));
ResponsiveDrawerDescription.displayName = 'ResponsiveDrawerDescription';

export function ResponsiveDrawerFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-end gap-2 px-6 py-4 border-t border-chill-border bg-chill-bg',
        className,
      )}
      {...props}
    />
  );
}

export const ResponsiveDrawerClose = Dialog.Close;
