import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import * as React from 'react';
import { useBillActionsState } from '#/components/bill-actions-drawer';
import { PayBillDialog } from '#/components/pay-bill-dialog';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardBody, CardHeader } from '#/components/ui/card';
import {
  clampDayToMonth,
  deriveBillState,
  formatCurrency,
  formatDueLabel,
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
  const activeScheduleEntries = activeSchedule
    ? bills
        .filter(b => b.payScheduleId === activeSchedule.id)
        .map(bill => {
          const instances = instancesByBillId.get(bill.id) ?? [];
          const state = deriveBillState(bill, activeSchedule, instances, today);
          return { bill, state, isPaid: state === 'PAID' };
        })
        .sort((a, b) => {
          if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
          return a.bill.dueDayOfMonth - b.bill.dueDayOfMonth;
        })
    : [];
  const allChecklistPaid = activeScheduleEntries.every(e => e.isPaid);

  // Row 4 — upcoming preview (this-month bills due on/after today, paid or not).
  // Excludes bills already shown in Row 3's active session checklist; if there
  // is no active schedule, no exclusion applies so Row 4 still covers everything.
  const upcomingPreview = bills
    .map(bill => {
      const schedule = schedules.find(s => s.id === bill.payScheduleId) ?? null;
      const instances = instancesByBillId.get(bill.id) ?? [];
      const state = deriveBillState(bill, schedule, instances, today);
      return { bill, state, isPaid: state === 'PAID' };
    })
    .filter(({ bill }) => {
      if (activeSchedule && bill.payScheduleId === activeSchedule.id) {
        return false;
      }
      const clamped = clampDayToMonth(
        bill.dueDayOfMonth,
        todayYear,
        todayMonth,
      );
      return clamped >= todayDay;
    })
    .sort((a, b) => a.bill.dueDayOfMonth - b.bill.dueDayOfMonth)
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
          <Card className="p-6">
            <Donut
              value={paidCount}
              total={totalCount}
              periodLabel="This month"
              formatValue={v => `${Math.round(v)} / ${totalCount}`}
              formatDelta={d => `+${Math.round(d)}`}
              subLabel="bills paid"
              variant="teal"
            />
          </Card>
          <Card className="p-6">
            <Donut
              value={paidCents}
              total={totalCents}
              periodLabel="This month"
              formatValue={v => formatCurrency(Math.round(v))}
              formatDelta={d => `+${formatCurrency(Math.round(d))}`}
              subLabel={`of ${formatCurrency(totalCents)}`}
              variant="purple"
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
      ) : activeScheduleEntries.length === 0 ? (
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
              {formatOrdinal(activeSchedule.payDate)})
            </span>
          </CardHeader>
          <ul>
            {activeScheduleEntries.map(({ bill, state, isPaid }) => (
              <BillRow
                key={bill.id}
                bill={bill}
                state={state}
                isPaid={isPaid}
                showStateBackground
                onPay={() => openPayDialog(bill)}
              />
            ))}
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
            {upcomingPreview.map(({ bill, state, isPaid }) => (
              <BillRow
                key={bill.id}
                bill={bill}
                state={state}
                isPaid={isPaid}
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

const donutColors = {
  teal: {
    track: 'var(--color-chill-teal-light)',
    fill: 'var(--color-chill-teal)',
  },
  purple: {
    track: 'var(--color-chill-purple-light)',
    fill: 'var(--color-chill-purple)',
  },
} as const;

function Donut({
  value,
  total,
  periodLabel,
  formatValue,
  formatDelta,
  subLabel,
  variant,
}: {
  value: number;
  total: number;
  periodLabel: string;
  formatValue: (v: number) => string;
  formatDelta?: (delta: number) => string;
  subLabel: string;
  variant: keyof typeof donutColors;
}) {
  const [displayValue, setDisplayValue] = React.useState(value);
  const displayValueRef = React.useRef(value);
  const prevValueRef = React.useRef(value);
  const [floater, setFloater] = React.useState<{
    text: string;
    key: number;
  } | null>(null);
  const [pulseKey, setPulseKey] = React.useState(0);
  const formatDeltaRef = React.useRef(formatDelta);
  formatDeltaRef.current = formatDelta;

  React.useEffect(() => {
    const start = displayValueRef.current;
    const end = value;
    if (start === end) return;

    const logicalDelta = end - prevValueRef.current;
    const isCompleting =
      total > 0 && prevValueRef.current < total && end >= total;
    prevValueRef.current = end;

    let floaterTimeoutId: ReturnType<typeof setTimeout> | undefined;
    if (logicalDelta > 0) {
      const text = isCompleting
        ? 'Done!'
        : (formatDeltaRef.current?.(logicalDelta) ?? null);
      if (text !== null) {
        setFloater({ text, key: Date.now() });
        floaterTimeoutId = setTimeout(() => setFloater(null), 900);
      }
      setPulseKey(k => k + 1);
    }

    let rafId: number | undefined;
    const duration = 700;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const current = start + (end - start) * eased;
      displayValueRef.current = current;
      setDisplayValue(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        displayValueRef.current = end;
        setDisplayValue(end);
      }
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      if (floaterTimeoutId !== undefined) clearTimeout(floaterTimeoutId);
    };
  }, [value, total]);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? displayValue / total : 0;
  const safeFraction = Math.max(0, Math.min(1, fraction));
  const dash = safeFraction * circumference;
  const colors = donutColors[variant];

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs text-chill-text-muted">{periodLabel}</span>
      <div className="relative">
        <div
          key={pulseKey}
          className={pulseKey > 0 ? 'animate-donut-pulse' : ''}
        >
          <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={colors.track}
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={colors.fill}
              strokeWidth="10"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeLinecap="round"
            />
          </svg>
        </div>
        {floater && (
          <span
            key={floater.key}
            aria-hidden="true"
            style={{ color: colors.fill }}
            className="absolute left-1/2 top-1/2 text-sm font-semibold pointer-events-none animate-donut-float-up tabular-nums"
          >
            {floater.text}
          </span>
        )}
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-chill-text tabular-nums">
          {formatValue(displayValue)}
        </div>
        <div className="text-xs text-chill-text-muted">{subLabel}</div>
      </div>
    </div>
  );
}

function BillRow({
  bill,
  state,
  isPaid,
  showStateBackground = false,
  onPay,
}: {
  bill: BillWithSchedule;
  state: ReturnType<typeof deriveBillState>;
  isPaid: boolean;
  showStateBackground?: boolean;
  onPay: () => void;
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-chill-border last:border-0',
        showStateBackground &&
          state === 'MISSED_SCHEDULE' &&
          'border-l-4 border-l-amber-500',
        showStateBackground &&
          state === 'OVERDUE' &&
          'border-l-4 border-l-chill-coral',
      )}
    >
      <div className="flex-1 min-w-0">
        <Link
          to="/bills/$billId"
          params={{ billId: bill.id }}
          search={{ edit: false, page: 1 }}
          className={cn(
            'text-sm font-medium truncate block',
            isPaid
              ? 'line-through text-chill-text-muted hover:[text-decoration-line:underline_line-through]'
              : 'text-chill-text hover:underline',
          )}
        >
          {bill.name}
        </Link>
        <p className="text-xs text-chill-text-muted tabular-nums">
          {formatCurrency(bill.amountExpected)} &middot;{' '}
          {formatDueLabel(bill.dueDayOfMonth)}
        </p>
      </div>

      {bill.isAutoPay && <Badge variant="teal">Auto</Badge>}

      {isPaid ? (
        <Badge variant="default">Paid</Badge>
      ) : (
        <Button variant="pay" size="sm" onClick={onPay}>
          Mark Paid
        </Button>
      )}
    </li>
  );
}
