import { createFileRoute, Outlet } from '@tanstack/react-router';
import { disallowAuth } from '#/features/auth/auth-service';

export const Route = createFileRoute('/_unauthenticated')({
  beforeLoad: async () => await disallowAuth(),
  component: UnauthenticatedLayout,
});

function UnauthenticatedLayout() {
  return (
    <div className="bg-chill-bg min-h-screen flex items-center justify-center">
      <Outlet />
    </div>
  );
}
