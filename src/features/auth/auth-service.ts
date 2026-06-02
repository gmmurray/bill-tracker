import { auth } from '@clerk/tanstack-react-start/server';
import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

export const requireAuth = createServerFn({ method: 'GET' })
  .inputValidator((data: { redirect_url?: string }) => data)
  .handler(async ({ data: { redirect_url } }) => {
    const { isAuthenticated, userId } = await auth();

    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in/$',
        search: {
          redirect_url,
        },
      });
    }

    return { userId };
  });

export const disallowAuth = createServerFn({ method: 'GET' })
  .inputValidator((data?: { redirect_url?: string }) => data)
  .handler(async ({ data: { redirect_url } = {} }) => {
    const { isAuthenticated } = await auth();

    if (isAuthenticated) {
      throw redirect({
        to: redirect_url ?? '/dashboard',
      });
    }
  });
