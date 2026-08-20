import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import * as React from 'react';
import { z } from 'zod';
import { Button } from '#/components/ui/button';
import { Card, CardBody, CardFooter } from '#/components/ui/card';
import { Checkbox } from '#/components/ui/checkbox';
import { formatCurrency } from '#/features/bills/bills-helpers';
import type { PaymentHistoryRow } from '#/features/bills/bills-model';
import {
  paymentHistoryQueryOptions,
  usePaymentHistory,
} from '#/features/bills/bills-queries';
import {
  clampPage,
  comparePaymentHistoryRows,
  derivePageSelectionState,
  groupPaymentHistoryByMonth,
  reconcileSelection,
  summarizeSelection,
} from '#/features/bills/history-helpers';
import { cn } from '#/lib/utils';

const HISTORY_PAGE_SIZE = 25;

// Optional so `<Link to="/history">` — including the sidebar nav link — needs
// no search prop. A required `page` field forces every link to that route to
// pass `search`, which is the mistake this already cost time on `/dashboard`.
const searchSchema = z.object({
  page: z.number().int().positive().optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/history')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context, deps }) => {
    const data = await context.queryClient.ensureQueryData(
      paymentHistoryQueryOptions(deps.page, HISTORY_PAGE_SIZE),
    );
    const totalPages = Math.max(1, Math.ceil(data.total / HISTORY_PAGE_SIZE));
    const clamped = clampPage(deps.page, totalPages);
    if (clamped !== deps.page) {
      throw redirect({ to: '/history', search: { page: clamped } });
    }
    return data;
  },
  head: () => ({
    meta: [{ title: 'Payment History · BillChill' }],
  }),
  component: PaymentHistoryPage,
});

function formatPaidDate(isoDatetime: string): string {
  return new Date(isoDatetime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCycleDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSelectionRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const opts: Intl.DateTimeFormatOptions =
    startDate.getFullYear() === endDate.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`;
}

function PaymentHistoryPage() {
  const { page: rawPage } = Route.useSearch();
  const page = rawPage ?? 1;
  const navigate = useNavigate({ from: Route.fullPath });

  const [selected, setSelected] = React.useState<
    Map<string, PaymentHistoryRow>
  >(new Map());
  const [showOnly, setShowOnly] = React.useState(false);
  const previousPageRef = React.useRef<{
    page: number;
    ids: Set<string>;
    total: number;
  } | null>(null);

  const historyQuery = usePaymentHistory(page, HISTORY_PAGE_SIZE);

  // Known edge (see docs/pages/history.md): editing or deleting an instance
  // elsewhere can leave the selection map stale. When this exact page
  // refetches (invalidation, not navigation), refresh any selected row still
  // present and drop ones that vanished — but only treat a vanished row as
  // deleted if the ledger actually shrank; a new payment elsewhere can just
  // as easily push it onto the next page.
  React.useEffect(() => {
    if (!historyQuery.data) return;
    const { rows, total: newTotal } = historyQuery.data;
    const newIds = new Set(rows.map(r => r.id));
    const prev = previousPageRef.current;
    if (prev && prev.page === page) {
      const didShrink = newTotal < prev.total;
      setSelected(sel => reconcileSelection(sel, prev.ids, rows, didShrink));
    }
    previousPageRef.current = { page, ids: newIds, total: newTotal };
  }, [historyQuery.data, page]);

  // Show only is scoped to a live selection — if it empties out from
  // unchecking rows one by one (not just Clear), fall back to the page view.
  React.useEffect(() => {
    if (selected.size === 0) setShowOnly(false);
  }, [selected.size]);

  if (historyQuery.isError) {
    return (
      <div className="px-6 py-8 max-w-5xl mx-auto">
        <div className="py-20 text-center text-sm text-red-500">
          Failed to load payment history.
        </div>
      </div>
    );
  }

  if (!historyQuery.data) return null;

  const { rows, total } = historyQuery.data;
  const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const sortedSelected = [...selected.values()].sort(comparePaymentHistoryRows);
  const visibleRows = showOnly ? sortedSelected : rows;
  const groups = groupPaymentHistoryByMonth(visibleRows);
  const summary = summarizeSelection(sortedSelected);
  const pageSelectionState = derivePageSelectionState(visibleRows, selected);

  function toggleRow(row: PaymentHistoryRow, checked: boolean) {
    setSelected(prev => {
      const next = new Map(prev);
      if (checked) next.set(row.id, row);
      else next.delete(row.id);
      return next;
    });
  }

  function toggleVisible(checked: boolean) {
    setSelected(prev => {
      const next = new Map(prev);
      for (const row of visibleRows) {
        if (checked) next.set(row.id, row);
        else next.delete(row.id);
      }
      return next;
    });
  }

  function handleClear() {
    setSelected(new Map());
    setShowOnly(false);
  }

  return (
    <div
      className={cn(
        'px-6 py-8 max-w-5xl mx-auto',
        selected.size > 0 && 'pb-24',
      )}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-chill-text">
          Payment History
        </h1>
        <p className="text-sm text-chill-text-muted mt-1">
          {total} payment{total === 1 ? '' : 's'} recorded
        </p>
        {total > 0 && (
          <p className="text-xs text-chill-text-muted mt-0.5">
            Select rows to total them up.
          </p>
        )}
      </div>

      {total === 0 ? (
        <Card>
          <CardBody className="px-6 py-10 text-center">
            <p className="text-sm text-chill-text-muted mb-3">
              No payments recorded yet.
            </p>
            <Link
              to="/dashboard"
              className="text-sm text-chill-teal hover:underline"
            >
              Go to Dashboard →
            </Link>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-chill-border text-left">
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      checked={pageSelectionState}
                      onCheckedChange={state => toggleVisible(state === true)}
                      aria-label={showOnly ? 'Select shown' : 'Select page'}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-chill-text-muted">
                    Paid
                  </th>
                  <th className="px-4 py-3 font-medium text-chill-text-muted">
                    Bill
                  </th>
                  <th className="px-4 py-3 font-medium text-chill-text-muted">
                    Cycle
                  </th>
                  <th className="px-4 py-3 font-medium text-chill-text-muted text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <React.Fragment key={group.key}>
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-2 bg-chill-bg text-xs font-semibold text-chill-text-muted uppercase tracking-wide border-y border-chill-border"
                      >
                        {group.label}
                      </td>
                    </tr>
                    {group.rows.map(row => (
                      <HistoryTableRow
                        key={row.id}
                        row={row}
                        checked={selected.has(row.id)}
                        onToggle={checked => toggleRow(row, checked)}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            <ul className="md:hidden divide-y divide-chill-border">
              {groups.map(group => (
                <React.Fragment key={group.key}>
                  <li className="px-4 py-2 bg-chill-bg text-xs font-semibold text-chill-text-muted uppercase tracking-wide border-b border-chill-border">
                    {group.label}
                  </li>
                  {group.rows.map(row => (
                    <HistoryMobileCard
                      key={row.id}
                      row={row}
                      checked={selected.has(row.id)}
                      onToggle={checked => toggleRow(row, checked)}
                    />
                  ))}
                </React.Fragment>
              ))}
            </ul>
          </CardBody>

          {!showOnly && (
            <CardFooter className="flex items-center justify-between">
              <Button
                variant="default"
                size="sm"
                disabled={page <= 1}
                onClick={() =>
                  navigate({ search: prev => ({ ...prev, page: page - 1 }) })
                }
              >
                ← Previous
              </Button>
              <span className="text-sm text-chill-text-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="default"
                size="sm"
                disabled={page >= totalPages}
                onClick={() =>
                  navigate({ search: prev => ({ ...prev, page: page + 1 }) })
                }
              >
                Next →
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-chill-border bg-chill-purple">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-chill-text">
              <span className="font-semibold">{summary.count} selected</span>
              {summary.rangeStart && summary.rangeEnd && (
                <>
                  {' · '}
                  {formatSelectionRange(summary.rangeStart, summary.rangeEnd)}
                </>
              )}
              {' · '}
              <span className="text-base font-semibold tracking-tight tabular-nums">
                {formatCurrency(summary.total)}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowOnly(s => !s)}
              >
                {showOnly ? 'Show all' : 'Show only'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTableRow({
  row,
  checked,
  onToggle,
}: {
  row: PaymentHistoryRow;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <tr className="border-b border-chill-border last:border-0">
      <td className="px-4 py-3">
        <Checkbox
          checked={checked}
          onCheckedChange={state => onToggle(state === true)}
          aria-label={`Select payment for ${row.billName}`}
        />
      </td>
      <td className="px-4 py-3 text-chill-text-muted">
        {formatPaidDate(row.paidAt)}
      </td>
      <td className="px-4 py-3">
        <Link
          to="/bills/$billId"
          params={{ billId: row.billId }}
          search={{ edit: false, page: 1 }}
          className="font-medium text-chill-text hover:underline"
        >
          {row.billName}
        </Link>
      </td>
      <td className="px-4 py-3 text-chill-text-muted">
        {formatCycleDate(row.dueDate)}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-base font-semibold tracking-tight tabular-nums">
          {formatCurrency(row.amountActual)}
        </span>
      </td>
    </tr>
  );
}

function HistoryMobileCard({
  row,
  checked,
  onToggle,
}: {
  row: PaymentHistoryRow;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <li className="px-4 py-4 flex items-start gap-3">
      <Checkbox
        checked={checked}
        onCheckedChange={state => onToggle(state === true)}
        aria-label={`Select payment for ${row.billName}`}
        className="mt-1"
      />
      <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/bills/$billId"
            params={{ billId: row.billId }}
            search={{ edit: false, page: 1 }}
            className="font-medium text-chill-text hover:underline block truncate"
          >
            {row.billName}
          </Link>
          <p className="text-xs text-chill-text-muted mt-0.5">
            Paid {formatPaidDate(row.paidAt)} · Cycle{' '}
            {formatCycleDate(row.dueDate)}
          </p>
        </div>
        <span className="text-base font-semibold tracking-tight tabular-nums shrink-0">
          {formatCurrency(row.amountActual)}
        </span>
      </div>
    </li>
  );
}
