import { env } from 'cloudflare:workers';

import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getDb, getSchedules } from '#/lib/db';

const getData = createServerFn().handler(async () => {
  const data = await getSchedules();
  return { message: data };
});

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    console.log(env.CLERK_PUBLISHABLE_KEY);
    const data = await getData();
    return { message: data.message };
  },
});

function Home() {
  const data = Route.useLoaderData();
  console.log(data.message);
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
      <p className="mt-4 text-lg">
        Edit <code>src/routes/index.tsx</code> to get started.
      </p>
    </div>
  );
}
