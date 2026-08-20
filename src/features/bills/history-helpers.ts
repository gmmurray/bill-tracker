import type { PaymentHistoryRow } from './bills-model';

/**
 * Total order for the payment history ledger: `paidAt DESC, dueDate DESC,
 * id DESC`. `paidAt` is not unique — Log Historical Payment takes a
 * user-supplied timestamp, and backfilling stamps many rows identically — so
 * without the trailing tiebreaks, offset pagination can duplicate or drop
 * rows across pages.
 */
export function comparePaymentHistoryRows(
  a: PaymentHistoryRow,
  b: PaymentHistoryRow,
): number {
  if (a.paidAt !== b.paidAt) return a.paidAt < b.paidAt ? 1 : -1;
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? 1 : -1;
  if (a.id !== b.id) return a.id < b.id ? 1 : -1;
  return 0;
}

export type PaymentHistoryMonthGroup = {
  key: string;
  label: string;
  rows: PaymentHistoryRow[];
};

/**
 * Groups already-sorted (paidAt DESC) rows into contiguous month buckets.
 * Assumes the input is sorted by `comparePaymentHistoryRows` — a month never
 * reappears once its run ends.
 */
export function groupPaymentHistoryByMonth(
  rows: PaymentHistoryRow[],
): PaymentHistoryMonthGroup[] {
  const groups: PaymentHistoryMonthGroup[] = [];
  let current: PaymentHistoryMonthGroup | null = null;

  for (const row of rows) {
    const key = row.paidAt.slice(0, 7);
    if (!current || current.key !== key) {
      current = { key, label: formatMonthLabel(key), rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }

  return groups;
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year!, month! - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export type SelectionSummary = {
  count: number;
  total: number;
  rangeStart: string | null;
  rangeEnd: string | null;
};

/**
 * Sums the selection and reports its `paidAt` span. The range is omitted for
 * a single-row selection — a range of one date reads as a bug, not an answer.
 */
export function summarizeSelection(
  rows: PaymentHistoryRow[],
): SelectionSummary {
  if (rows.length === 0) {
    return { count: 0, total: 0, rangeStart: null, rangeEnd: null };
  }

  const total = rows.reduce((sum, r) => sum + r.amountActual, 0);

  if (rows.length === 1) {
    return { count: 1, total, rangeStart: null, rangeEnd: null };
  }

  let rangeStart = rows[0]!.paidAt;
  let rangeEnd = rows[0]!.paidAt;
  for (const row of rows) {
    if (row.paidAt < rangeStart) rangeStart = row.paidAt;
    if (row.paidAt > rangeEnd) rangeEnd = row.paidAt;
  }

  return { count: rows.length, total, rangeStart, rangeEnd };
}

/** Clamps a positive `page` to the last real page, given a known total. */
export function clampPage(page: number, totalPages: number): number {
  return Math.min(page, Math.max(1, totalPages));
}

/**
 * Derives the "Select page" header checkbox state from whichever rows are
 * currently visible (a page, or the full selection in Show only mode).
 */
export function derivePageSelectionState(
  visibleRows: PaymentHistoryRow[],
  selected: Map<string, PaymentHistoryRow>,
): boolean | 'indeterminate' {
  if (visibleRows.length === 0) return false;
  const selectedCount = visibleRows.filter(r => selected.has(r.id)).length;
  if (selectedCount === 0) return false;
  if (selectedCount === visibleRows.length) return true;
  return 'indeterminate';
}

/**
 * Drops selected rows that used to be on this page but disappeared from the
 * refetch — the signal that they were deleted or otherwise changed elsewhere
 * (bill detail). Only checks the current page, so it can't catch every stale
 * entry, but it covers editing something you just selected. Returns the same
 * Map instance when nothing changed, so callers can skip a re-render.
 */
export function pruneStaleSelection(
  selected: Map<string, PaymentHistoryRow>,
  previousPageIds: ReadonlySet<string>,
  currentPageRows: PaymentHistoryRow[],
): Map<string, PaymentHistoryRow> {
  const currentIds = new Set(currentPageRows.map(r => r.id));
  const staleIds = [...previousPageIds].filter(
    id => selected.has(id) && !currentIds.has(id),
  );

  if (staleIds.length === 0) return selected;

  const next = new Map(selected);
  for (const id of staleIds) next.delete(id);
  return next;
}
