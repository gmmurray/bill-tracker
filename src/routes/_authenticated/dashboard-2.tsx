import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { useBillOutlook } from '#/components/bill-outlook-provider';
import { OutlookList } from '#/components/outlook-list';
import { Card } from '#/components/ui/card';
import { formatCurrency, formatOrdinal } from '#/features/bills/bills-helpers';
import {
  type BillCycle,
  filterCyclesBySchedule,
} from '#/features/bills/bills-outlook';
import {
  billsQueryOptions,
  recentInstancesQueryOptions,
} from '#/features/bills/bills-queries';
import { paySchedulesQueryOptions } from '#/features/pay-schedules/pay-schedules-queries';
import { cn } from '#/lib/utils';

const searchSchema = z.object({
  tab: z.string().catch('all'),
});

export const Route = createFileRoute('/_authenticated/dashboard-2')({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: 'Dashboard · BillChill' }],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        billsQueryOptions({ scheduleId: 'all', manualOnly: false }),
      ),
      context.queryClient.ensureQueryData(paySchedulesQueryOptions()),
      context.queryClient.ensureQueryData(recentInstancesQueryOptions()),
    ]),
  component: DashboardPage,
});

function DashboardPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { today, outlook, schedules, bills } = useBillOutlook();

  const visibleCycles = filterCyclesBySchedule(outlook.cycles, tab);

  // Month progress, derived from the same cycles the list renders — so the
  // number at the top always accounts for exactly the rows below it.
  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-`;
  const monthCycles = outlook.cycles.filter(c =>
    c.cycleDueDate.startsWith(monthPrefix),
  );
  const monthPaid = monthCycles.filter(c => c.isPaid);
  const monthPaidCents = monthPaid.reduce((sum, c) => sum + c.amountCents, 0);
  const monthTotalCents = monthCycles.reduce(
    (sum, c) => sum + c.amountCents,
    0,
  );
  const monthPct =
    monthCycles.length === 0
      ? 0
      : Math.round((monthPaid.length / monthCycles.length) * 100);

  const owedNowCount =
    outlook.totals.OVERDUE.count + outlook.totals.DUE_NOW.count;

  const hasUnassigned = outlook.cycles.some(
    c => c.bill.payScheduleId === null || c.bill.isOrphaned,
  );

  const tabs: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All' },
    ...schedules.map(s => ({
      id: s.id,
      label: `${s.name} (${formatOrdinal(s.payDate)})`,
    })),
    ...(hasUnassigned ? [{ id: 'unassigned', label: 'Unassigned' }] : []),
  ];

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-chill-text">
          {`Today, ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
        </h1>
        <p className="text-sm text-chill-text-muted mt-1">
          Everything due through the end of next month.
        </p>
      </div>

      {bills.length === 0 ? (
        <Card>
          <div className="px-6 py-12 text-sm text-chill-text-muted text-center">
            No bills yet.{' '}
            <Link
              to="/bills"
              search={{ scheduleId: 'all', manualOnly: false, actions: false }}
              className="text-chill-teal hover:underline"
            >
              Add your first bill →
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/*
            Two cards, not three. Each answers a question the list below can't:
            what to act on right now, and how far through the month you are.
            Per-period totals already live in the bucket headers, so an
            aggregate across the whole horizon only repeated them — and its
            window ran anywhere from four to nearly nine weeks depending on the
            date, roughly doubling at each month rollover.
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard
              label="Owed now"
              value={formatCurrency(
                outlook.totals.OVERDUE.cents + outlook.totals.DUE_NOW.cents,
              )}
              detail={
                owedNowCount === 0
                  ? 'Nothing due'
                  : `${owedNowCount} bill${owedNowCount === 1 ? '' : 's'}`
              }
              tone={outlook.totals.OVERDUE.count > 0 ? 'alert' : 'neutral'}
            />
            <Card className="p-4 flex flex-col justify-between">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-chill-text-muted">
                  Settled this month
                </span>
                <span className="text-xs text-chill-text-muted tabular-nums">
                  {monthPaid.length}/{monthCycles.length}
                </span>
              </div>
              <div className="text-lg font-semibold text-chill-text tabular-nums mt-1">
                {formatCurrency(monthPaidCents)}
              </div>
              <div
                className="h-1.5 rounded-full bg-chill-teal-light mt-2 overflow-hidden"
                role="progressbar"
                aria-valuenow={monthPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Bills settled this month"
              >
                <div
                  className="h-full bg-chill-teal rounded-full transition-[width] duration-500"
                  style={{ width: `${monthPct}%` }}
                />
              </div>
              <span className="text-xs text-chill-text-muted tabular-nums mt-1.5">
                of {formatCurrency(monthTotalCents)}
              </span>
            </Card>
          </div>

          {tabs.length > 1 && (
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1"
              role="tablist"
              aria-label="Filter by pay schedule"
            >
              {tabs.map(t => (
                <TabButton
                  key={t.id}
                  label={t.label}
                  owed={
                    filterCyclesBySchedule(outlook.cycles, t.id).filter(
                      c => !c.isPaid,
                    ).length
                  }
                  selected={t.id === tab}
                  onSelect={() =>
                    navigate({ search: prev => ({ ...prev, tab: t.id }) })
                  }
                />
              ))}
            </div>
          )}

          <Card>
            <OutlookList
              cycles={visibleCycles}
              emptyMessage={
                tab === 'all'
                  ? 'No bills scheduled through next month.'
                  : 'No bills on this schedule through next month.'
              }
            />
          </Card>

          <OutlookFooter cycles={visibleCycles} today={today} />
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'alert' | 'neutral';
}) {
  return (
    <Card
      className={cn(
        'p-4 flex flex-col justify-between',
        tone === 'alert' && 'bg-chill-peach border-chill-peach-border',
      )}
    >
      <span className="text-xs text-chill-text-muted">{label}</span>
      <span className="text-lg font-semibold text-chill-text tabular-nums mt-1">
        {value}
      </span>
      <span className="text-xs text-chill-text-muted mt-1.5">{detail}</span>
    </Card>
  );
}

function TabButton({
  label,
  owed,
  selected,
  onSelect,
}: {
  label: string;
  owed: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        selected
          ? 'bg-chill-purple text-chill-text'
          : 'text-chill-text-muted hover:bg-chill-purple-light',
      )}
    >
      {label}
      {owed > 0 && (
        <span className="ml-1.5 tabular-nums text-chill-text-muted">
          {owed}
        </span>
      )}
    </button>
  );
}

/**
 * A countable footer, not a reassurance.
 *
 * It states exactly what the list contains and how far it reaches, so the user
 * can check the claim against the rows rather than take it on faith.
 */
function OutlookFooter({
  cycles,
  today,
}: {
  cycles: BillCycle[];
  today: Date;
}) {
  const billCount = new Set(cycles.map(c => c.bill.id)).size;
  if (billCount === 0) return null;

  const horizonEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  return (
    <p className="text-xs text-chill-text-muted text-center">
      {cycles.length} cycle{cycles.length === 1 ? '' : 's'} across {billCount}{' '}
      bill{billCount === 1 ? '' : 's'}, through{' '}
      {horizonEnd.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
      })}
      .
    </p>
  );
}
