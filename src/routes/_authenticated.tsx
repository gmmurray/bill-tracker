import { createFileRoute, Outlet } from '@tanstack/react-router';

import AppLayout from '#/components/app-layout';
import {
  BillActionsDrawer,
  BillActionsProvider,
} from '#/components/bill-actions-drawer';
import { requireAuth } from '#/features/auth/auth-service';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) =>
    await requireAuth({ data: { redirect_url: location.href } }),
  component: () => (
    <BillActionsProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <BillActionsDrawer />
    </BillActionsProvider>
  ),
});
