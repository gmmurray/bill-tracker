import { env } from 'cloudflare:workers';
import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';
import { Webhook } from 'svix';
import { getDb } from '#/db/client';
import { billInstances, bills, paySchedules } from '#/db/schema';

type ClerkWebhookEvent = {
  type: string;
  data: { id: string };
};

async function deleteAllUserData(userId: string) {
  const db = getDb();
  await db.batch([
    db.delete(billInstances).where(eq(billInstances.userId, userId)),
    db.delete(bills).where(eq(bills.userId, userId)),
    db.delete(paySchedules).where(eq(paySchedules.userId, userId)),
  ]);
}

export const Route = createFileRoute('/api/webhooks/clerk')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = env.CLERK_WEBHOOK_SECRET;
        if (!secret) {
          return new Response('Webhook secret not configured', { status: 500 });
        }

        const svixId = request.headers.get('svix-id');
        const svixTimestamp = request.headers.get('svix-timestamp');
        const svixSignature = request.headers.get('svix-signature');
        if (!svixId || !svixTimestamp || !svixSignature) {
          return new Response('Missing Svix headers', { status: 400 });
        }

        const body = await request.text();

        let event: ClerkWebhookEvent;
        try {
          event = new Webhook(secret).verify(body, {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature,
          }) as ClerkWebhookEvent;
        } catch {
          return new Response('Invalid signature', { status: 400 });
        }

        if (event.type !== 'user.deleted') {
          return new Response(null, { status: 200 });
        }

        const userId = event.data.id;
        if (!userId) {
          return new Response('Missing user id in payload', { status: 400 });
        }

        await deleteAllUserData(userId);
        return new Response(null, { status: 200 });
      },
    },
  },
});
