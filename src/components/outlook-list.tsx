import { Link } from '@tanstack/react-router';
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
  DUE_NOW: 'border-l-4 border-l-amber-500',
  SCHEDULED: 'border-l-4 border-l-transparent',
  PAID: 'border-l-4 border-l-transparent',
};

export function CycleRow({
  cycle,
  onPay,
}: {
  cycle: BillCycle;
  onPay: (cycle: BillCycle) => void;
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
            search={{ edit: false, page: 1 }}
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

      <span
        className={cn(
          'text-sm tabular-nums shrink-0',
          cycle.isPaid
            ? 'text-chill-text-muted'
            : 'text-chill-text font-medium',
        )}
      >
        {formatCurrency(cycle.amountCents)}
      </span>

      <div className="shrink-0 w-24 flex justify-end">
        {cycle.isPaid ? (
          <Badge variant="default">Paid</Badge>
        ) : (
          <Button variant="pay" size="sm" onClick={() => onPay(cycle)}>
            Mark Paid
          </Button>
        )}
      </div>
    </li>
  );
}

const bucketHeaderStyles: Record<OutlookBucket, string> = {
  OVERDUE: 'bg-chill-peach border-chill-peach-border',
  DUE_NOW: 'bg-amber-50 border-amber-200',
  THIS_MONTH: 'bg-chill-surface border-chill-border',
  NEXT_MONTH: 'bg-chill-surface border-chill-border',
};

export function BucketSection({
  bucket,
  cycles,
  onPay,
}: {
  bucket: OutlookBucket;
  cycles: BillCycle[];
  onPay: (cycle: BillCycle) => void;
}) {
  const owed = cycles.filter(c => !c.isPaid);
  const settledCents = cycles
    .filter(c => c.isPaid)
    .reduce((sum, c) => sum + c.amountCents, 0);
  const owedCents = owed.reduce((sum, c) => sum + c.amountCents, 0);
  const fullySettled = cycles.length > 0 && owed.length === 0;

  // A section with nothing left to act on folds away by default. The header
  // keeps the count and the total on screen, so collapsing hides the rows
  // without hiding the fact that they exist.
  const [collapsed, setCollapsed] = React.useState(fullySettled);

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
            <CycleRow key={cycle.key} cycle={cycle} onPay={onPay} />
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
        // Remount when a section crosses into or out of "nothing left to do",
        // so its collapsed default is re-applied — paying the last owed bill in
        // a section folds it away, and a new one springs it back open.
        const fullySettled =
          bucketCycles.length > 0 && bucketCycles.every(c => c.isPaid);
        return (
          <BucketSection
            key={`${bucket}:${fullySettled}`}
            bucket={bucket}
            cycles={bucketCycles}
            onPay={setPayTarget}
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
