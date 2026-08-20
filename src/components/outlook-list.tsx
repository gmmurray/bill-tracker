import { Link, useRouterState } from '@tanstack/react-router';
import * as React from 'react';
import { FiChevronDown, FiChevronRight, FiRepeat } from 'react-icons/fi';
import { PayCycleDialog } from '#/components/pay-cycle-dialog';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { formatCurrency } from '#/features/bills/bills-helpers';
import {
  type BillCycle,
  BUCKET_LABELS,
  BUCKET_ORDER,
  type OutlookBucket,
} from '#/features/bills/bills-outlook';
import { cn } from '#/lib/utils';

function shortDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * The one-line explanation of why a row sits where it does.
 *
 * Every row states its actual cycle date. Nothing about a row's position is
 * left for the user to infer.
 */
export function describeTiming(cycle: BillCycle): string {
  const due = shortDate(cycle.cycleDueDate);
  const payBy = shortDate(cycle.payByDate);
  const scheduled = cycle.payByDate !== cycle.cycleDueDate;

  switch (cycle.status) {
    case 'PAID':
      return `Settled for ${due}`;
    case 'OVERDUE':
      return `Due ${due} · ${cycle.daysLate} day${cycle.daysLate === 1 ? '' : 's'} late`;
    case 'DUE_NOW':
      return scheduled ? `Pay date ${payBy} · due ${due}` : `Due ${due}`;
    case 'SCHEDULED':
      return scheduled ? `Pay date ${payBy} · due ${due}` : `Due ${due}`;
  }
}

const statusAccent: Record<BillCycle['status'], string> = {
  OVERDUE: 'border-l-4 border-l-chill-coral',
  DUE_NOW: 'border-l-4 border-l-chill-amber',
  SCHEDULED: 'border-l-4 border-l-transparent',
  PAID: 'border-l-4 border-l-transparent',
};

export function CycleRow({
  cycle,
  onPay,
  from,
}: {
  cycle: BillCycle;
  onPay: (cycle: BillCycle) => void;
  from?: 'dashboard' | 'history';
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 pl-3 pr-4 py-3 border-b border-chill-border last:border-0',
        statusAccent[cycle.status],
        cycle.isPaid && 'bg-chill-bg/60',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/bills/$billId"
            params={{ billId: cycle.bill.id }}
            search={{ edit: false, page: 1, from }}
            className={cn(
              'text-sm font-medium truncate',
              cycle.isPaid
                ? 'line-through text-chill-text-muted hover:[text-decoration-line:underline_line-through]'
                : 'text-chill-text hover:underline',
            )}
          >
            {cycle.bill.name}
          </Link>
          {cycle.bill.isAutoPay && (
            <FiRepeat
              size={13}
              className="shrink-0 text-chill-teal"
              aria-label="Auto-pay"
            />
          )}
        </div>
        <p className="text-xs text-chill-text-muted tabular-nums mt-0.5">
          {describeTiming(cycle)}
        </p>
      </div>

      {/* The amount is the payload of a bill tracker, so it outranks the bill
          name typographically rather than tying with it. */}
      <span
        className={cn(
          'text-base tabular-nums tracking-tight shrink-0',
          cycle.isPaid
            ? 'text-chill-text-muted font-medium'
            : 'text-chill-text font-semibold',
        )}
      >
        {formatCurrency(cycle.amountCents)}
      </span>

      <div className="shrink-0 w-24 flex justify-end">
        {cycle.isPaid ? (
          <Badge variant="teal">Paid</Badge>
        ) : (
          <Button variant="pay" size="sm" onClick={() => onPay(cycle)}>
            Mark Paid
          </Button>
        )}
      </div>
    </li>
  );
}

/** Does this section hold anything the user can settle today? */
function hasActionable(cycles: BillCycle[]): boolean {
  return cycles.some(c => c.status === 'OVERDUE' || c.status === 'DUE_NOW');
}

const bucketHeaderStyles: Record<OutlookBucket, string> = {
  OVERDUE: 'bg-chill-peach border-chill-peach-border',
  DUE_NOW: 'bg-chill-amber-light border-chill-peach-border',
  THIS_MONTH: 'bg-chill-surface border-chill-border',
  NEXT_MONTH: 'bg-chill-surface border-chill-border',
};

export function BucketSection({
  bucket,
  cycles,
  onPay,
  from,
}: {
  bucket: OutlookBucket;
  cycles: BillCycle[];
  onPay: (cycle: BillCycle) => void;
  from?: 'dashboard' | 'history';
}) {
  const owed = cycles.filter(c => !c.isPaid);
  const settledCents = cycles
    .filter(c => c.isPaid)
    .reduce((sum, c) => sum + c.amountCents, 0);
  const owedCents = owed.reduce((sum, c) => sum + c.amountCents, 0);
  const fullySettled = cycles.length > 0 && owed.length === 0;

  // Sections open by default only when they hold something to act on today.
  // `THIS_MONTH` and `NEXT_MONTH` never do — overdue and due-now cycles are
  // routed to their own buckets, so those two only ever hold scheduled and
  // settled rows. Their headers still carry the count and total, so folding
  // them hides the rows without hiding that they exist.
  const [collapsed, setCollapsed] = React.useState(!hasActionable(cycles));

  if (cycles.length === 0) return null;

  const headingId = `bucket-${bucket}`;

  return (
    <section>
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
        aria-controls={`${headingId}-rows`}
        className={cn(
          'w-full flex items-center gap-2 px-4 py-2.5 border-b text-left',
          'hover:brightness-[0.98] transition-[filter] cursor-pointer',
          bucketHeaderStyles[bucket],
        )}
      >
        {collapsed ? (
          <FiChevronRight
            size={15}
            className="text-chill-text-muted shrink-0"
            aria-hidden="true"
          />
        ) : (
          <FiChevronDown
            size={15}
            className="text-chill-text-muted shrink-0"
            aria-hidden="true"
          />
        )}
        <span className="text-sm font-semibold text-chill-text">
          {BUCKET_LABELS[bucket]}
        </span>
        {owed.length > 0 && (
          <Badge variant={bucket === 'OVERDUE' ? 'coral' : 'default'}>
            {owed.length}
          </Badge>
        )}
        <span className="ml-auto text-sm text-chill-text-muted tabular-nums">
          {fullySettled
            ? `${cycles.length} settled · ${formatCurrency(settledCents)}`
            : formatCurrency(owedCents)}
        </span>
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        )}
      >
        <ul id={`${headingId}-rows`} className="overflow-hidden">
          {cycles.map(cycle => (
            <CycleRow key={cycle.key} cycle={cycle} onPay={onPay} from={from} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Renders every bucket that has content, in urgency order.
 *
 * Takes an already-derived cycle list and never filters it further — grouping
 * and ordering only. Anything a caller hands in will be rendered.
 */
export function OutlookList({
  cycles,
  emptyMessage = 'Nothing here.',
}: {
  cycles: BillCycle[];
  emptyMessage?: string;
}) {
  const [payTarget, setPayTarget] = React.useState<BillCycle | null>(null);

  // This list renders on the dashboard and inside the globally-mounted drawer,
  // so the origin has to be read at render time rather than hardcoded — the
  // drawer can be open on any route. Unrecognised routes send no `from`, and
  // bill detail falls back to its default back link.
  const pathname = useRouterState({ select: s => s.location.pathname });
  const from =
    pathname === '/dashboard'
      ? ('dashboard' as const)
      : pathname === '/history'
        ? ('history' as const)
        : undefined;

  const byBucket = React.useMemo(() => {
    const grouped = {
      OVERDUE: [] as BillCycle[],
      DUE_NOW: [] as BillCycle[],
      THIS_MONTH: [] as BillCycle[],
      NEXT_MONTH: [] as BillCycle[],
    } satisfies Record<OutlookBucket, BillCycle[]>;
    for (const cycle of cycles) grouped[cycle.bucket].push(cycle);
    return grouped;
  }, [cycles]);

  if (cycles.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-chill-text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {BUCKET_ORDER.map(bucket => {
        const bucketCycles = byBucket[bucket];
        // Remount when a section crosses into or out of "has something to act
        // on", so its collapsed default is re-applied — settling the last
        // actionable row folds the section away, and a new one springs it open.
        return (
          <BucketSection
            key={`${bucket}:${hasActionable(bucketCycles)}`}
            bucket={bucket}
            cycles={bucketCycles}
            onPay={setPayTarget}
            from={from}
          />
        );
      })}

      {payTarget && (
        <PayCycleDialog
          cycle={payTarget}
          open={true}
          onOpenChange={open => {
            if (!open) setPayTarget(null);
          }}
        />
      )}
    </>
  );
}
