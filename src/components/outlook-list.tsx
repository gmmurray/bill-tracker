import { Link } from '@tanstack/react-router';
import * as React from 'react';
import { FiRepeat } from 'react-icons/fi';
import { PayCycleDialog } from '#/components/pay-cycle-dialog';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { formatCurrency } from '#/features/bills/bills-helpers';
import {
  type BillCycle,
  BUCKET_LABELS,
  BUCKET_ORDER,
  type OutlookBucket,
  type OutlookTotals,
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
  totals,
  onPay,
}: {
  bucket: OutlookBucket;
  cycles: BillCycle[];
  totals: OutlookTotals;
  onPay: (cycle: BillCycle) => void;
}) {
  if (cycles.length === 0) return null;

  return (
    <section>
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 border-b',
          bucketHeaderStyles[bucket],
        )}
      >
        <span className="text-sm font-semibold text-chill-text">
          {BUCKET_LABELS[bucket]}
        </span>
        {totals.count > 0 && (
          <Badge variant={bucket === 'OVERDUE' ? 'coral' : 'default'}>
            {totals.count}
          </Badge>
        )}
        <span className="ml-auto text-sm text-chill-text-muted tabular-nums">
          {totals.count > 0 ? formatCurrency(totals.cents) : 'All settled'}
        </span>
      </div>
      <ul>
        {cycles.map(cycle => (
          <CycleRow key={cycle.key} cycle={cycle} onPay={onPay} />
        ))}
      </ul>
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

  const grouped = React.useMemo(() => {
    const byBucket = {
      OVERDUE: [] as BillCycle[],
      DUE_NOW: [] as BillCycle[],
      THIS_MONTH: [] as BillCycle[],
      NEXT_MONTH: [] as BillCycle[],
    } satisfies Record<OutlookBucket, BillCycle[]>;
    const totals = {
      OVERDUE: { count: 0, cents: 0 },
      DUE_NOW: { count: 0, cents: 0 },
      THIS_MONTH: { count: 0, cents: 0 },
      NEXT_MONTH: { count: 0, cents: 0 },
    } satisfies Record<OutlookBucket, OutlookTotals>;

    for (const cycle of cycles) {
      byBucket[cycle.bucket].push(cycle);
      if (!cycle.isPaid) {
        totals[cycle.bucket].count += 1;
        totals[cycle.bucket].cents += cycle.amountCents;
      }
    }
    return { byBucket, totals };
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
      {BUCKET_ORDER.map(bucket => (
        <BucketSection
          key={bucket}
          bucket={bucket}
          cycles={grouped.byBucket[bucket]}
          totals={grouped.totals[bucket]}
          onPay={setPayTarget}
        />
      ))}

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
