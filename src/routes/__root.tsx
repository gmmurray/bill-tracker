import { ClerkProvider } from '@clerk/tanstack-react-start';
import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { Toaster } from 'sonner';
import { z } from 'zod';
import NotFound from '#/components/not-found';
import { RouterProgress } from '#/components/router-progress';
import appCss from '../styles.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    validateSearch: z.object({
      actions: z.boolean().optional().catch(false),
    }),
    head: () => ({
      meta: [
        {
          charSet: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          title: 'billchill.',
        },
      ],
      links: [
        {
          rel: 'stylesheet',
          href: appCss,
        },
      ],
    }),
    notFoundComponent: () => <NotFound />,
    shellComponent: RootDocument,
    component: RootComponent,
  },
);

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ClerkProvider>
      <RouterProgress />
      <Outlet />
      <Toaster
        richColors
        position="bottom-right"
        closeButton
        toastOptions={{
          classNames: {
            toast:
              'bg-chill-surface border border-chill-border text-chill-text shadow-sm rounded-lg font-sans',
            title: 'text-chill-text font-medium',
            description: 'text-chill-text-muted',
            closeButton:
              'bg-chill-surface border-chill-border text-chill-text-muted hover:text-chill-text',
            success: 'bg-chill-mint border-chill-mint-hover text-chill-text',
            error: 'bg-chill-peach border-chill-peach-border text-chill-text',
          },
        }}
      />
    </ClerkProvider>
  );
}
