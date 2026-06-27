import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import * as React from 'react';
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
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#7ec8e8' },
        { title: 'BillChill' },
        {
          name: 'description',
          content:
            'Bundle your bills into pay schedules that match your life, then forget about money until next cycle.',
        },
        { property: 'og:site_name', content: 'BillChill' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'BillChill' },
        {
          property: 'og:description',
          content:
            'Bundle your bills into pay schedules that match your life, then forget about money until next cycle.',
        },
        {
          property: 'og:image',
          content: 'https://billchill.app/og-image.jpg',
        },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        {
          property: 'og:image:alt',
          content: 'BillChill — bill tracking that lets you chill.',
        },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'BillChill' },
        {
          name: 'twitter:description',
          content:
            'Bundle your bills into pay schedules that match your life, then forget about money until next cycle.',
        },
        {
          name: 'twitter:image',
          content: 'https://billchill.app/og-image.jpg',
        },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/favicon-32x32.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '16x16',
          href: '/favicon-16x16.png',
        },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
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

function AuthCacheWatcher() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const lastUserIdRef = React.useRef<string | null | undefined>(userId);

  React.useEffect(() => {
    if (
      lastUserIdRef.current !== undefined &&
      userId !== lastUserIdRef.current
    ) {
      queryClient.clear();
    }
    lastUserIdRef.current = userId;
  }, [userId, queryClient]);

  return null;
}

function RootComponent() {
  return (
    <ClerkProvider>
      <AuthCacheWatcher />
      <RouterProgress />
      <Outlet />
      <Toaster
        richColors
        position="top-center"
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
