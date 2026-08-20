import { describe, expect, it } from 'vitest';
import type { PaymentHistoryRow } from '#/features/bills/bills-model';
import {
  clampPage,
  comparePaymentHistoryRows,
  derivePageSelectionState,
  groupPaymentHistoryByMonth,
  reconcileSelection,
  summarizeSelection,
} from '#/features/bills/history-helpers';

function makeRow(
  overrides: Partial<PaymentHistoryRow> & { id: string },
): PaymentHistoryRow {
  return {
    userId: 'user-1',
    billId: 'bill-1',
    dueDate: '2026-08-01',
    amountActual: 10_000,
    paidAt: '2026-08-01T12:00:00.000Z',
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
    billName: 'Test Bill',
    billCategory: null,
    billIsActive: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// comparePaymentHistoryRows
// ---------------------------------------------------------------------------

describe('comparePaymentHistoryRows', () => {
  it('sorts by paidAt descending', () => {
    const older = makeRow({ id: 'a', paidAt: '2026-08-01T00:00:00.000Z' });
    const newer = makeRow({ id: 'b', paidAt: '2026-08-15T00:00:00.000Z' });
    expect([older, newer].sort(comparePaymentHistoryRows)).toEqual([
      newer,
      older,
    ]);
  });

  it('breaks a paidAt tie with dueDate descending', () => {
    const sameInstant = '2026-08-15T09:00:00.000Z';
    const earlierCycle = makeRow({
      id: 'a',
      paidAt: sameInstant,
      dueDate: '2026-07-01',
    });
    const laterCycle = makeRow({
      id: 'b',
      paidAt: sameInstant,
      dueDate: '2026-09-01',
    });
    expect([earlierCycle, laterCycle].sort(comparePaymentHistoryRows)).toEqual([
      laterCycle,
      earlierCycle,
    ]);
  });

  it('breaks a paidAt and dueDate tie with id descending', () => {
    const sameInstant = '2026-08-15T09:00:00.000Z';
    const sameDueDate = '2026-08-01';
    const rowA = makeRow({
      id: 'aaa',
      paidAt: sameInstant,
      dueDate: sameDueDate,
    });
    const rowB = makeRow({
      id: 'bbb',
      paidAt: sameInstant,
      dueDate: sameDueDate,
    });
    const rowC = makeRow({
      id: 'ccc',
      paidAt: sameInstant,
      dueDate: sameDueDate,
    });
    expect([rowA, rowC, rowB].sort(comparePaymentHistoryRows)).toEqual([
      rowC,
      rowB,
      rowA,
    ]);
  });
});

// ---------------------------------------------------------------------------
// groupPaymentHistoryByMonth
// ---------------------------------------------------------------------------

describe('groupPaymentHistoryByMonth', () => {
  it('groups rows within the same month into one bucket', () => {
    const rows = [
      makeRow({ id: 'a', paidAt: '2026-08-20T00:00:00.000Z' }),
      makeRow({ id: 'b', paidAt: '2026-08-10T00:00:00.000Z' }),
      makeRow({ id: 'c', paidAt: '2026-08-01T00:00:00.000Z' }),
    ];
    const groups = groupPaymentHistoryByMonth(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('August 2026');
    expect(groups[0]?.rows).toHaveLength(3);
  });

  it('splits into separate buckets across a month boundary', () => {
    const rows = [
      makeRow({ id: 'a', paidAt: '2026-08-05T00:00:00.000Z' }),
      makeRow({ id: 'b', paidAt: '2026-07-28T00:00:00.000Z' }),
    ];
    const groups = groupPaymentHistoryByMonth(rows);
    expect(groups.map(g => g.label)).toEqual(['August 2026', 'July 2026']);
  });

  it('splits into separate buckets across a year boundary', () => {
    const rows = [
      makeRow({ id: 'a', paidAt: '2026-01-05T00:00:00.000Z' }),
      makeRow({ id: 'b', paidAt: '2025-12-28T00:00:00.000Z' }),
      makeRow({ id: 'c', paidAt: '2025-12-01T00:00:00.000Z' }),
    ];
    const groups = groupPaymentHistoryByMonth(rows);
    expect(groups.map(g => g.label)).toEqual(['January 2026', 'December 2025']);
    expect(groups[1]?.rows).toHaveLength(2);
  });

  it('returns an empty array for no rows', () => {
    expect(groupPaymentHistoryByMonth([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// summarizeSelection
// ---------------------------------------------------------------------------

describe('summarizeSelection', () => {
  it('returns zeroed-out summary for an empty selection', () => {
    expect(summarizeSelection([])).toEqual({
      count: 0,
      total: 0,
      rangeStart: null,
      rangeEnd: null,
    });
  });

  it('omits the date range for a single-row selection', () => {
    const row = makeRow({
      id: 'a',
      amountActual: 5_000,
      paidAt: '2026-08-15T00:00:00.000Z',
    });
    expect(summarizeSelection([row])).toEqual({
      count: 1,
      total: 5_000,
      rangeStart: null,
      rangeEnd: null,
    });
  });

  it('sums amounts and reports the first/last paidAt for multiple rows', () => {
    const rows = [
      makeRow({
        id: 'a',
        amountActual: 1_000,
        paidAt: '2026-08-19T00:00:00.000Z',
      }),
      makeRow({
        id: 'b',
        amountActual: 2_000,
        paidAt: '2026-08-01T00:00:00.000Z',
      }),
      makeRow({
        id: 'c',
        amountActual: 3_000,
        paidAt: '2026-08-10T00:00:00.000Z',
      }),
    ];
    expect(summarizeSelection(rows)).toEqual({
      count: 3,
      total: 6_000,
      rangeStart: '2026-08-01T00:00:00.000Z',
      rangeEnd: '2026-08-19T00:00:00.000Z',
    });
  });
});

// ---------------------------------------------------------------------------
// clampPage
// ---------------------------------------------------------------------------

describe('clampPage', () => {
  it('leaves an in-range page unchanged', () => {
    expect(clampPage(2, 5)).toBe(2);
  });

  it('clamps a page beyond the last page down to the last page', () => {
    expect(clampPage(99, 5)).toBe(5);
  });

  it('clamps to page 1 when there are no rows at all', () => {
    expect(clampPage(3, 0)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// derivePageSelectionState
// ---------------------------------------------------------------------------

describe('derivePageSelectionState', () => {
  const rowA = makeRow({ id: 'a' });
  const rowB = makeRow({ id: 'b' });

  it('is false when no visible rows are selected', () => {
    expect(derivePageSelectionState([rowA, rowB], new Map())).toBe(false);
  });

  it('is false when there are no visible rows', () => {
    expect(derivePageSelectionState([], new Map([['a', rowA]]))).toBe(false);
  });

  it('is true when every visible row is selected', () => {
    const selected = new Map([
      ['a', rowA],
      ['b', rowB],
    ]);
    expect(derivePageSelectionState([rowA, rowB], selected)).toBe(true);
  });

  it('is indeterminate when only some visible rows are selected', () => {
    const selected = new Map([['a', rowA]]);
    expect(derivePageSelectionState([rowA, rowB], selected)).toBe(
      'indeterminate',
    );
  });
});

// ---------------------------------------------------------------------------
// reconcileSelection
// ---------------------------------------------------------------------------

describe('reconcileSelection', () => {
  it('refreshes a selected row whose amountActual changed', () => {
    const staleRow = makeRow({ id: 'a', amountActual: 1_000 });
    const freshRow = makeRow({ id: 'a', amountActual: 2_500 });
    const selected = new Map([['a', staleRow]]);

    const result = reconcileSelection(
      selected,
      new Set(['a']),
      [freshRow],
      false,
    );
    expect(result.get('a')).toBe(freshRow);
  });

  it('does not drop a selected row that merely shifted off the page (didShrink: false)', () => {
    const rowA = makeRow({ id: 'a' });
    const rowB = makeRow({ id: 'b' });
    const selected = new Map([
      ['a', rowA],
      ['b', rowB],
    ]);
    const previousPageIds = new Set(['a', 'b']);
    const currentPageRows = [rowA]; // b pushed onto the next page, not deleted

    const result = reconcileSelection(
      selected,
      previousPageIds,
      currentPageRows,
      false,
    );
    expect([...result.keys()].sort()).toEqual(['a', 'b']);
  });

  it('drops a selected row when it vanished and didShrink is true', () => {
    const rowA = makeRow({ id: 'a' });
    const rowB = makeRow({ id: 'b' });
    const selected = new Map([
      ['a', rowA],
      ['b', rowB],
    ]);
    const previousPageIds = new Set(['a', 'b']);
    const currentPageRows = [rowA]; // b was deleted elsewhere

    const result = reconcileSelection(
      selected,
      previousPageIds,
      currentPageRows,
      true,
    );
    expect([...result.keys()]).toEqual(['a']);
  });

  it('leaves selections outside the previous page untouched', () => {
    const rowA = makeRow({ id: 'a' });
    const rowFromOtherPage = makeRow({ id: 'other-page-row' });
    const selected = new Map([
      ['a', rowA],
      ['other-page-row', rowFromOtherPage],
    ]);
    const previousPageIds = new Set(['a']);
    const currentPageRows = [rowA];

    const result = reconcileSelection(
      selected,
      previousPageIds,
      currentPageRows,
      true,
    );
    expect([...result.keys()].sort()).toEqual(['a', 'other-page-row']);
  });

  it('returns the same Map instance when nothing changed', () => {
    const rowA = makeRow({ id: 'a' });
    const selected = new Map([['a', rowA]]);
    const result = reconcileSelection(selected, new Set(['a']), [rowA], false);
    expect(result).toBe(selected);
  });
});
