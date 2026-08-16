import { describe, expect, it } from 'vitest';
import {
  assertCanonicalCycle,
  clampDayToMonth,
  computeEligibleHistoricalCycles,
  computeExtendedHistoricalCycle,
  computeNearestUnpaidDueDate,
  formatCurrency,
  formatDueLabel,
  formatOrdinal,
  msUntilNextMidnight,
} from '#/features/bills/bills-helpers';
import type { BillInstance } from '#/features/bills/bills-model';

function makeInstance(billId: string, dueDate: string): BillInstance {
  return {
    id: `inst-${dueDate}`,
    userId: 'user-1',
    billId,
    dueDate,
    amountActual: 1000,
    paidAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe('formatCurrency', () => {
  it('formats whole dollar amounts', () => {
    expect(formatCurrency(1000)).toBe('$10.00');
    expect(formatCurrency(100)).toBe('$1.00');
  });

  it('formats cents with two decimal places', () => {
    expect(formatCurrency(150)).toBe('$1.50');
    expect(formatCurrency(9999)).toBe('$99.99');
    expect(formatCurrency(1)).toBe('$0.01');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

// ---------------------------------------------------------------------------
// formatOrdinal
// ---------------------------------------------------------------------------

describe('formatOrdinal', () => {
  it('uses st for 1, 21, 31', () => {
    expect(formatOrdinal(1)).toBe('1st');
    expect(formatOrdinal(21)).toBe('21st');
    expect(formatOrdinal(31)).toBe('31st');
  });

  it('uses nd for 2, 22', () => {
    expect(formatOrdinal(2)).toBe('2nd');
    expect(formatOrdinal(22)).toBe('22nd');
  });

  it('uses rd for 3, 23', () => {
    expect(formatOrdinal(3)).toBe('3rd');
    expect(formatOrdinal(23)).toBe('23rd');
  });

  it('uses th for 4–20 and all others', () => {
    expect(formatOrdinal(4)).toBe('4th');
    expect(formatOrdinal(11)).toBe('11th');
    expect(formatOrdinal(12)).toBe('12th');
    expect(formatOrdinal(13)).toBe('13th');
    expect(formatOrdinal(20)).toBe('20th');
  });
});

// ---------------------------------------------------------------------------
// formatDueLabel
// ---------------------------------------------------------------------------

describe('formatDueLabel', () => {
  it('prefixes "Due the" before the ordinal', () => {
    expect(formatDueLabel(1)).toBe('Due the 1st');
    expect(formatDueLabel(2)).toBe('Due the 2nd');
    expect(formatDueLabel(3)).toBe('Due the 3rd');
    expect(formatDueLabel(15)).toBe('Due the 15th');
    expect(formatDueLabel(22)).toBe('Due the 22nd');
    expect(formatDueLabel(31)).toBe('Due the 31st');
  });
});

// ---------------------------------------------------------------------------
// clampDayToMonth
// ---------------------------------------------------------------------------

describe('clampDayToMonth', () => {
  it('returns day unchanged when no clamping is needed', () => {
    expect(clampDayToMonth(15, 2026, 6)).toBe(15);
  });

  it('clamps 31 to 29 in February 2024 (leap year)', () => {
    expect(clampDayToMonth(31, 2024, 2)).toBe(29);
  });

  it('clamps 31 to 28 in February 2023 (non-leap year)', () => {
    expect(clampDayToMonth(31, 2023, 2)).toBe(28);
  });

  it('clamps 31 to 30 in April 2026', () => {
    expect(clampDayToMonth(31, 2026, 4)).toBe(30);
  });

  it('returns 31 unchanged in March 2026 (31-day month)', () => {
    expect(clampDayToMonth(31, 2026, 3)).toBe(31);
  });

  it('returns 1 unchanged', () => {
    expect(clampDayToMonth(1, 2026, 6)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeNearestUnpaidDueDate
// ---------------------------------------------------------------------------

describe('computeNearestUnpaidDueDate', () => {
  const BILL_ID = 'bill-1';

  it('returns clamped date in current month when no instances exist', () => {
    const today = new Date(2026, 5, 6); // June 6 2026
    const result = computeNearestUnpaidDueDate(15, [], today);
    expect(result).toBe('2026-06-15');
  });

  it('returns next month when current month is already paid', () => {
    const today = new Date(2026, 5, 6); // June 6 2026
    const instances = [makeInstance(BILL_ID, '2026-06-15')];
    const result = computeNearestUnpaidDueDate(15, instances, today);
    expect(result).toBe('2026-07-15');
  });

  it('skips two paid months and returns the third', () => {
    const today = new Date(2026, 5, 6); // June 6 2026
    const instances = [
      makeInstance(BILL_ID, '2026-06-15'),
      makeInstance(BILL_ID, '2026-07-15'),
    ];
    const result = computeNearestUnpaidDueDate(15, instances, today);
    expect(result).toBe('2026-08-15');
  });

  it('clamps due day 31 to Feb 28 in a non-leap year', () => {
    const today = new Date(2026, 1, 10); // Feb 10 2026
    const result = computeNearestUnpaidDueDate(31, [], today);
    expect(result).toBe('2026-02-28');
  });

  it('returns March 31 when Feb (clamped to 28) is already paid', () => {
    const today = new Date(2026, 1, 10); // Feb 10 2026
    const instances = [makeInstance(BILL_ID, '2026-02-28')];
    const result = computeNearestUnpaidDueDate(31, instances, today);
    expect(result).toBe('2026-03-31');
  });

  it('clamps due day 29 to Feb 28 in a non-leap year', () => {
    const today = new Date(2023, 1, 10); // Feb 10 2023
    const result = computeNearestUnpaidDueDate(29, [], today);
    expect(result).toBe('2023-02-28');
  });

  it('rolls over year boundary correctly', () => {
    const today = new Date(2026, 11, 6); // Dec 6 2026
    const instances = [makeInstance(BILL_ID, '2026-12-15')];
    const result = computeNearestUnpaidDueDate(15, instances, today);
    expect(result).toBe('2027-01-15');
  });

  it('skips cycles that predate bill createdAt (bill added mid-month)', () => {
    // Bill created Jun 25, due 11. June 11 predates createdAt → should return July 11
    const today = new Date(2026, 5, 25);
    const createdAt = new Date(2026, 5, 25);
    const result = computeNearestUnpaidDueDate(11, [], today, createdAt);
    expect(result).toBe('2026-07-11');
  });

  it('keeps a cycle whose date equals createdAt date (same-day creation)', () => {
    // Bill created Jun 25, due 25. June 25 equals createdAt → not skipped, returned
    const today = new Date(2026, 5, 25);
    const createdAt = new Date(2026, 5, 25);
    const result = computeNearestUnpaidDueDate(25, [], today, createdAt);
    expect(result).toBe('2026-06-25');
  });

  it('still skips predated cycle even when no instances exist', () => {
    // Bill created Jun 25, due 11. No instances. Skip June 11 → July 11
    const today = new Date(2026, 5, 25);
    const createdAt = new Date(2026, 5, 25);
    const result = computeNearestUnpaidDueDate(11, [], today, createdAt);
    expect(result).toBe('2026-07-11');
  });
});
// ---------------------------------------------------------------------------
// isOwedThisMonth
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// computeMonthDonutMetrics
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// mostRecentPastSession
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// nextFutureSession
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// targetDueDateForSession
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// isScheduleSessionComplete
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// selectActiveSchedule
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// msUntilNextMidnight
// ---------------------------------------------------------------------------

describe('msUntilNextMidnight', () => {
  it('returns 86400000 when now is exactly midnight', () => {
    const midnight = new Date(2026, 5, 16, 0, 0, 0, 0);
    expect(msUntilNextMidnight(midnight)).toBe(86_400_000);
  });

  it('returns 3600000 when now is 23:00 local', () => {
    const elevenPm = new Date(2026, 5, 16, 23, 0, 0, 0);
    expect(msUntilNextMidnight(elevenPm)).toBe(3_600_000);
  });

  it('returns less than 86400000 for any non-midnight time', () => {
    const afternoon = new Date(2026, 5, 16, 14, 30, 0, 0);
    expect(msUntilNextMidnight(afternoon)).toBeLessThan(86_400_000);
  });

  it('always returns a positive number', () => {
    const times = [
      new Date(2026, 5, 16, 0, 0, 0, 0),
      new Date(2026, 5, 16, 12, 0, 0, 0),
      new Date(2026, 5, 16, 23, 59, 59, 999),
    ];
    for (const t of times) {
      expect(msUntilNextMidnight(t)).toBeGreaterThan(0);
    }
  });
});

describe('computeEligibleHistoricalCycles', () => {
  it('returns the current cycle when bill was created this month and nothing is paid', () => {
    const createdAt = new Date(2026, 5, 27);
    const today = new Date(2026, 5, 27);
    expect(computeEligibleHistoricalCycles(29, [], today, createdAt)).toEqual([
      '2026-06-29',
    ]);
  });

  it('excludes cycles whose normalized dueDate predates createdAt', () => {
    const createdAt = new Date(2026, 5, 27);
    const today = new Date(2026, 5, 28);
    expect(computeEligibleHistoricalCycles(15, [], today, createdAt)).toEqual(
      [],
    );
  });

  it('returns only unpaid cycles, oldest first, across multiple months', () => {
    const createdAt = new Date(2026, 1, 1);
    const today = new Date(2026, 5, 15);
    const instances = [
      makeInstance('b1', '2026-03-15'),
      makeInstance('b1', '2026-05-15'),
    ];
    expect(
      computeEligibleHistoricalCycles(15, instances, today, createdAt),
    ).toEqual(['2026-02-15', '2026-04-15', '2026-06-15']);
  });

  it('returns empty array when every cycle in range is already paid', () => {
    const createdAt = new Date(2026, 3, 1);
    const today = new Date(2026, 5, 15);
    const instances = [
      makeInstance('b1', '2026-04-10'),
      makeInstance('b1', '2026-05-10'),
      makeInstance('b1', '2026-06-10'),
    ];
    expect(
      computeEligibleHistoricalCycles(10, instances, today, createdAt),
    ).toEqual([]);
  });

  it('clamps day-of-month for short months (Feb 31 → Feb 28)', () => {
    const createdAt = new Date(2026, 0, 1);
    const today = new Date(2026, 2, 15);
    expect(computeEligibleHistoricalCycles(31, [], today, createdAt)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });
});

describe('computeExtendedHistoricalCycle', () => {
  it('returns null when there are no instances', () => {
    expect(computeExtendedHistoricalCycle(15, [])).toBeNull();
  });

  it('returns the cycle one month before the oldest instance, clamped', () => {
    const instances = [
      makeInstance('b1', '2026-06-29'),
      makeInstance('b1', '2026-07-29'),
    ];
    expect(computeExtendedHistoricalCycle(29, instances)).toBe('2026-05-29');
  });

  it('clamps when the previous month is shorter than dueDayOfMonth', () => {
    const instances = [makeInstance('b1', '2026-03-31')];
    expect(computeExtendedHistoricalCycle(31, instances)).toBe('2026-02-28');
  });

  it('rolls over the year boundary', () => {
    const instances = [makeInstance('b1', '2026-01-15')];
    expect(computeExtendedHistoricalCycle(15, instances)).toBe('2025-12-15');
  });

  it('uses the earliest instance even when passed out of order', () => {
    const instances = [
      makeInstance('b1', '2026-08-10'),
      makeInstance('b1', '2026-05-10'),
      makeInstance('b1', '2026-07-10'),
    ];
    expect(computeExtendedHistoricalCycle(10, instances)).toBe('2026-04-10');
  });
});

// ---------------------------------------------------------------------------
// assertCanonicalCycle
// ---------------------------------------------------------------------------

describe('assertCanonicalCycle', () => {
  const createdAt = '2026-01-15T12:00:00.000Z';

  it('accepts a normal cycle', () => {
    expect(() =>
      assertCanonicalCycle('2026-08-01', 1, createdAt),
    ).not.toThrow();
  });

  it('accepts every cycle the outlook can produce for a bill', () => {
    // The dashboard offers this month's and next month's occurrence; both must
    // survive the guard or Mark Paid fails on a row the UI itself rendered.
    for (const dueDay of [1, 5, 15, 28, 30, 31]) {
      for (const [year, month] of [
        [2026, 1],
        [2026, 2],
        [2026, 8],
        [2026, 12],
        [2027, 1],
      ] as const) {
        const day = clampDayToMonth(dueDay, year, month);
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        expect(() =>
          assertCanonicalCycle(iso, dueDay, '2025-01-01T00:00:00.000Z'),
        ).not.toThrow();
      }
    }
  });

  it('accepts a clamped short-month cycle', () => {
    expect(() =>
      assertCanonicalCycle('2026-02-28', 31, '2025-01-01T00:00:00.000Z'),
    ).not.toThrow();
  });

  it('rejects a date that is not an occurrence of the due day', () => {
    expect(() => assertCanonicalCycle('2026-08-02', 1, createdAt)).toThrow(
      /not a billing cycle/,
    );
  });

  it('rejects an unclamped date in a short month', () => {
    expect(() =>
      assertCanonicalCycle('2026-02-31', 31, '2025-01-01T00:00:00.000Z'),
    ).toThrow(/not a billing cycle/);
  });

  it('rejects a cycle that predates the bill', () => {
    expect(() => assertCanonicalCycle('2026-01-01', 1, createdAt)).toThrow(
      /predates the bill/,
    );
  });

  it('accepts the first cycle on or after creation', () => {
    expect(() =>
      assertCanonicalCycle('2026-02-01', 1, createdAt),
    ).not.toThrow();
  });

  it('rejects a malformed date', () => {
    expect(() => assertCanonicalCycle('not-a-date', 1, createdAt)).toThrow(
      /Invalid billing cycle date/,
    );
  });
});
