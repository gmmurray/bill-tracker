import { createFileRoute } from '@tanstack/react-router';
import { disallowAuth } from '#/features/auth/auth-service';

export const Route = createFileRoute('/_unauthenticated')({
  beforeLoad: async () => await disallowAuth(),
});
