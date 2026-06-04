import { auth } from '@clerk/tanstack-react-start/server';
import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { UnauthorizedError } from '#/lib/errors';

/**
 * Internal server-side helper for use inside `createServerFn` mutation handlers.
 * Throws a plain `Error` on failure so TanStack Query can surface it as a mutation
 * error rather than navigating the user away mid-interaction.
 *
 * Do not use in route `beforeLoad` — use `requireAuth` there instead.
 */
export async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new UnauthorizedError();
  return userId;
}

/**
 * Server function for use in route `beforeLoad` hooks on authenticated routes.
 * Redirects unauthenticated users to `/sign-in` so the page never renders without
 * a valid session. Returns `{ userId }` on success.
 *
 * Do not use inside mutation handlers — use `getAuthUserId` there instead.
 */
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

/**
 * Server function for use in route `beforeLoad` hooks on unauthenticated routes
 * (e.g. sign-in, landing page). Redirects authenticated users away so they cannot
 * revisit auth pages once signed in.
 */
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
