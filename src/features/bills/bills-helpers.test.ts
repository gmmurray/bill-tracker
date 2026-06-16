import { describe, expect, it } from 'vitest';
import {
  clampDayToMonth,
  computeNearestUnpaidDueDate,
  deriveBillState,
  formatCurrency,
  formatOrdinal,
  isScheduleSessionComplete,
  mostRecentPastSession,
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
): Pick<Bill, 'id' | 'dueDayOfMonth' | 'payScheduleId'> {
  return { id, dueDayOfMonth, payScheduleId };
}

function makeSchedule(
  id: string,
  anchorDay: number,
  name = 'Schedule',
  isActive = true,
): PaySchedule {
  return {
    id,
    userId: 'user-1',
    name,
    anchorDay,
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
});

// ---------------------------------------------------------------------------
// deriveBillState
// ---------------------------------------------------------------------------

describe('deriveBillState', () => {
  const BILL_ID = 'bill-2';

  it('returns PAID when an instance exists for current month due date', () => {
    // Today: June 6 2026, due day 15 → nearest unpaid is July → PAID
    const today = new Date(2026, 5, 6);
    const bill = { dueDayOfMonth: 15, payScheduleId: 'sched-1' };
    const schedule = { anchorDay: 1 };
    const instances = [makeInstance(BILL_ID, '2026-06-15')];
    expect(deriveBillState(bill, schedule, instances, today)).toBe('PAID');
  });

  it('returns OVERDUE when unpaid and today is past the due day', () => {
    // Today: June 10 2026, due day 5
    const today = new Date(2026, 5, 10);
    const bill = { dueDayOfMonth: 5, payScheduleId: null };
    expect(deriveBillState(bill, null, [], today)).toBe('OVERDUE');
  });

  it('returns MISSED_SCHEDULE when past anchor day but before due day with a schedule', () => {
    // Today: June 10 2026, anchor day 5, due day 20
    const today = new Date(2026, 5, 10);
    const bill = { dueDayOfMonth: 20, payScheduleId: 'sched-1' };
    const schedule = { anchorDay: 5 };
    expect(deriveBillState(bill, schedule, [], today)).toBe('MISSED_SCHEDULE');
  });

  it('returns UPCOMING when today is before both anchor day and due day', () => {
    // Today: June 3 2026, anchor day 10, due day 20
    const today = new Date(2026, 5, 3);
    const bill = { dueDayOfMonth: 20, payScheduleId: 'sched-1' };
    const schedule = { anchorDay: 10 };
    expect(deriveBillState(bill, schedule, [], today)).toBe('UPCOMING');
  });

  it('returns UPCOMING (not MISSED_SCHEDULE) when past anchor day but no schedule assigned', () => {
    // Today: June 10 2026, due day 20, no schedule
    const today = new Date(2026, 5, 10);
    const bill = { dueDayOfMonth: 20, payScheduleId: null };
    expect(deriveBillState(bill, null, [], today)).toBe('UPCOMING');
  });

  it('returns OVERDUE (not MISSED_SCHEDULE) when past due day and no schedule assigned', () => {
    // Today: June 10 2026, due day 5, no schedule
    const today = new Date(2026, 5, 10);
    const bill = { dueDayOfMonth: 5, payScheduleId: null };
    expect(deriveBillState(bill, null, [], today)).toBe('OVERDUE');
  });

  it('correctly derives state against clamped due date in February', () => {
    // Today: Feb 20 2026, due day 31 → clamped to 28. Today (20) <= 28 → not overdue
    const today = new Date(2026, 1, 20);
    const bill = { dueDayOfMonth: 31, payScheduleId: 'sched-1' };
    const schedule = { anchorDay: 25 };
    // today (20) <= clampedDueDay (28) and today (20) <= clampedAnchorDay (25) → UPCOMING
    expect(deriveBillState(bill, schedule, [], today)).toBe('UPCOMING');
  });

  it('returns MISSED_SCHEDULE on Feb 28 for bill due day 31 (clamped anchor already passed)', () => {
    // Today: Feb 28 2026, due day 31 → clamped to 28. Anchor 1. Today (28) > 1, today (28) not > 28 → MISSED_SCHEDULE
    const today = new Date(2026, 1, 28);
    const bill = { dueDayOfMonth: 31, payScheduleId: 'sched-1' };
    const schedule = { anchorDay: 1 };
    expect(deriveBillState(bill, schedule, [], today)).toBe('MISSED_SCHEDULE');
  });

  it('returns PAID when Jan and Feb are paid and today is Feb 5', () => {
    // Due day 15, paid Jan 15 and Feb 15 → nearest unpaid = Mar 15 → future month → PAID
    const today = new Date(2026, 1, 5); // Feb 5 2026
    const bill = { dueDayOfMonth: 15, payScheduleId: null };
    const instances = [
      makeInstance(BILL_ID, '2026-01-15'),
      makeInstance(BILL_ID, '2026-02-15'),
    ];
    expect(deriveBillState(bill, null, instances, today)).toBe('PAID');
  });
});

// ---------------------------------------------------------------------------
// mostRecentPastSession
// ---------------------------------------------------------------------------

describe('mostRecentPastSession', () => {
  it('returns previous month when today is before anchor', () => {
    // June 3, anchor 15 → prev = May 15
    const result = mostRecentPastSession(15, new Date(2026, 5, 3));
    expect(result).toEqual(new Date(2026, 4, 15));
  });

  it('returns current month when today equals clamped anchor', () => {
    // June 15, anchor 15 → June 15
    const result = mostRecentPastSession(15, new Date(2026, 5, 15));
    expect(result).toEqual(new Date(2026, 5, 15));
  });

  it('returns current month when today is after anchor', () => {
    // June 20, anchor 15 → June 15
    const result = mostRecentPastSession(15, new Date(2026, 5, 20));
    expect(result).toEqual(new Date(2026, 5, 15));
  });

  it('clamps anchor 31 to Feb 28 in non-leap year when today is Feb 1', () => {
    // Feb 1 2026, anchor 31 → clamped = 28, today (1) < 28 → prev = Jan 31
    const result = mostRecentPastSession(31, new Date(2026, 1, 1));
    expect(result).toEqual(new Date(2026, 0, 31));
  });

  it('wraps year correctly when going to previous month from January', () => {
    // Jan 1 2026, anchor 15 → Dec 15 2025
    const result = mostRecentPastSession(15, new Date(2026, 0, 1));
    expect(result).toEqual(new Date(2025, 11, 15));
  });
});

// ---------------------------------------------------------------------------
// nextFutureSession
// ---------------------------------------------------------------------------

describe('nextFutureSession', () => {
  it('returns current month when today is before anchor', () => {
    // June 3, anchor 15 → June 15
    const result = nextFutureSession(15, new Date(2026, 5, 3));
    expect(result).toEqual(new Date(2026, 5, 15));
  });

  it('returns next month when today equals clamped anchor', () => {
    // June 15, anchor 15 → July 15
    const result = nextFutureSession(15, new Date(2026, 5, 15));
    expect(result).toEqual(new Date(2026, 6, 15));
  });

  it('returns next month when today is after anchor', () => {
    // June 20, anchor 15 → July 15
    const result = nextFutureSession(15, new Date(2026, 5, 20));
    expect(result).toEqual(new Date(2026, 6, 15));
  });

  it('clamps anchor 31 to Feb 28 in non-leap year when today is Feb 1', () => {
    // Feb 1 2026, anchor 31 → clamped = 28, today (1) < 28 → Feb 28
    const result = nextFutureSession(31, new Date(2026, 1, 1));
    expect(result).toEqual(new Date(2026, 1, 28));
  });

  it('wraps year correctly when going to next month from December', () => {
    // Dec 20 2026, anchor 15 → Jan 15 2027
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
    // today Jun 15, anchor 1 → past = Jun 1, bill due 20 not paid → incomplete
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
    // today Jun 15, anchor 1 → past = Jun 1, bill due 20 paid for Jun 20 → complete
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
    // A: anchor 1, bill unpaid → past Feb 1 incomplete → currentSession Feb 1
    // B: anchor 1, bill paid for Feb 1 session → complete → currentSession Mar 1
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
    // A: anchor 15 → past = Jan 15, bills unpaid → currentSession Jan 15
    // B: anchor 1  → past = Feb 1,  bills unpaid → currentSession Feb 1
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

  it('tiebreaks same currentSession date by anchorDay ascending', () => {
    // today Feb 28 2026 (last day of non-leap Feb)
    // A: anchor 28 → clamp(28,2026,2)=28, today(28)>=28 → past=Feb28. Unpaid → currentSession=Feb28
    // B: anchor 29 → clamp(29,2026,2)=28, today(28)>=28 → past=Feb28. Unpaid → currentSession=Feb28
    // Same date → tiebreak anchorDay: 28 < 29 → A wins
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

  it('tiebreaks same date and anchorDay by name ascending', () => {
    // today Feb 2 2026, both anchor 1 → both past=Feb1, both unpaid → both currentSession=Feb1
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
