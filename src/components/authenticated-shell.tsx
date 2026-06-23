import type { PropsWithChildren } from 'react';
import AppLayout from '#/components/app-layout';
import {
  BillActionsDrawer,
  BillActionsProvider,
} from '#/components/bill-actions-drawer';

export function AuthenticatedShell({ children }: PropsWithChildren) {
  return (
    <BillActionsProvider>
      <AppLayout>{children}</AppLayout>
      <BillActionsDrawer />
    </BillActionsProvider>
  );
}
