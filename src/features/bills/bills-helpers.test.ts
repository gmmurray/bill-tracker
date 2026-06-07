import { describe, expect, it } from 'vitest';
import {
  clampDayToMonth,
  computeNearestUnpaidDueDate,
  deriveBillState,
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
