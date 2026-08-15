/**
 * Bill outlook — the derivation behind the dashboard, banner, and actions drawer.
 *
 * One rule, applied per bill, with no global selection step:
 *
 *   cycleDueDate — a calendar occurrence of `dueDayOfMonth` (clamped)
 *   payByDate    — the latest occurrence of the bill's schedule `payDate`
 *                  at or before `cycleDueDate`, or `cycleDueDate` if the bill
 *                  has no active schedule
 *   status       — `today` compared against those two dates
 *
 * The unit is a **bill-cycle**, not a bill. Each bill contributes one row per
 * cycle inside the horizon (this month + next month), so a bill that is settled
 * for August and owed for September shows up as both — settled and owed — rather
 * than collapsing into a single ambiguous "paid" state.
 *
 * Deliberately absent: any notion of a single "active schedule". Selecting one
 * winning schedule meant a bill could be masked entirely by an unrelated
 * schedule winning the race, and a schedule whose target cycle was missed could
 * hold the slot forever. Every bill now answers for itself, so nothing can be
 * hidden by something else's state.
 *
 * See docs/business-logic.md for the underlying domain rules.
 */

import { clampDayToMonth } from '#/features/bills/bills-helpers';
import type {
  BillInstance,
  BillWithSchedule,
} from '#/features/bills/bills-model';

/** Where a cycle stands. Ordered by urgency. */
export type OutlookStatus = 'OVERDUE' | 'DUE_NOW' | 'SCHEDULED' | 'PAID';

/** Which section of the dashboard a cycle sorts into. */
export type OutlookBucket = 'OVERDUE' | 'DUE_NOW' | 'THIS_MONTH' | 'NEXT_MONTH';

export type BillCycle = {
  /** Stable list key. A bill+cycle pair is unique by construction. */
  key: string;
  bill: BillWithSchedule;
  /** ISO date of the vendor deadline for this cycle. */
  cycleDueDate: string;
  /** ISO date the user intends to settle it. Equals `cycleDueDate` when unscheduled. */
  payByDate: string;
  status: OutlookStatus;
  bucket: OutlookBucket;
  isPaid: boolean;
  /** The ledger row that settled this cycle, when there is one. */
  paidInstance: BillInstance | null;
  /** `amountActual` when settled, otherwise `amountExpected`. Cents. */
  amountCents: number;
  /** Days past `cycleDueDate`. Zero unless `status` is `OVERDUE`. */
  daysLate: number;
};

export type OutlookTotals = {
  count: number;
  cents: number;
};

export type BillOutlook = {
  /** Every cycle in the horizon, urgency-ordered. Never filtered. */
  cycles: BillCycle[];
  byBucket: Record<OutlookBucket, BillCycle[]>;
  /** Unpaid cycles only, per bucket. */
  totals: Record<OutlookBucket, OutlookTotals>;
  /** Everything still owed across the whole horizon. */
  owed: OutlookTotals;
  /** Cycles settled within the horizon. */
  settled: OutlookTotals;
};

export const BUCKET_ORDER: OutlookBucket[] = [
  'OVERDUE',
  'DUE_NOW',
  'THIS_MONTH',
  'NEXT_MONTH',
];

/**
 * `THIS_MONTH` holds both settled cycles and ones not yet at their pay date, so
 * it can't claim to be "later" — by definition it contains the past.
 */
export const BUCKET_LABELS: Record<OutlookBucket, string> = {
  OVERDUE: 'Overdue',
  DUE_NOW: 'Pay now',
  THIS_MONTH: 'This month',
  NEXT_MONTH: 'Next month',
};

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const zero = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zero / 12), month: (zero % 12) + 1 };
}

/** Noon-anchored so DST transitions can't shift the calendar day. */
function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms = parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime();
  return Math.round(ms / 86_400_000);
}

export function toDateKey(date: Date): string {
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * The latest occurrence of `payDate` at or before `cycleDueDate`.
 *
 * A pay-ahead schedule (pay the 15th, bill due the 1st) resolves to the *previous*
 * month's 15th — which is the whole point of the feature: the September 1 cycle is
 * settled during the August 15 session.
 */
export function computePayByDate(
  cycleDueDate: string,
  payDate: number | null,
): string {
  if (payDate === null) return cycleDueDate;

  const [year, month, day] = cycleDueDate.split('-').map(Number) as [
    number,
    number,
    number,
  ];

  const sameMonth = clampDayToMonth(payDate, year, month);
  if (sameMonth <= day) return toIsoDate(year, month, sameMonth);

  const prev = addMonths(year, month, -1);
  return toIsoDate(
    prev.year,
    prev.month,
    clampDayToMonth(payDate, prev.year, prev.month),
  );
}

export function deriveCycleStatus(
  cycleDueDate: string,
  payByDate: string,
  todayKey: string,
  isPaid: boolean,
): OutlookStatus {
  if (isPaid) return 'PAID';
  if (todayKey > cycleDueDate) return 'OVERDUE';
  if (todayKey >= payByDate) return 'DUE_NOW';
  return 'SCHEDULED';
}

function bucketFor(
  status: OutlookStatus,
  cycleDueDate: string,
  todayYear: number,
  todayMonth: number,
): OutlookBucket {
  if (status === 'OVERDUE') return 'OVERDUE';
  if (status === 'DUE_NOW') return 'DUE_NOW';

  const [year, month] = cycleDueDate.split('-').map(Number) as [number, number];
  return year === todayYear && month === todayMonth
    ? 'THIS_MONTH'
    : 'NEXT_MONTH';
}

/**
 * A bill's schedule pay date, or `null` when it has none that counts.
 *
 * Orphaned bills (schedule archived) derive as unscheduled — matching the
 * existing rule that an archived schedule behaves like no schedule at all.
 */
export function effectivePayDate(bill: BillWithSchedule): number | null {
  if (bill.payScheduleId === null) return null;
  if (bill.isOrphaned) return null;
  return bill.schedulePayDate;
}

/**
 * Cycles for one bill inside the horizon: this month's occurrence and next
 * month's. Cycles that predate `bill.createdAt` are skipped — the bill didn't
 * exist then, so it isn't owed for them.
 */
export function cyclesForBill(
  bill: BillWithSchedule,
  instances: BillInstance[],
  today: Date,
): BillCycle[] {
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayKey = toDateKey(today);

  const createdAt = new Date(bill.createdAt);
  const createdKey = toDateKey(createdAt);

  const payDate = effectivePayDate(bill);
  const instanceByDueDate = new Map(instances.map(i => [i.dueDate, i]));

  const result: BillCycle[] = [];

  for (const offset of [0, 1]) {
    const { year, month } = addMonths(todayYear, todayMonth, offset);
    const day = clampDayToMonth(bill.dueDayOfMonth, year, month);
    const cycleDueDate = toIsoDate(year, month, day);

    if (cycleDueDate < createdKey) continue;

    const paidInstance = instanceByDueDate.get(cycleDueDate) ?? null;
    const isPaid = paidInstance !== null;
    const payByDate = computePayByDate(cycleDueDate, payDate);
    const status = deriveCycleStatus(cycleDueDate, payByDate, todayKey, isPaid);

    result.push({
      key: `${bill.id}:${cycleDueDate}`,
      bill,
      cycleDueDate,
      payByDate,
      status,
      bucket: bucketFor(status, cycleDueDate, todayYear, todayMonth),
      isPaid,
      paidInstance,
      amountCents: paidInstance?.amountActual ?? bill.amountExpected,
      daysLate: status === 'OVERDUE' ? daysBetween(cycleDueDate, todayKey) : 0,
    });
  }

  return result;
}

const STATUS_RANK: Record<OutlookStatus, number> = {
  OVERDUE: 0,
  DUE_NOW: 1,
  SCHEDULED: 2,
  PAID: 3,
};

function compareCycles(a: BillCycle, b: BillCycle): number {
  if (a.bucket !== b.bucket) {
    return BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket);
  }
  // Overdue reads worst-first; everything else reads soonest-first.
  if (a.bucket === 'OVERDUE' && a.cycleDueDate !== b.cycleDueDate) {
    return a.cycleDueDate < b.cycleDueDate ? -1 : 1;
  }
  if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
  if (a.payByDate !== b.payByDate) return a.payByDate < b.payByDate ? -1 : 1;
  if (a.cycleDueDate !== b.cycleDueDate) {
    return a.cycleDueDate < b.cycleDueDate ? -1 : 1;
  }
  if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) {
    return STATUS_RANK[a.status] - STATUS_RANK[b.status];
  }
  return a.bill.name.localeCompare(b.bill.name);
}

function emptyTotals(): OutlookTotals {
  return { count: 0, cents: 0 };
}

/**
 * Builds the full outlook. Pure — no filtering is applied anywhere, so every
 * active bill is represented by every one of its in-horizon cycles.
 */
export function buildBillOutlook(
  bills: BillWithSchedule[],
  instancesByBillId: Map<string, BillInstance[]>,
  today: Date,
): BillOutlook {
  const cycles: BillCycle[] = [];
  for (const bill of bills) {
    cycles.push(
      ...cyclesForBill(bill, instancesByBillId.get(bill.id) ?? [], today),
    );
  }
  cycles.sort(compareCycles);

  const byBucket: Record<OutlookBucket, BillCycle[]> = {
    OVERDUE: [],
    DUE_NOW: [],
    THIS_MONTH: [],
    NEXT_MONTH: [],
  };
  const totals: Record<OutlookBucket, OutlookTotals> = {
    OVERDUE: emptyTotals(),
    DUE_NOW: emptyTotals(),
    THIS_MONTH: emptyTotals(),
    NEXT_MONTH: emptyTotals(),
  };
  const owed = emptyTotals();
  const settled = emptyTotals();

  for (const cycle of cycles) {
    byBucket[cycle.bucket].push(cycle);

    if (cycle.isPaid) {
      settled.count += 1;
      settled.cents += cycle.amountCents;
      continue;
    }

    totals[cycle.bucket].count += 1;
    totals[cycle.bucket].cents += cycle.amountCents;
    owed.count += 1;
    owed.cents += cycle.amountCents;
  }

  return { cycles, byBucket, totals, owed, settled };
}

/**
 * Cycles belonging to one schedule tab. `'all'` is the identity filter — it
 * exists so the caller never has to special-case the default tab.
 */
export function filterCyclesBySchedule(
  cycles: BillCycle[],
  scheduleId: 'all' | 'unassigned' | (string & {}),
): BillCycle[] {
  if (scheduleId === 'all') return cycles;
  if (scheduleId === 'unassigned') {
    return cycles.filter(
      c => c.bill.payScheduleId === null || c.bill.isOrphaned,
    );
  }
  return cycles.filter(
    c => c.bill.payScheduleId === scheduleId && !c.bill.isOrphaned,
  );
}

/** What the attention banner announces. Overdue outranks due-now. */
export function summarizeAttention(outlook: BillOutlook): {
  count: number;
  cents: number;
  tone: 'overdue' | 'due-now' | 'clear';
} {
  const overdue = outlook.totals.OVERDUE;
  const dueNow = outlook.totals.DUE_NOW;

  if (overdue.count > 0) {
    return {
      count: overdue.count + dueNow.count,
      cents: overdue.cents + dueNow.cents,
      tone: 'overdue',
    };
  }
  if (dueNow.count > 0) {
    return { count: dueNow.count, cents: dueNow.cents, tone: 'due-now' };
  }
  return { count: 0, cents: 0, tone: 'clear' };
}
