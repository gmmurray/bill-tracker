import * as React from 'react';
import { msUntilNextMidnight } from '#/features/bills/bills-helpers';
import type {
  BillInstance,
  BillWithSchedule,
} from '#/features/bills/bills-model';
import {
  type BillOutlook,
  buildBillOutlook,
} from '#/features/bills/bills-outlook';
import { useBills, useRecentInstances } from '#/features/bills/bills-queries';
import type { PaySchedule } from '#/features/pay-schedules/pay-schedules-model';
import { usePaySchedules } from '#/features/pay-schedules/pay-schedules-queries';

export type BillOutlookState = {
  today: Date;
  outlook: BillOutlook;
  bills: BillWithSchedule[];
  /** Active schedules only, ordered by pay date — the tab strip's source. */
  schedules: PaySchedule[];
  instancesByBillId: Map<string, BillInstance[]>;
};

const BillOutlookContext = React.createContext<BillOutlookState | null>(null);

/**
 * Single source of derived bill state for the dashboard, banner, and drawer.
 *
 * Every surface reads the same `outlook` object. When these surfaces each ran
 * their own filter over the raw bill list they disagreed with one another, and
 * bills fell through the gaps between them.
 */
export function BillOutlookProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const billsQuery = useBills({ scheduleId: 'all', manualOnly: false });
  const schedulesQuery = usePaySchedules();
  const instancesQuery = useRecentInstances();

  const [today, setToday] = React.useState(() => new Date());

  React.useEffect(() => {
    const timeout = setTimeout(
      () => setToday(new Date()),
      msUntilNextMidnight(today),
    );
    return () => clearTimeout(timeout);
  }, [today]);

  const value = React.useMemo<BillOutlookState>(() => {
    const bills = billsQuery.data ?? [];
    const allSchedules = schedulesQuery.data ?? [];
    const allInstances = instancesQuery.data ?? [];

    const instancesByBillId = new Map<string, BillInstance[]>();
    for (const instance of allInstances) {
      const existing = instancesByBillId.get(instance.billId);
      if (existing) {
        existing.push(instance);
      } else {
        instancesByBillId.set(instance.billId, [instance]);
      }
    }

    return {
      today,
      outlook: buildBillOutlook(bills, instancesByBillId, today),
      bills,
      schedules: allSchedules
        .filter(s => s.isActive)
        .sort((a, b) => a.payDate - b.payDate || a.name.localeCompare(b.name)),
      instancesByBillId,
    };
  }, [billsQuery.data, schedulesQuery.data, instancesQuery.data, today]);

  return (
    <BillOutlookContext.Provider value={value}>
      {children}
    </BillOutlookContext.Provider>
  );
}

export function useBillOutlook(): BillOutlookState {
  const ctx = React.useContext(BillOutlookContext);
  if (!ctx) {
    throw new Error('useBillOutlook must be used within a BillOutlookProvider');
  }
  return ctx;
}
