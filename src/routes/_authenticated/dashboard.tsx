import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import * as React from 'react';
import { useBillActionsState } from '#/components/bill-actions-drawer';
import { PayBillDialog } from '#/components/pay-bill-dialog';
import { Button } from '#/components/ui/button';
import { Card, CardBody, CardHeader } from '#/components/ui/card';
import {
  clampDayToMonth,
  deriveBillState,
  formatCurrency,
  formatOrdinal,
  selectActiveSchedule,
} from '#/features/bills/bills-helpers';
import type {
  Bill,
  BillInstance,
  BillWithSchedule,
} from '#/features/bills/bills-model';
import {
  billsQueryOptions,
  currentMonthInstancesQueryOptions,
  useBills,
  useCurrentMonthInstances,
} from '#/features/bills/bills-queries';
import {
  paySchedulesQueryOptions,
  usePaySchedules,
} from '#/features/pay-schedules/pay-schedules-queries';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/_authenticated/dashboard')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        billsQueryOptions({ scheduleId: 'all', manualOnly: false }),
      ),
      context.queryClient.ensureQueryData(paySchedulesQueryOptions()),
      context.queryClient.ensureQueryData(currentMonthInstancesQueryOptions()),
    ]),
  component: DashboardPage,
});

type SelectedBill = {
  bill: Pick<Bill, 'id' | 'name' | 'dueDayOfMonth' | 'amountExpected'>;
  instances: BillInstance[];
};

function DashboardPage() {
  const navigate = useNavigate();
  const { today, instancesByBillId } = useBillActionsState();
  const billsQuery = useBills({ scheduleId: 'all', manualOnly: false });
  const schedulesQuery = usePaySchedules();
  const instancesQuery = useCurrentMonthInstances();

  const bills = billsQuery.data ?? [];
  const schedules = schedulesQuery.data ?? [];
  const allInstances = instancesQuery.data ?? [];

  const [selectedBill, setSelectedBill] = React.useState<SelectedBill | null>(
    null,
  );

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  // Row 2 metrics — calendar-month-scoped
  const monthStart = `${todayYear}-${String(todayMonth).padStart(2, '0')}-`;
  const monthInstances = allInstances.filter(i =>
    i.dueDate.startsWith(monthStart),
  );
  const totalCount = bills.length;
  const totalCents = bills.reduce((s, b) => s + b.amountExpected, 0);
  const paidBillIds = new Set(monthInstances.map(i => i.billId));
  const paidCount = paidBillIds.size;
  const paidCents = monthInstances.reduce((s, i) => s + i.amountActual, 0);

  // Row 3 — active session
  const activeSchedule = selectActiveSchedule(
    schedules,
    bills,
    instancesByBillId,
    today,
  );
  const activeScheduleBills = activeSchedule
    ? bills
        .filter(b => b.payScheduleId === activeSchedule.id)
        .sort((a, b) => a.dueDayOfMonth - b.dueDayOfMonth)
    : [];
  const allChecklistPaid = activeScheduleBills.every(b => {
    const instances = instancesByBillId.get(b.id) ?? [];
    return deriveBillState(b, activeSchedule, instances, today) === 'PAID';
  });

  // Row 4 — upcoming preview (first 7 UPCOMING bills with clamped due day >= today)
  const upcomingPreview = bills
    .filter(bill => {
      const schedule = schedules.find(s => s.id === bill.payScheduleId) ?? null;
      const instances = instancesByBillId.get(bill.id) ?? [];
      const state = deriveBillState(bill, schedule, instances, today);
      const clamped = clampDayToMonth(
        bill.dueDayOfMonth,
        todayYear,
        todayMonth,
      );
      return state === 'UPCOMING' && clamped >= todayDay;
    })
    .sort((a, b) => a.dueDayOfMonth - b.dueDayOfMonth)
    .slice(0, 7);

  function openPayDialog(
    bill: Pick<Bill, 'id' | 'name' | 'dueDayOfMonth' | 'amountExpected'>,
  ) {
    setSelectedBill({ bill, instances: instancesByBillId.get(bill.id) ?? [] });
  }

  const hasActiveSchedules = schedules.some(s => s.isActive);

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-chill-text">
        {`Today, ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
      </h1>

      {/* Row 2 — Monthly Snapshots */}
      {bills.length === 0 ? (
        <Card>
          <CardBody className="px-6 py-8 text-sm text-chill-text-muted text-center">
            No bills yet.{' '}
            <Link
              to="/bills"
              search={{ scheduleId: 'all', manualOnly: false, actions: false }}
              className="text-chill-teal hover:underline"
            >
              Add your first bill →
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 flex flex-col items-center">
            <Donut
              fraction={totalCount > 0 ? paidCount / totalCount : 0}
              centerLabel={`${paidCount} / ${totalCount}`}
              subLabel="bills paid"
            />
          </Card>
          <Card className="p-6 flex flex-col items-center">
            <Donut
              fraction={totalCents > 0 ? paidCents / totalCents : 0}
              centerLabel={formatCurrency(paidCents)}
              subLabel={`of ${formatCurrency(totalCents)}`}
            />
          </Card>
        </div>
      )}

      {/* Row 3 — Active Session Checklist */}
      {!hasActiveSchedules || !activeSchedule ? (
        <Card>
          <CardBody className="px-6 py-8 text-sm text-chill-text-muted text-center">
            No active pay schedules.{' '}
            <Link to="/schedules" className="text-chill-teal hover:underline">
              Create one →
            </Link>
          </CardBody>
        </Card>
      ) : activeScheduleBills.length === 0 ? (
        <Card>
          <CardBody className="px-6 py-8 text-sm text-chill-text-muted text-center">
            No bills assigned to {activeSchedule.name}.{' '}
            <Link
              to="/bills"
              search={{ scheduleId: 'all', manualOnly: false, actions: false }}
              className="text-chill-teal hover:underline"
            >
              Assign bills →
            </Link>
          </CardBody>
        </Card>
      ) : allChecklistPaid ? (
        <Card>
          <CardBody className="px-6 py-8 text-sm text-chill-text-muted text-center">
            All caught up for {activeSchedule.name}!
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-chill-text">
              Pay Session — {activeSchedule.name} (
              {formatOrdinal(activeSchedule.anchorDay)})
            </span>
          </CardHeader>
          <ul>
            {activeScheduleBills.map(bill => {
              const instances = instancesByBillId.get(bill.id) ?? [];
              const state = deriveBillState(
                bill,
                activeSchedule,
                instances,
                today,
              );
              const isPaid = state === 'PAID';
              return (
                <ChecklistRow
                  key={bill.id}
                  bill={bill}
                  state={state}
                  isPaid={isPaid}
                  onPay={() => openPayDialog(bill)}
                />
              );
            })}
          </ul>
        </Card>
      )}

      {/* Row 4 — Upcoming Preview */}
      {upcomingPreview.length > 0 && (
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-chill-text">
              Upcoming this month
            </span>
          </CardHeader>
          <ul>
            {upcomingPreview.map(bill => (
              <UpcomingPreviewRow
                key={bill.id}
                bill={bill}
                onPay={() => openPayDialog(bill)}
              />
            ))}
          </ul>
          <div className="px-6 py-3 border-t border-chill-border">
            <button
              type="button"
              onClick={() =>
                navigate({
                  search: prev => ({ ...prev, actions: true }),
                  to: '.',
                })
              }
              className="text-sm text-chill-text-muted hover:text-chill-text transition-colors"
            >
              See all upcoming →
            </button>
          </div>
        </Card>
      )}

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
    </div>
  );
}

function Donut({
  fraction,
  centerLabel,
  subLabel,
}: {
  fraction: number;
  centerLabel: string;
  subLabel: string;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const safeFraction = Math.max(0, Math.min(1, fraction));
  const dash = safeFraction * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-chill-teal-light)"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-chill-teal)"
          strokeWidth="10"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center">
        <div className="text-lg font-semibold text-chill-text">
          {centerLabel}
        </div>
        <div className="text-xs text-chill-text-muted">{subLabel}</div>
      </div>
    </div>
  );
}

function ChecklistRow({
  bill,
  state,
  isPaid,
  onPay,
}: {
  bill: BillWithSchedule;
  state: ReturnType<typeof deriveBillState>;
  isPaid: boolean;
  onPay: () => void;
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-chill-border last:border-0',
        state === 'MISSED_SCHEDULE' &&
          'bg-amber-50 border-l-2 border-l-amber-400',
        state === 'OVERDUE' &&
          'bg-chill-peach border-l-2 border-l-chill-peach-border',
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (!isPaid) onPay();
        }}
        aria-label={isPaid ? 'Paid' : `Mark ${bill.name} as paid`}
        className={cn(
          'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          isPaid
            ? 'border-chill-teal bg-chill-teal cursor-default'
            : 'border-chill-border bg-transparent hover:border-chill-teal cursor-pointer',
        )}
      >
        {isPaid && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 5l2 2 4-4"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <Link
          to="/bills/$billId"
          params={{ billId: bill.id }}
          search={{ edit: false, page: 1 }}
          className={cn(
            'text-sm font-medium hover:underline truncate block',
            isPaid ? 'line-through text-chill-text-muted' : 'text-chill-text',
          )}
        >
          {bill.name}
        </Link>
        <p className="text-xs text-chill-text-muted">
          Due {formatOrdinal(bill.dueDayOfMonth)}
        </p>
      </div>

      <div
        className={cn(
          'flex items-center gap-1.5 text-sm tabular-nums shrink-0',
          isPaid ? 'text-chill-text-muted' : 'text-chill-text',
        )}
      >
        {formatCurrency(bill.amountExpected)}
        {bill.isAutoPay && <AutoPayIcon />}
      </div>

      {!isPaid && (
        <Button variant="pay" size="sm" onClick={onPay}>
          Pay
        </Button>
      )}
    </li>
  );
}

function UpcomingPreviewRow({
  bill,
  onPay,
}: {
  bill: BillWithSchedule;
  onPay: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 border-b border-chill-border last:border-0">
      <span className="text-xs text-chill-text-muted w-10 shrink-0">
        {formatOrdinal(bill.dueDayOfMonth)}
      </span>
      <Link
        to="/bills/$billId"
        params={{ billId: bill.id }}
        search={{ edit: false, page: 1 }}
        className="flex-1 min-w-0 text-sm font-medium text-chill-text hover:underline truncate"
      >
        {bill.name}
      </Link>
      <div className="flex items-center gap-1.5 text-sm tabular-nums text-chill-text shrink-0">
        {formatCurrency(bill.amountExpected)}
        {bill.isAutoPay && <AutoPayIcon />}
      </div>
      <Button variant="pay" size="sm" onClick={onPay}>
        Pay
      </Button>
    </li>
  );
}

function AutoPayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-chill-teal"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
