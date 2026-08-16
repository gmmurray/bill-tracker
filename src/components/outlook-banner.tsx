import { useNavigate } from '@tanstack/react-router';
import { useBillOutlook } from '#/components/bill-outlook-provider';
import { Button } from '#/components/ui/button';
import { formatCurrency } from '#/features/bills/bills-helpers';
import { summarizeAttention } from '#/features/bills/bills-outlook';
import { cn } from '#/lib/utils';

/**
 * Says what is owed and how much, rather than that "something needs attention".
 *
 * The count and the dollar figure come from the same outlook the dashboard and
 * drawer render, so the banner can't claim a number no surface can account for.
 */
export function OutlookBanner() {
  const navigate = useNavigate();
  const { outlook } = useBillOutlook();
  const summary = summarizeAttention(outlook);

  if (summary.tone === 'clear') return null;

  const { OVERDUE: overdue, DUE_NOW: dueNow } = outlook.totals;

  const parts: string[] = [];
  if (overdue.count > 0) parts.push(`${overdue.count} overdue`);
  if (dueNow.count > 0) parts.push(`${dueNow.count} to pay now`);

  return (
    <div
      className={cn(
        'px-4 py-3 flex items-center gap-3 border-b border-l-4',
        summary.tone === 'overdue'
          ? 'bg-chill-peach border-chill-peach-border border-l-chill-coral'
          : 'bg-chill-amber-light border-chill-peach-border border-l-chill-amber',
      )}
    >
      <span className="text-sm text-chill-text flex-1">
        <span className="font-medium">{parts.join(', ')}</span>
        <span className="text-chill-text-muted tabular-nums">
          {' · '}
          {formatCurrency(summary.cents)}
        </span>
      </span>
      <Button
        variant="default"
        size="sm"
        onClick={() =>
          navigate({ search: prev => ({ ...prev, actions: true }), to: '.' })
        }
      >
        Review →
      </Button>
    </div>
  );
}
