import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import * as React from 'react';
import { PayBillDialog } from '#/components/pay-bill-dialog';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import {
  ResponsiveDrawer,
  ResponsiveDrawerClose,
  ResponsiveDrawerContent,
  ResponsiveDrawerHeader,
  ResponsiveDrawerTitle,
} from '#/components/ui/responsive-drawer';
import {
  clampDayToMonth,
  deriveBillState,
  formatCurrency,
  formatDueLabel,
  msUntilNextMidnight,
  selectActiveSchedule,
} from '#/features/bills/bills-helpers';
import type {
  Bill,
  BillInstance,
  BillState,
  BillWithSchedule,
} from '#/features/bills/bills-model';
import {
  useBills,
  useCurrentMonthInstances,
} from '#/features/bills/bills-queries';
import { usePaySchedules } from '#/features/pay-schedules/pay-schedules-queries';
import { cn } from '#/lib/utils';

type AttentionEntry = {
  bill: BillWithSchedule;
  state: Extract<BillState, 'OVERDUE' | 'MISSED_SCHEDULE'>;
  daysPast: number;
};

type UpcomingEntry = {
  bill: BillWithSchedule;
};

export type BillActionsState = {
  today: Date;
  attention: AttentionEntry[];
  upcoming: UpcomingEntry[];
  attentionCount: number;
  instancesByBillId: Map<string, BillInstance[]>;
};

const BillActionsContext = React.createContext<BillActionsState | null>(null);

export function BillActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const billsQuery = useBills({ scheduleId: 'all', manualOnly: false });
  const schedulesQuery = usePaySchedules();
  const instancesQuery = useCurrentMonthInstances();

  const [today, setToday] = React.useState(() => new Date());

  React.useEffect(() => {
    const t = setTimeout(
      () => setToday(new Date()),
      msUntilNextMidnight(today),
    );
    return () => clearTimeout(t);
  }, [today]);

  const value = React.useMemo<BillActionsState>(() => {
    const bills = billsQuery.data ?? [];
    const schedules = schedulesQuery.data ?? [];
    const allInstances = instancesQuery.data ?? [];

    const instancesByBillId = new Map<string, BillInstance[]>();
    for (const inst of allInstances) {
      const arr = instancesByBillId.get(inst.billId) ?? [];
      arr.push(inst);
      instancesByBillId.set(inst.billId, arr);
    }

    const activeSchedule = selectActiveSchedule(
      schedules,
      bills,
      instancesByBillId,
      today,
    );

    const attention: AttentionEntry[] = [];
    const upcoming: UpcomingEntry[] = [];

    const todayMonth = today.getMonth() + 1;
    const todayYear = today.getFullYear();
    const todayDay = today.getDate();

    for (const bill of bills) {
      const schedule = bill.payScheduleId
        ? (schedules.find(s => s.id === bill.payScheduleId) ?? null)
        : null;
      const instances = instancesByBillId.get(bill.id) ?? [];
      const state = deriveBillState(bill, schedule, instances, today);

      if (state === 'OVERDUE') {
        const clampedDue = clampDayToMonth(
          bill.dueDayOfMonth,
          todayYear,
          todayMonth,
        );
        attention.push({ bill, state, daysPast: todayDay - clampedDue });
      } else if (
        state === 'MISSED_SCHEDULE' &&
        bill.payScheduleId !== activeSchedule?.id
      ) {
        const anchorDay = schedule?.anchorDay ?? bill.dueDayOfMonth;
        const clampedAnchor = clampDayToMonth(anchorDay, todayYear, todayMonth);
        attention.push({ bill, state, daysPast: todayDay - clampedAnchor });
      } else if (state === 'UPCOMING') {
        const clampedDue = clampDayToMonth(
          bill.dueDayOfMonth,
          todayYear,
          todayMonth,
        );
        if (clampedDue >= todayDay) {
          upcoming.push({ bill });
        }
      }
    }

    attention.sort((a, b) => {
      const diff = b.daysPast - a.daysPast;
      return diff !== 0 ? diff : a.bill.dueDayOfMonth - b.bill.dueDayOfMonth;
    });

    upcoming.sort((a, b) => a.bill.dueDayOfMonth - b.bill.dueDayOfMonth);

    return {
      today,
      attention,
      upcoming,
      attentionCount: attention.length,
      instancesByBillId,
    };
  }, [billsQuery.data, schedulesQuery.data, instancesQuery.data, today]);

  return (
    <BillActionsContext.Provider value={value}>
      {children}
    </BillActionsContext.Provider>
  );
}

export function useBillActionsState(): BillActionsState {
  const ctx = React.useContext(BillActionsContext);
  if (!ctx) {
    throw new Error(
      'useBillActionsState must be used within a BillActionsProvider',
    );
  }
  return ctx;
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M14 4L4 14M4 4l10 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BillActionsDrawer() {
  const { actions = false } = useSearch({ from: '__root__' });
  const navigate = useNavigate();
  const [selectedBill, setSelectedBill] = React.useState<{
    bill: Pick<Bill, 'id' | 'name' | 'dueDayOfMonth' | 'amountExpected'>;
    instances: BillInstance[];
  } | null>(null);

  const { attention, upcoming, instancesByBillId } = useBillActionsState();

  function close() {
    navigate({ search: prev => ({ ...prev, actions: false }), to: '.' });
  }

  function openPayDialog(
    bill: Pick<Bill, 'id' | 'name' | 'dueDayOfMonth' | 'amountExpected'>,
  ) {
    setSelectedBill({ bill, instances: instancesByBillId.get(bill.id) ?? [] });
  }

  return (
    <>
      <ResponsiveDrawer
        open={actions}
        onOpenChange={open => {
          if (!open) close();
        }}
      >
        <ResponsiveDrawerContent>
          <ResponsiveDrawerHeader>
            <ResponsiveDrawerTitle>Bill actions</ResponsiveDrawerTitle>
            <ResponsiveDrawerClose
              className={cn(
                'rounded-md p-1.5 text-chill-text-muted transition-colors',
                'hover:bg-chill-purple-light hover:text-chill-text hover:cursor-pointer',
                'focus:outline-none focus:ring-2 focus:ring-chill-teal',
              )}
              aria-label="Close"
            >
              <CloseIcon />
            </ResponsiveDrawerClose>
          </ResponsiveDrawerHeader>

          <div className="flex-1 overflow-auto flex flex-col">
            {attention.length === 0 && upcoming.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-16 text-sm text-chill-text-muted">
                You&apos;re all caught up.
              </div>
            ) : (
              <>
                {attention.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 px-6 py-3 bg-chill-peach border-b border-chill-peach-border">
                      <span className="text-sm font-semibold text-chill-text">
                        Needs attention
                      </span>
                      <Badge variant="peach">{attention.length}</Badge>
                    </div>
                    <ul>
                      {attention.map(({ bill, state }) => (
                        <AttentionRow
                          key={bill.id}
                          bill={bill}
                          state={state}
                          onPay={() => openPayDialog(bill)}
                        />
                      ))}
                    </ul>
                  </section>
                )}

                {upcoming.length > 0 && (
                  <section>
                    <div className="px-6 py-3 border-b border-chill-border">
                      <span className="text-sm font-semibold text-chill-text">
                        Upcoming this month
                      </span>
                    </div>
                    <ul>
                      {upcoming.map(({ bill }) => (
                        <UpcomingRow
                          key={bill.id}
                          bill={bill}
                          onPay={() => openPayDialog(bill)}
                        />
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}

            <div className="px-6 py-4 border-t border-chill-border mt-auto">
              <Link
                to="/bills"
                search={{
                  scheduleId: 'all',
                  manualOnly: false,
                  actions: false,
                }}
                className="text-sm text-chill-text-muted hover:text-chill-text transition-colors"
              >
                View all bills →
              </Link>
            </div>
          </div>
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>

      {selectedBill && (
        <PayBillDialog
          bill={selectedBill.bill}
          instances={selectedBill.instances}
          open={true}
          onOpenChange={open => {
            if (!open) setSelectedBill(null);
          }}
        />
      )}
    </>
  );
}

function AttentionRow({
  bill,
  state,
  onPay,
}: {
  bill: BillWithSchedule;
  state: Extract<BillState, 'OVERDUE' | 'MISSED_SCHEDULE'>;
  onPay: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-6 py-3 border-b border-chill-border last:border-0">
      <div className="flex-1 min-w-0">
        <Link
          to="/bills/$billId"
          params={{ billId: bill.id }}
          search={{ edit: false, page: 1 }}
          className="text-sm font-medium text-chill-text hover:underline truncate block"
        >
          {bill.name}
        </Link>
        <p className="text-xs text-chill-text-muted tabular-nums">
          {formatCurrency(bill.amountExpected)} &middot;{' '}
          {formatDueLabel(bill.dueDayOfMonth)}
        </p>
      </div>
      {state === 'OVERDUE' ? (
        <Badge variant="peach">Overdue</Badge>
      ) : (
        <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
          Missed schedule
        </Badge>
      )}
      <Button variant="pay" size="sm" onClick={onPay}>
        Mark Paid
      </Button>
    </li>
  );
}

function UpcomingRow({
  bill,
  onPay,
}: {
  bill: BillWithSchedule;
  onPay: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-6 py-3 border-b border-chill-border last:border-0">
      <div className="flex-1 min-w-0">
        <Link
          to="/bills/$billId"
          params={{ billId: bill.id }}
          search={{ edit: false, page: 1 }}
          className="text-sm font-medium text-chill-text hover:underline truncate block"
        >
          {bill.name}
        </Link>
        <p className="text-xs text-chill-text-muted tabular-nums">
          {formatCurrency(bill.amountExpected)} &middot;{' '}
          {formatDueLabel(bill.dueDayOfMonth)}
        </p>
      </div>
      <Button variant="pay" size="sm" onClick={onPay}>
        Mark Paid
      </Button>
    </li>
  );
}
