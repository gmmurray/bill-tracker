import type { PropsWithChildren } from 'react';
import AppLayout from '#/components/app-layout';
import { BillOutlookProvider } from '#/components/bill-outlook-provider';
import { OutlookBanner } from '#/components/outlook-banner';
import { OutlookDrawer } from '#/components/outlook-drawer';
import { OutlookNavButton } from '#/components/outlook-nav-button';

export function AuthenticatedShell({ children }: PropsWithChildren) {
  return (
    <BillOutlookProvider>
      <AppLayout banner={<OutlookBanner />} navButton={<OutlookNavButton />}>
        {children}
      </AppLayout>
      <OutlookDrawer />
    </BillOutlookProvider>
  );
}
