import { useRouterState } from '@tanstack/react-router';
import type { PropsWithChildren } from 'react';
import AppLayout from '#/components/app-layout';
import { AttentionBanner } from '#/components/attention-banner';
import {
  BillActionsDrawer,
  BillActionsProvider,
} from '#/components/bill-actions-drawer';
import { BillActionsNavButton } from '#/components/bill-actions-nav-button';
import { BillOutlookProvider } from '#/components/bill-outlook-provider';
import { OutlookBanner } from '#/components/outlook-banner';
import { OutlookDrawer } from '#/components/outlook-drawer';
import { OutlookNavButton } from '#/components/outlook-nav-button';

/**
 * The banner, drawer, and nav button are global chrome, so the old and new
 * versions can't both be live at once — they share the `?actions` search param.
 *
 * `/dashboard` keeps the original chrome so it stays a faithful before-picture;
 * every other route gets the outlook chrome. Once v2 is adopted, drop the
 * legacy branch along with the old dashboard route.
 */
export function AuthenticatedShell({ children }: PropsWithChildren) {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isLegacyDashboard = pathname === '/dashboard';

  return (
    <BillActionsProvider>
      <BillOutlookProvider>
        <AppLayout
          banner={isLegacyDashboard ? <AttentionBanner /> : <OutlookBanner />}
          navButton={
            isLegacyDashboard ? <BillActionsNavButton /> : <OutlookNavButton />
          }
        >
          {children}
        </AppLayout>
        {isLegacyDashboard ? <BillActionsDrawer /> : <OutlookDrawer />}
      </BillOutlookProvider>
    </BillActionsProvider>
  );
}
