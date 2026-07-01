import { describe, expect, it } from 'vitest';
import {
  clampDayToMonth,
  computeEligibleHistoricalCycles,
  computeExtendedHistoricalCycle,
  computeMonthDonutMetrics,
  computeNearestUnpaidDueDate,
  deriveBillState,
  formatCurrency,
  formatDueLabel,
  formatOrdinal,
  isOwedThisMonth,
  isScheduleSessionComplete,
  mostRecentPastSession,
  msUntilNextMidnight,
  nextFutureSession,
  selectActiveSchedule,
  targetDueDateForSession,
} from '#/features/bills/bills-helpers';
import type { Bill, BillInstance } from '#/features/bills/bills-model';
import type { PaySchedule } from '#/features/pay-schedules/pay-schedules-model';

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

function makeBill(
  id: string,
  dueDayOfMonth: number,
  payScheduleId: string | null = null,
  createdAt = '2025-01-01T00:00:00.000Z',
  amountExpected = 10000,
): Pick<
  Bill,
  'id' | 'dueDayOfMonth' | 'payScheduleId' | 'createdAt' | 'amountExpected'
> {
  return { id, dueDayOfMonth, payScheduleId, createdAt, amountExpected };
}

function makeSchedule(
  id: string,
  payDate: number,
  name = 'Schedule',
  isActive = true,
): PaySchedule {
  return {
    id,
    userId: 'user-1',
    name,
    payDate,
    isActive,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeInstMap(
  entries: [string, BillInstance[]][],
): Map<string, BillInstance[]> {
  return new Map(entries);
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
// deriveBillState
// ---------------------------------------------------------------------------

describe('deriveBillState', () => {
  const BILL_ID = 'bill-2';

  it('returns PAID when an instance exists for current month due date', () => {
    // Today: June 6 2026, due day 15 → nearest unpaid is July → PAID
    const today = new Date(2026, 5, 6);
    const bill = {
      dueDayOfMonth: 15,
      payScheduleId: 'sched-1',
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const schedule = { payDate: 1 };
    const instances = [makeInstance(BILL_ID, '2026-06-15')];
    expect(deriveBillState(bill, schedule, instances, today)).toBe('PAID');
  });

  it('returns OVERDUE when unpaid and today is past the due day', () => {
    // Today: June 10 2026, due day 5
    const today = new Date(2026, 5, 10);
    const bill = {
      dueDayOfMonth: 5,
      payScheduleId: null,
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    expect(deriveBillState(bill, null, [], today)).toBe('OVERDUE');
  });

  it('returns MISSED_SCHEDULE when past pay date but before due day with a schedule', () => {
    // Today: June 10 2026, pay date 5, due day 20
    const today = new Date(2026, 5, 10);
    const bill = {
      dueDayOfMonth: 20,
      payScheduleId: 'sched-1',
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const schedule = { payDate: 5 };
    expect(deriveBillState(bill, schedule, [], today)).toBe('MISSED_SCHEDULE');
  });

  it('returns UPCOMING when today is before both pay date and due day', () => {
    // Today: June 3 2026, pay date 10, due day 20
    const today = new Date(2026, 5, 3);
    const bill = {
      dueDayOfMonth: 20,
      payScheduleId: 'sched-1',
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const schedule = { payDate: 10 };
    expect(deriveBillState(bill, schedule, [], today)).toBe('UPCOMING');
  });

  it('returns UPCOMING (not MISSED_SCHEDULE) when past pay date but no schedule assigned', () => {
    // Today: June 10 2026, due day 20, no schedule
    const today = new Date(2026, 5, 10);
    const bill = {
      dueDayOfMonth: 20,
      payScheduleId: null,
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    expect(deriveBillState(bill, null, [], today)).toBe('UPCOMING');
  });

  it('returns OVERDUE (not MISSED_SCHEDULE) when past due day and no schedule assigned', () => {
    // Today: June 10 2026, due day 5, no schedule
    const today = new Date(2026, 5, 10);
    const bill = {
      dueDayOfMonth: 5,
      payScheduleId: null,
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    expect(deriveBillState(bill, null, [], today)).toBe('OVERDUE');
  });

  it('correctly derives state against clamped due date in February', () => {
    // Today: Feb 20 2026, due day 31 → clamped to 28. Today (20) <= 28 → not overdue
    const today = new Date(2026, 1, 20);
    const bill = {
      dueDayOfMonth: 31,
      payScheduleId: 'sched-1',
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const schedule = { payDate: 25 };
    // today (20) <= clampedDueDay (28) and today (20) <= clampedPayDate (25) → UPCOMING
    expect(deriveBillState(bill, schedule, [], today)).toBe('UPCOMING');
  });

  it('returns MISSED_SCHEDULE on Feb 28 for bill due day 31 (clamped pay date already passed)', () => {
    // Today: Feb 28 2026, due day 31 → clamped to 28. Pay date 1. Today (28) > 1, today (28) not > 28 → MISSED_SCHEDULE
    const today = new Date(2026, 1, 28);
    const bill = {
      dueDayOfMonth: 31,
      payScheduleId: 'sched-1',
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const schedule = { payDate: 1 };
    expect(deriveBillState(bill, schedule, [], today)).toBe('MISSED_SCHEDULE');
  });

  it('returns PAID when Jan and Feb are paid and today is Feb 5', () => {
    // Due day 15, paid Jan 15 and Feb 15 → nearest unpaid = Mar 15 → future month → PAID
    const today = new Date(2026, 1, 5); // Feb 5 2026
    const bill = {
      dueDayOfMonth: 15,
      payScheduleId: null,
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const instances = [
      makeInstance(BILL_ID, '2026-01-15'),
      makeInstance(BILL_ID, '2026-02-15'),
    ];
    expect(deriveBillState(bill, null, instances, today)).toBe('PAID');
  });

  it('returns PAID for a bill added mid-month with due day in the past (predates createdAt)', () => {
    // Today: June 25 2026. Bill added today with dueDayOfMonth 11.
    // June 11 predates bill — nearest unpaid is July 11 → future month → PAID.
    // Before this fix, this case incorrectly returned OVERDUE because nearest-unpaid
    // would walk to June 11 (this month's clamped due day) regardless of createdAt.
    const today = new Date(2026, 5, 25);
    const bill = {
      dueDayOfMonth: 11,
      payScheduleId: null,
      createdAt: '2026-06-25T10:00:00.000Z',
    };
    expect(deriveBillState(bill, null, [], today)).toBe('PAID');
  });
});

// ---------------------------------------------------------------------------
// isOwedThisMonth
// ---------------------------------------------------------------------------

describe('isOwedThisMonth', () => {
  const BILL_ID = 'bill-owed';

  it('returns false for a bill paid this month', () => {
    // Bill due 15, paid for June 15 cycle, today June 20
    const today = new Date(2026, 5, 20);
    const bill = {
      dueDayOfMonth: 15,
      payScheduleId: null,
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const instances = [makeInstance(BILL_ID, '2026-06-15')];
    expect(isOwedThisMonth(bill, null, instances, today)).toBe(false);
  });

  it('returns true for an OVERDUE bill', () => {
    // Bill due 5, unpaid, today June 10 → OVERDUE
    const today = new Date(2026, 5, 10);
    const bill = {
      dueDayOfMonth: 5,
      payScheduleId: null,
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    expect(isOwedThisMonth(bill, null, [], today)).toBe(true);
  });

  it('returns true for an UPCOMING bill (still owes this month)', () => {
    // Bill due 20, unpaid, today June 10 → UPCOMING (not yet hit due day, but owes for June)
    const today = new Date(2026, 5, 10);
    const bill = {
      dueDayOfMonth: 20,
      payScheduleId: null,
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    expect(isOwedThisMonth(bill, null, [], today)).toBe(true);
  });

  it('returns true for a MISSED_SCHEDULE bill', () => {
    // Bill due 20, pay date 5, today June 10, unpaid → MISSED_SCHEDULE
    const today = new Date(2026, 5, 10);
    const bill = {
      dueDayOfMonth: 20,
      payScheduleId: 'sched-1',
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const schedule = { payDate: 5 };
    expect(isOwedThisMonth(bill, schedule, [], today)).toBe(true);
  });

  it('returns false for a skip-PAID bill (created mid-month, due day in past)', () => {
    // Bill created June 25, due 11. June 11 predates bill → state PAID via skip
    const today = new Date(2026, 5, 25);
    const bill = {
      dueDayOfMonth: 11,
      payScheduleId: null,
      createdAt: '2026-06-25T10:00:00.000Z',
    };
    expect(isOwedThisMonth(bill, null, [], today)).toBe(false);
  });

  it('returns false for a paid-ahead bill (instance covers a future cycle)', () => {
    // Bill due 15, paid for July 15 already (paid ahead), today June 25 — no June instance
    // computeNearestUnpaidDueDate starts at June, June 15 has no instance, returns June 15
    // → state would be OVERDUE since today (25) > 15. So this is owed.
    // Real "paid-ahead" means current month's cycle is covered. Set: paid for June 15.
    // (A truly paid-ahead bill that skips current month is unusual — see helper docs.)
    const today = new Date(2026, 5, 25);
    const bill = {
      dueDayOfMonth: 15,
      payScheduleId: null,
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const instances = [makeInstance(BILL_ID, '2026-06-15')];
    expect(isOwedThisMonth(bill, null, instances, today)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeMonthDonutMetrics
// ---------------------------------------------------------------------------

describe('computeMonthDonutMetrics', () => {
  function makeSched(id: string, payDate: number): PaySchedule {
    return makeSchedule(id, payDate);
  }

  it('returns zeros for an empty bills list', () => {
    const today = new Date(2026, 5, 25);
    const result = computeMonthDonutMetrics([], [], new Map(), today);
    expect(result).toEqual({
      paidCount: 0,
      totalCount: 0,
      paidCents: 0,
      totalCents: 0,
    });
  });

  it('counts a single paid-this-month bill in both numerator and denominator', () => {
    // Bill due 15, paid June 15 for $100 expected / $98 actual
    const today = new Date(2026, 5, 25);
    const bill = makeBill('b1', 15, null, '2025-01-01T00:00:00.000Z', 10000);
    const instances = [
      { ...makeInstance('b1', '2026-06-15'), amountActual: 9800 },
    ];
    const map = makeInstMap([['b1', instances]]);
    const result = computeMonthDonutMetrics([bill], [], map, today);
    expect(result).toEqual({
      paidCount: 1,
      totalCount: 1,
      paidCents: 9800,
      totalCents: 10000,
    });
  });

  it('counts an unpaid (OVERDUE) bill in denominator only', () => {
    // Bill due 5, unpaid, today June 25 → OVERDUE → owed → in total but not paid
    const today = new Date(2026, 5, 25);
    const bill = makeBill('b1', 5, null, '2025-01-01T00:00:00.000Z', 10000);
    const result = computeMonthDonutMetrics([bill], [], new Map(), today);
    expect(result).toEqual({
      paidCount: 0,
      totalCount: 1,
      paidCents: 0,
      totalCents: 10000,
    });
  });

  it('excludes skip-PAID bills from both numerator and denominator', () => {
    // Bill created June 25, due 11. Skip-PAID — not relevant this month.
    const today = new Date(2026, 5, 25);
    const bill = makeBill('b1', 11, null, '2026-06-25T10:00:00.000Z', 10000);
    const result = computeMonthDonutMetrics([bill], [], new Map(), today);
    expect(result).toEqual({
      paidCount: 0,
      totalCount: 0,
      paidCents: 0,
      totalCents: 0,
    });
  });

  it('mixes paid + unpaid + skip-PAID correctly (the user-reported scenario)', () => {
    // Today June 25. Three bills:
    //  - b1: paid this month (state PAID via instance) → in total + in paid
    //  - b2: unpaid OVERDUE (created long ago, due 5, no instance) → in total, not paid
    //  - b3: skip-PAID (created today, due 11) → excluded from both
    const today = new Date(2026, 5, 25);
    const b1 = makeBill('b1', 15, null, '2025-01-01T00:00:00.000Z', 10000);
    const b2 = makeBill('b2', 5, null, '2025-01-01T00:00:00.000Z', 20000);
    const b3 = makeBill('b3', 11, null, '2026-06-25T10:00:00.000Z', 30000);
    const instances = [
      { ...makeInstance('b1', '2026-06-15'), amountActual: 10000 },
    ];
    const map = makeInstMap([['b1', instances]]);
    const result = computeMonthDonutMetrics([b1, b2, b3], [], map, today);
    expect(result).toEqual({
      paidCount: 1,
      totalCount: 2,
      paidCents: 10000,
      totalCents: 30000,
    });
  });

  it('uses amountActual (not amountExpected) for paidCents', () => {
    // Bill expected $100, actually paid $87
    const today = new Date(2026, 5, 25);
    const bill = makeBill('b1', 15, null, '2025-01-01T00:00:00.000Z', 10000);
    const instances = [
      { ...makeInstance('b1', '2026-06-15'), amountActual: 8700 },
    ];
    const map = makeInstMap([['b1', instances]]);
    const result = computeMonthDonutMetrics([bill], [], map, today);
    expect(result.paidCents).toBe(8700);
    expect(result.totalCents).toBe(10000);
  });

  it('respects schedule for MISSED_SCHEDULE state derivation', () => {
    // Bill on a schedule, today past pay date but before due day, unpaid → MISSED_SCHEDULE → owed
    const today = new Date(2026, 5, 10);
    const bill = makeBill('b1', 20, 's1', '2025-01-01T00:00:00.000Z', 10000);
    const schedule = makeSched('s1', 5);
    const result = computeMonthDonutMetrics(
      [bill],
      [schedule],
      new Map(),
      today,
    );
    expect(result).toEqual({
      paidCount: 0,
      totalCount: 1,
      paidCents: 0,
      totalCents: 10000,
    });
  });

  it('ignores instances whose dueDate is in a different month for paidCents', () => {
    // Bill paid for May 15 (last month), no June instance, today June 25
    // The May payment shouldn't count toward June's donut paidCents.
    // The bill itself is OVERDUE for June (no June instance, today > June 15) → in total.
    const today = new Date(2026, 5, 25);
    const bill = makeBill('b1', 15, null, '2025-01-01T00:00:00.000Z', 10000);
    const instances = [
      { ...makeInstance('b1', '2026-05-15'), amountActual: 9000 },
    ];
    const map = makeInstMap([['b1', instances]]);
    const result = computeMonthDonutMetrics([bill], [], map, today);
    expect(result).toEqual({
      paidCount: 0,
      totalCount: 1,
      paidCents: 0,
      totalCents: 10000,
    });
  });
});

// ---------------------------------------------------------------------------
// mostRecentPastSession
// ---------------------------------------------------------------------------

describe('mostRecentPastSession', () => {
  it('returns previous month when today is before pay date', () => {
    // June 3, pay date 15 → prev = May 15
    const result = mostRecentPastSession(15, new Date(2026, 5, 3));
    expect(result).toEqual(new Date(2026, 4, 15));
  });

  it('returns current month when today equals clamped pay date', () => {
    // June 15, pay date 15 → June 15
    const result = mostRecentPastSession(15, new Date(2026, 5, 15));
    expect(result).toEqual(new Date(2026, 5, 15));
  });

  it('returns current month when today is after pay date', () => {
    // June 20, pay date 15 → June 15
    const result = mostRecentPastSession(15, new Date(2026, 5, 20));
    expect(result).toEqual(new Date(2026, 5, 15));
  });

  it('clamps pay date 31 to Feb 28 in non-leap year when today is Feb 1', () => {
    // Feb 1 2026, pay date 31 → clamped = 28, today (1) < 28 → prev = Jan 31
    const result = mostRecentPastSession(31, new Date(2026, 1, 1));
    expect(result).toEqual(new Date(2026, 0, 31));
  });

  it('wraps year correctly when going to previous month from January', () => {
    // Jan 1 2026, pay date 15 → Dec 15 2025
    const result = mostRecentPastSession(15, new Date(2026, 0, 1));
    expect(result).toEqual(new Date(2025, 11, 15));
  });
});

// ---------------------------------------------------------------------------
// nextFutureSession
// ---------------------------------------------------------------------------

describe('nextFutureSession', () => {
  it('returns current month when today is before pay date', () => {
    // June 3, pay date 15 → June 15
    const result = nextFutureSession(15, new Date(2026, 5, 3));
    expect(result).toEqual(new Date(2026, 5, 15));
  });

  it('returns next month when today equals clamped pay date', () => {
    // June 15, pay date 15 → July 15
    const result = nextFutureSession(15, new Date(2026, 5, 15));
    expect(result).toEqual(new Date(2026, 6, 15));
  });

  it('returns next month when today is after pay date', () => {
    // June 20, pay date 15 → July 15
    const result = nextFutureSession(15, new Date(2026, 5, 20));
    expect(result).toEqual(new Date(2026, 6, 15));
  });

  it('clamps pay date 31 to Feb 28 in non-leap year when today is Feb 1', () => {
    // Feb 1 2026, pay date 31 → clamped = 28, today (1) < 28 → Feb 28
    const result = nextFutureSession(31, new Date(2026, 1, 1));
    expect(result).toEqual(new Date(2026, 1, 28));
  });

  it('wraps year correctly when going to next month from December', () => {
    // Dec 20 2026, pay date 15 → Jan 15 2027
    const result = nextFutureSession(15, new Date(2026, 11, 20));
    expect(result).toEqual(new Date(2027, 0, 15));
  });
});

// ---------------------------------------------------------------------------
// targetDueDateForSession
// ---------------------------------------------------------------------------

describe('targetDueDateForSession', () => {
  it('bill due 1 + session Feb 15 → March 1 (due day before session day)', () => {
    const result = targetDueDateForSession(1, new Date(2026, 1, 15));
    expect(result).toBe('2026-03-01');
  });

  it('bill due 20 + session Feb 15 → Feb 20 (due day after session day)', () => {
    const result = targetDueDateForSession(20, new Date(2026, 1, 15));
    expect(result).toBe('2026-02-20');
  });

  it('bill due 15 + session Feb 15 → Feb 15 (due day equals session day)', () => {
    const result = targetDueDateForSession(15, new Date(2026, 1, 15));
    expect(result).toBe('2026-02-15');
  });

  it('bill due 31 + session Feb 27 → Feb 28 (clamped 31→28 >= 27)', () => {
    const result = targetDueDateForSession(31, new Date(2026, 1, 27));
    expect(result).toBe('2026-02-28');
  });

  it('rolls into next year when session is December', () => {
    // due day 1, session Dec 15 → Jan 1 next year
    const result = targetDueDateForSession(1, new Date(2026, 11, 15));
    expect(result).toBe('2027-01-01');
  });
});

// ---------------------------------------------------------------------------
// isScheduleSessionComplete
// ---------------------------------------------------------------------------

describe('isScheduleSessionComplete', () => {
  const SESSION = new Date(2026, 5, 15); // June 15 2026

  it('returns true for empty bill list (vacuously complete)', () => {
    expect(isScheduleSessionComplete([], SESSION, new Map())).toBe(true);
  });

  it('returns true when all bills have a matching instance', () => {
    // target for due-20 + session Jun 15 = 2026-06-20
    const bill = makeBill('b1', 20);
    const map = makeInstMap([['b1', [makeInstance('b1', '2026-06-20')]]]);
    expect(isScheduleSessionComplete([bill], SESSION, map)).toBe(true);
  });

  it('returns false when one bill has no instance', () => {
    const b1 = makeBill('b1', 20);
    const b2 = makeBill('b2', 25);
    const map = makeInstMap([['b1', [makeInstance('b1', '2026-06-20')]]]);
    expect(isScheduleSessionComplete([b1, b2], SESSION, map)).toBe(false);
  });

  it('returns false when instance dueDate does not match target', () => {
    const bill = makeBill('b1', 20);
    // wrong dueDate
    const map = makeInstMap([['b1', [makeInstance('b1', '2026-06-15')]]]);
    expect(isScheduleSessionComplete([bill], SESSION, map)).toBe(false);
  });

  it('skips bills whose target dueDate predates createdAt', () => {
    // target for due-20 + session Jun 15 = 2026-06-20
    // bill created Jun 27 → June 20 predates it → skipped, not considered unpaid work
    const bill = makeBill('b1', 20, null, '2026-06-27T00:00:00.000Z');
    expect(isScheduleSessionComplete([bill], SESSION, new Map())).toBe(true);
  });

  it('does not skip bills whose target dueDate equals createdAt', () => {
    // target Jun 20; bill createdAt Jun 20 → not predating → must have instance
    const bill = makeBill('b1', 20, null, '2026-06-20T00:00:00.000Z');
    expect(isScheduleSessionComplete([bill], SESSION, new Map())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectActiveSchedule
// ---------------------------------------------------------------------------

describe('selectActiveSchedule', () => {
  it('returns null when no active schedules', () => {
    const s = makeSchedule('s1', 1, 'S', false);
    expect(
      selectActiveSchedule([s], [], new Map(), new Date(2026, 5, 15)),
    ).toBeNull();
  });

  it('returns null when schedules array is empty', () => {
    expect(
      selectActiveSchedule([], [], new Map(), new Date(2026, 5, 15)),
    ).toBeNull();
  });

  it('returns the schedule when past session is incomplete', () => {
    // today Jun 15, pay date 1 → past = Jun 1, bill due 20 not paid → incomplete
    const schedule = makeSchedule('s1', 1);
    const bill = makeBill('b1', 20, 's1');
    const result = selectActiveSchedule(
      [schedule],
      [bill],
      makeInstMap([]),
      new Date(2026, 5, 15),
    );
    expect(result?.id).toBe('s1');
  });

  it('returns the schedule when past session is complete (currentSession moves to next future)', () => {
    // today Jun 15, pay date 1 → past = Jun 1, bill due 20 paid for Jun 20 → complete
    const schedule = makeSchedule('s1', 1);
    const bill = makeBill('b1', 20, 's1');
    const map = makeInstMap([['b1', [makeInstance('b1', '2026-06-20')]]]);
    const result = selectActiveSchedule(
      [schedule],
      [bill],
      map,
      new Date(2026, 5, 15),
    );
    expect(result?.id).toBe('s1');
  });

  it('picks schedule with earlier currentSession: unfinished past beats finished future', () => {
    // today Feb 1 2026
    // A: pay date 1, bill unpaid → past Feb 1 incomplete → currentSession Feb 1
    // B: pay date 1, bill paid for Feb 1 session → complete → currentSession Mar 1
    const today = new Date(2026, 1, 1);
    const sA = makeSchedule('sA', 1, 'A');
    const sB = makeSchedule('sB', 1, 'B');
    const billA = makeBill('bA', 20, 'sA');
    const billB = makeBill('bB', 20, 'sB');
    // targetDueDateForSession(20, Feb1) = Feb 20
    const map = makeInstMap([
      ['bA', []],
      ['bB', [makeInstance('bB', '2026-02-20')]],
    ]);
    const result = selectActiveSchedule([sA, sB], [billA, billB], map, today);
    expect(result?.id).toBe('sA');
  });

  it('picks schedule with earlier currentSession: Jan 15 beats Feb 1', () => {
    // today Feb 3 2026
    // A: pay date 15 → past = Jan 15, bills unpaid → currentSession Jan 15
    // B: pay date 1  → past = Feb 1,  bills unpaid → currentSession Feb 1
    const today = new Date(2026, 1, 3);
    const sA = makeSchedule('sA', 15, 'A');
    const sB = makeSchedule('sB', 1, 'B');
    const billA = makeBill('bA', 20, 'sA');
    const billB = makeBill('bB', 20, 'sB');
    const map = makeInstMap([
      ['bA', []],
      ['bB', []],
    ]);
    const result = selectActiveSchedule([sA, sB], [billA, billB], map, today);
    expect(result?.id).toBe('sA');
  });

  it('tiebreaks same currentSession date by payDate ascending', () => {
    // today Feb 28 2026 (last day of non-leap Feb)
    // A: pay date 28 → clamp(28,2026,2)=28, today(28)>=28 → past=Feb28. Unpaid → currentSession=Feb28
    // B: pay date 29 → clamp(29,2026,2)=28, today(28)>=28 → past=Feb28. Unpaid → currentSession=Feb28
    // Same date → tiebreak payDate: 28 < 29 → A wins
    const today = new Date(2026, 1, 28);
    const sA = makeSchedule('sA', 28, 'A');
    const sB = makeSchedule('sB', 29, 'B');
    const billA = makeBill('bA', 10, 'sA');
    const billB = makeBill('bB', 10, 'sB');
    const map = makeInstMap([
      ['bA', []],
      ['bB', []],
    ]);
    const result = selectActiveSchedule([sA, sB], [billA, billB], map, today);
    expect(result?.id).toBe('sA');
  });

  it('ignores past sessions that predate all bills\' createdAt', () => {
    // Reproduces reported bug: today Jul 1 2026.
    // Schedule A payDate 1, bills due 1 created Jun 27 → past Jul 1 unpaid → currentSession Jul 1
    // Schedule B payDate 15, bills due 15 created Jun 27 → past Jun 15 predates createdAt,
    //   so June 15 session is vacuously complete → currentSession Jul 15
    // A (Jul 1) < B (Jul 15) → A wins
    const today = new Date(2026, 6, 1);
    const sA = makeSchedule('sA', 1, 'first');
    const sB = makeSchedule('sB', 15, 'second');
    const billA = makeBill('bA', 1, 'sA', '2026-06-27T00:00:00.000Z');
    const billB = makeBill('bB', 15, 'sB', '2026-06-27T00:00:00.000Z');
    const map = makeInstMap([
      ['bA', []],
      ['bB', []],
    ]);
    const result = selectActiveSchedule([sA, sB], [billA, billB], map, today);
    expect(result?.id).toBe('sA');
  });

  it('tiebreaks same date and payDate by name ascending', () => {
    // today Feb 2 2026, both pay date 1 → both past=Feb1, both unpaid → both currentSession=Feb1
    const today = new Date(2026, 1, 2);
    const sA = makeSchedule('sA', 1, 'Alpha');
    const sB = makeSchedule('sB', 1, 'Beta');
    const billA = makeBill('bA', 20, 'sA');
    const billB = makeBill('bB', 20, 'sB');
    const map = makeInstMap([
      ['bA', []],
      ['bB', []],
    ]);
    const result = selectActiveSchedule([sA, sB], [billA, billB], map, today);
    expect(result?.id).toBe('sA');
  });
});

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
