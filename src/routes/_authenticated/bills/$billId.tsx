import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/_authenticated/bills/$billId')({
  validateSearch: z.object({
    edit: z.boolean().catch(false),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_authenticated/bills/$billId"!</div>;
}
