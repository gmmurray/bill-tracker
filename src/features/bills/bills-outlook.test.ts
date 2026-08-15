import { describe, expect, it } from 'vitest';
import type {
  BillInstance,
  BillWithSchedule,
} from '#/features/bills/bills-model';
import {
  buildBillOutlook,
  computePayByDate,
  cyclesForBill,
  daysBetween,
  deriveCycleStatus,
  effectivePayDate,
  filterCyclesBySchedule,
  summarizeAttention,
  toDateKey,
} from '#/features/bills/bills-outlook';

function makeBill(
  overrides: Partial<BillWithSchedule> & { id: string; dueDayOfMonth: number },
): BillWithSchedule {
  return {
    userId: 'user-1',
    name: overrides.id,
    amountExpected: 10_000,
    payScheduleId: null,
    paymentUrl: null,
    isAutoPay: false,
    notes: null,
    category: null,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    scheduleName: null,
    schedulePayDate: null,
    scheduleIsActive: null,
    isOrphaned: false,
    ...overrides,
  } as BillWithSchedule;
}

function makeInstance(
  billId: string,
  dueDate: string,
  amountActual = 10_000,
): BillInstance {
  return {
    id: `inst-${billId}-${dueDate}`,
    userId: 'user-1',
    billId,
    dueDate,
    amountActual,
    paidAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function instMap(
  entries: Array<[string, BillInstance[]]>,
): Map<string, BillInstance[]> {
  return new Map(entries);
}

// ---------------------------------------------------------------------------
// computePayByDate
// ---------------------------------------------------------------------------

describe('computePayByDate', () => {
  it('returns the cycle due date when the bill has no schedule', () => {
    expect(computePayByDate('2026-08-15', null)).toBe('2026-08-15');
  });

  it('uses the same month when the pay date falls on or before the due day', () => {
    expect(computePayByDate('2026-08-20', 15)).toBe('2026-08-15');
    expect(computePayByDate('2026-08-15', 15)).toBe('2026-08-15');
  });

  it('reaches back a month for pay-ahead schedules', () => {
    // Pay on the 15th, bill due the 1st: September's cycle is settled Aug 15.
    expect(computePayByDate('2026-09-01', 15)).toBe('2026-08-15');
  });

  it('clamps the pay date to short months', () => {
    expect(computePayByDate('2026-03-01', 31)).toBe('2026-02-28');
  });

  it('crosses the year boundary', () => {
    expect(computePayByDate('2027-01-01', 20)).toBe('2026-12-20');
  });
});

// ---------------------------------------------------------------------------
// deriveCycleStatus
// ---------------------------------------------------------------------------

describe('deriveCycleStatus', () => {
  it('reports PAID regardless of dates', () => {
    expect(
      deriveCycleStatus('2026-08-01', '2026-07-15', '2026-08-20', true),
    ).toBe('PAID');
  });

  it('reports OVERDUE once the due date has passed', () => {
    expect(
      deriveCycleStatus('2026-08-01', '2026-07-15', '2026-08-02', false),
    ).toBe('OVERDUE');
  });

  it('reports DUE_NOW between the pay-by date and the due date', () => {
    expect(
      deriveCycleStatus('2026-09-01', '2026-08-15', '2026-08-20', false),
    ).toBe('DUE_NOW');
  });

  it('reports DUE_NOW on the pay-by date itself', () => {
    expect(
      deriveCycleStatus('2026-09-01', '2026-08-15', '2026-08-15', false),
    ).toBe('DUE_NOW');
  });

  it('reports SCHEDULED before the pay-by date', () => {
    expect(
      deriveCycleStatus('2026-09-01', '2026-08-15', '2026-08-14', false),
    ).toBe('SCHEDULED');
  });
});

// ---------------------------------------------------------------------------
// Regressions — each of these is a concrete failure of the old dashboard.
// ---------------------------------------------------------------------------

describe('regression: pay-ahead session is visible, never "all caught up"', () => {
  // Schedule pays the 15th; rent is due the 1st; August is settled.
  // The old dashboard derived rent to PAID and collapsed the whole card.
  const today = new Date(2026, 7, 20); // Aug 20 2026
  const rent = makeBill({
    id: 'rent',
    dueDayOfMonth: 1,
    name: 'Rent',
    payScheduleId: 'sched-mid',
    schedulePayDate: 15,
    scheduleIsActive: true,
    scheduleName: 'Mid-month',
  });
  const instances = instMap([['rent', [makeInstance('rent', '2026-08-01')]]]);

  it('emits both the settled August cycle and the owed September cycle', () => {
    const outlook = buildBillOutlook([rent], instances, today);
    expect(outlook.cycles).toHaveLength(2);

    const august = outlook.cycles.find(c => c.cycleDueDate === '2026-08-01')!;
    expect(august.status).toBe('PAID');
    expect(august.bucket).toBe('THIS_MONTH');

    const september = outlook.cycles.find(
      c => c.cycleDueDate === '2026-09-01',
    )!;
    expect(september.status).toBe('DUE_NOW');
    expect(september.payByDate).toBe('2026-08-15');
    expect(september.bucket).toBe('DUE_NOW');
  });

  it('reports the September cycle as owed', () => {
    const outlook = buildBillOutlook([rent], instances, today);
    expect(outlook.owed).toEqual({ count: 1, cents: 10_000 });
    expect(outlook.settled).toEqual({ count: 1, cents: 10_000 });
    expect(summarizeAttention(outlook).tone).toBe('due-now');
  });
});

describe('regression: an overdue bill is never masked by another schedule', () => {
  // Old behaviour: schedule A won the active-schedule race, and X — overdue on
  // schedule B — appeared in neither dashboard row.
  const today = new Date(2026, 7, 20); // Aug 20 2026
  const y = makeBill({
    id: 'y',
    dueDayOfMonth: 28,
    payScheduleId: 'a',
    schedulePayDate: 1,
    scheduleIsActive: true,
  });
  const x = makeBill({
    id: 'x',
    dueDayOfMonth: 5,
    payScheduleId: 'b',
    schedulePayDate: 20,
    scheduleIsActive: true,
  });

  it('surfaces the overdue cycle in the OVERDUE bucket', () => {
    const outlook = buildBillOutlook([y, x], new Map(), today);
    const overdue = outlook.byBucket.OVERDUE;
    expect(overdue.map(c => c.bill.id)).toEqual(['x']);
    expect(overdue[0]!.cycleDueDate).toBe('2026-08-05');
    expect(overdue[0]!.daysLate).toBe(15);
  });

  it('still surfaces the other schedule’s bill in the same outlook', () => {
    const outlook = buildBillOutlook([y, x], new Map(), today);
    const ids = new Set(outlook.cycles.map(c => c.bill.id));
    expect(ids).toEqual(new Set(['x', 'y']));
  });
});

describe('regression: no schedule can get stuck holding the view', () => {
  // Old behaviour: a schedule whose session target was a missed past cycle
  // could never be completed via Mark Paid, so it held the slot forever and
  // masked every other schedule.
  const today = new Date(2026, 7, 20);
  const b3 = makeBill({
    id: 'b3',
    dueDayOfMonth: 27,
    payScheduleId: 's3',
    schedulePayDate: 25,
    scheduleIsActive: true,
  });
  const b1 = makeBill({
    id: 'b1',
    dueDayOfMonth: 28,
    payScheduleId: 's1',
    schedulePayDate: 1,
    scheduleIsActive: true,
  });

  it('paying the August cycle settles it and leaves the other bill visible', () => {
    const paid = instMap([['b3', [makeInstance('b3', '2026-08-27')]]]);
    const outlook = buildBillOutlook([b3, b1], paid, today);

    const august = outlook.cycles.find(c => c.key === 'b3:2026-08-27')!;
    expect(august.status).toBe('PAID');

    // b1 is untouched by anything b3 does.
    const b1Cycles = outlook.cycles.filter(c => c.bill.id === 'b1');
    expect(b1Cycles).toHaveLength(2);
    expect(b1Cycles.every(c => !c.isPaid)).toBe(true);
  });
});

describe('regression: nothing is truncated or dropped', () => {
  const today = new Date(2026, 7, 1);

  it('represents every bill with every in-horizon cycle', () => {
    const bills = Array.from({ length: 12 }, (_, i) =>
      makeBill({ id: `b${i}`, dueDayOfMonth: i + 10 }),
    );
    const outlook = buildBillOutlook(bills, new Map(), today);
    expect(outlook.cycles).toHaveLength(24);
    expect(new Set(outlook.cycles.map(c => c.bill.id)).size).toBe(12);
  });

  it('keeps a bill visible at month end via the next-month bucket', () => {
    // Aug 28, everything for August settled — the old dashboard rendered empty.
    const rent = makeBill({ id: 'rent', dueDayOfMonth: 1 });
    const paid = instMap([['rent', [makeInstance('rent', '2026-08-01')]]]);
    const outlook = buildBillOutlook([rent], paid, new Date(2026, 7, 28));

    expect(outlook.byBucket.NEXT_MONTH.map(c => c.cycleDueDate)).toEqual([
      '2026-09-01',
    ]);
    expect(outlook.owed.count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// cyclesForBill
// ---------------------------------------------------------------------------

describe('cyclesForBill', () => {
  it('skips cycles that predate the bill', () => {
    const bill = makeBill({
      id: 'new',
      dueDayOfMonth: 11,
      createdAt: '2026-08-25T00:00:00.000Z',
    });
    const cycles = cyclesForBill(bill, [], new Date(2026, 7, 26));
    expect(cycles.map(c => c.cycleDueDate)).toEqual(['2026-09-11']);
  });

  it('clamps the due day into short months', () => {
    const bill = makeBill({ id: 'b', dueDayOfMonth: 31 });
    const cycles = cyclesForBill(bill, [], new Date(2026, 0, 5));
    expect(cycles.map(c => c.cycleDueDate)).toEqual([
      '2026-01-31',
      '2026-02-28',
    ]);
  });

  it('uses the recorded amount for settled cycles', () => {
    const bill = makeBill({
      id: 'b',
      dueDayOfMonth: 10,
      amountExpected: 5_000,
    });
    const cycles = cyclesForBill(
      bill,
      [makeInstance('b', '2026-08-10', 7_321)],
      new Date(2026, 7, 15),
    );
    const august = cycles.find(c => c.cycleDueDate === '2026-08-10')!;
    expect(august.amountCents).toBe(7_321);
    const september = cycles.find(c => c.cycleDueDate === '2026-09-10')!;
    expect(september.amountCents).toBe(5_000);
  });
});

// ---------------------------------------------------------------------------
// effectivePayDate / filtering / ordering
// ---------------------------------------------------------------------------

describe('effectivePayDate', () => {
  it('is null for unassigned bills', () => {
    expect(
      effectivePayDate(makeBill({ id: 'b', dueDayOfMonth: 1 })),
    ).toBeNull();
  });

  it('is null for orphaned bills', () => {
    const orphan = makeBill({
      id: 'b',
      dueDayOfMonth: 1,
      payScheduleId: 'archived',
      schedulePayDate: 15,
      scheduleIsActive: false,
      isOrphaned: true,
    });
    expect(effectivePayDate(orphan)).toBeNull();
  });

  it('is the schedule pay date for assigned bills', () => {
    const assigned = makeBill({
      id: 'b',
      dueDayOfMonth: 1,
      payScheduleId: 's',
      schedulePayDate: 15,
      scheduleIsActive: true,
    });
    expect(effectivePayDate(assigned)).toBe(15);
  });
});

describe('filterCyclesBySchedule', () => {
  const today = new Date(2026, 7, 10);
  const assigned = makeBill({
    id: 'assigned',
    dueDayOfMonth: 20,
    payScheduleId: 's1',
    schedulePayDate: 15,
    scheduleIsActive: true,
  });
  const orphan = makeBill({
    id: 'orphan',
    dueDayOfMonth: 20,
    payScheduleId: 'gone',
    schedulePayDate: 15,
    scheduleIsActive: false,
    isOrphaned: true,
  });
  const loose = makeBill({ id: 'loose', dueDayOfMonth: 20 });
  const outlook = buildBillOutlook([assigned, orphan, loose], new Map(), today);

  it('passes everything through for "all"', () => {
    expect(filterCyclesBySchedule(outlook.cycles, 'all')).toHaveLength(6);
  });

  it('groups orphans with unassigned', () => {
    const ids = new Set(
      filterCyclesBySchedule(outlook.cycles, 'unassigned').map(c => c.bill.id),
    );
    expect(ids).toEqual(new Set(['orphan', 'loose']));
  });

  it('selects a single schedule', () => {
    const ids = new Set(
      filterCyclesBySchedule(outlook.cycles, 's1').map(c => c.bill.id),
    );
    expect(ids).toEqual(new Set(['assigned']));
  });
});

describe('ordering', () => {
  it('sorts overdue worst-first and the rest soonest-first', () => {
    const today = new Date(2026, 7, 20);
    const bills = [
      makeBill({ id: 'late-a', dueDayOfMonth: 15 }),
      makeBill({ id: 'late-b', dueDayOfMonth: 3 }),
      makeBill({ id: 'soon', dueDayOfMonth: 22 }),
    ];
    const outlook = buildBillOutlook(bills, new Map(), today);

    expect(outlook.byBucket.OVERDUE.map(c => c.bill.id)).toEqual([
      'late-b',
      'late-a',
    ]);
    expect(outlook.byBucket.THIS_MONTH.map(c => c.bill.id)).toEqual(['soon']);
    expect(outlook.byBucket.NEXT_MONTH.map(c => c.bill.id)).toEqual([
      'late-b',
      'late-a',
      'soon',
    ]);
  });
});

describe('summarizeAttention', () => {
  const today = new Date(2026, 7, 20);

  it('is clear when nothing is owed now', () => {
    const bill = makeBill({ id: 'b', dueDayOfMonth: 28 });
    const outlook = buildBillOutlook([bill], new Map(), today);
    expect(summarizeAttention(outlook)).toEqual({
      count: 0,
      cents: 0,
      tone: 'clear',
    });
  });

  it('rolls due-now into the overdue tone when both exist', () => {
    const overdue = makeBill({
      id: 'od',
      dueDayOfMonth: 5,
      amountExpected: 100,
    });
    const dueNow = makeBill({
      id: 'dn',
      dueDayOfMonth: 20,
      amountExpected: 200,
    });
    const outlook = buildBillOutlook([overdue, dueNow], new Map(), today);
    expect(summarizeAttention(outlook)).toEqual({
      count: 2,
      cents: 300,
      tone: 'overdue',
    });
  });
});

describe('date utilities', () => {
  it('daysBetween counts calendar days', () => {
    expect(daysBetween('2026-08-05', '2026-08-20')).toBe(15);
    expect(daysBetween('2026-02-27', '2026-03-01')).toBe(2);
  });

  it('daysBetween is unaffected by DST transitions', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });

  it('toDateKey formats local calendar dates', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});
