import type {
  Bill,
  BillInstance,
  BillState,
} from '#/features/bills/bills-model';
import type { PaySchedule } from '#/features/pay-schedules/pay-schedules-model';

export function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

export function formatDueLabel(dayOfMonth: number): string {
  return `Due the ${formatOrdinal(dayOfMonth)}`;
}

export function formatPayDateLabel(payDate: number): string {
  return `Pay date ${formatOrdinal(payDate)}`;
}

export function clampDayToMonth(
  day: number,
  year: number,
  month: number,
): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Math.min(daysInMonth, day);
}

export function computeNearestUnpaidDueDate(
  dueDayOfMonth: number,
  existingInstances: BillInstance[],
  today: Date,
  createdAt?: Date,
): string {
  const paidDates = new Set(existingInstances.map(i => i.dueDate));
  const createdAtDateStr = createdAt
    ? isoDate(
        createdAt.getFullYear(),
        createdAt.getMonth() + 1,
        createdAt.getDate(),
      )
    : null;
  let year = today.getFullYear();
  let month = today.getMonth() + 1;

  for (;;) {
    const day = clampDayToMonth(dueDayOfMonth, year, month);
    const dateStr = isoDate(year, month, day);
    const predatesBill =
      createdAtDateStr !== null && dateStr < createdAtDateStr;
    if (!predatesBill && !paidDates.has(dateStr)) {
      return dateStr;
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function computeEligibleHistoricalCycles(
  dueDayOfMonth: number,
  existingInstances: BillInstance[],
  today: Date,
  createdAt: Date,
): string[] {
  const paid = new Set(existingInstances.map(i => i.dueDate));
  const createdStr = isoDate(
    createdAt.getFullYear(),
    createdAt.getMonth() + 1,
    createdAt.getDate(),
  );
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  const result: string[] = [];
  let year = createdAt.getFullYear();
  let month = createdAt.getMonth() + 1;

  while (year < todayYear || (year === todayYear && month <= todayMonth)) {
    const day = clampDayToMonth(dueDayOfMonth, year, month);
    const dateStr = isoDate(year, month, day);
    if (dateStr >= createdStr && !paid.has(dateStr)) {
      result.push(dateStr);
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

export function computeExtendedHistoricalCycle(
  dueDayOfMonth: number,
  existingInstances: BillInstance[],
): string | null {
  if (existingInstances.length === 0) return null;
  const oldest = existingInstances.reduce((min, i) =>
    i.dueDate < min.dueDate ? i : min,
  );
  const [year, month] = oldest.dueDate.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const day = clampDayToMonth(dueDayOfMonth, prevYear, prevMonth);
  return isoDate(prevYear, prevMonth, day);
}

export function deriveBillState(
  bill: Pick<Bill, 'dueDayOfMonth' | 'payScheduleId' | 'createdAt'>,
  schedule: Pick<PaySchedule, 'payDate'> | null,
  instances: BillInstance[],
  today: Date,
): BillState {
  const nearestUnpaid = computeNearestUnpaidDueDate(
    bill.dueDayOfMonth,
    instances,
    today,
    new Date(bill.createdAt),
  );
  const [npYear, npMonth] = nearestUnpaid.split('-').map(Number);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  if (npYear > todayYear || (npYear === todayYear && npMonth > todayMonth)) {
    return 'PAID';
  }

  const clampedDueDay = clampDayToMonth(
    bill.dueDayOfMonth,
    todayYear,
    todayMonth,
  );

  if (todayDay > clampedDueDay) {
    return 'OVERDUE';
  }

  if (schedule !== null) {
    const clampedPayDate = clampDayToMonth(
      schedule.payDate,
      todayYear,
      todayMonth,
    );
    if (todayDay > clampedPayDate) {
      return 'MISSED_SCHEDULE';
    }
  }

  return 'UPCOMING';
}

/**
 * Predicate: does this bill currently owe for some cycle on or before today?
 *
 * "Owed" = state is anything but PAID. Used to distinguish bills that need
 * user action this month from bills that don't (paid this month, paid ahead,
 * skip-PAID, etc.). Thin wrapper around `deriveBillState` exposed for
 * call-site clarity and direct testing.
 */
export function isOwedThisMonth(
  bill: Pick<Bill, 'dueDayOfMonth' | 'payScheduleId' | 'createdAt'>,
  schedule: Pick<PaySchedule, 'payDate'> | null,
  instances: BillInstance[],
  today: Date,
): boolean {
  return deriveBillState(bill, schedule, instances, today) !== 'PAID';
}

/**
 * Computes the four Row-2 donut numbers (count and dollars, paid and total).
 *
 * Scope: calendar-month. A bill is included in `total*` iff either it has an
 * instance whose `dueDate` falls in the current month, OR it's currently owed
 * (state is not PAID). This filter excludes "skip-PAID" bills — bills added
 * mid-month whose first owed cycle is in a future month — so newly-added bills
 * don't drag the donut backwards.
 *
 * `paidCents` uses `amountActual` from current-month instances (real money paid).
 * `paidCount` is unique bill IDs with a current-month instance.
 */
export function computeMonthDonutMetrics(
  bills: Pick<
    Bill,
    'id' | 'dueDayOfMonth' | 'payScheduleId' | 'createdAt' | 'amountExpected'
  >[],
  schedules: Pick<PaySchedule, 'id' | 'payDate'>[],
  instancesByBillId: Map<string, BillInstance[]>,
  today: Date,
): {
  paidCount: number;
  totalCount: number;
  paidCents: number;
  totalCents: number;
} {
  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-`;
  const paidBillIds = new Set<string>();
  let paidCents = 0;
  for (const [billId, billInstances] of instancesByBillId) {
    for (const instance of billInstances) {
      if (instance.dueDate.startsWith(monthPrefix)) {
        paidBillIds.add(billId);
        paidCents += instance.amountActual;
      }
    }
  }

  const relevant = bills.filter(bill => {
    if (paidBillIds.has(bill.id)) return true;
    const schedule = schedules.find(s => s.id === bill.payScheduleId) ?? null;
    const instances = instancesByBillId.get(bill.id) ?? [];
    return isOwedThisMonth(bill, schedule, instances, today);
  });

  return {
    paidCount: paidBillIds.size,
    totalCount: relevant.length,
    paidCents,
    totalCents: relevant.reduce((s, b) => s + b.amountExpected, 0),
  };
}

export function mostRecentPastSession(payDate: number, today: Date): Date {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const clampedThisMonth = clampDayToMonth(payDate, year, month);

  if (today.getDate() >= clampedThisMonth) {
    return new Date(year, month - 1, clampedThisMonth);
  }

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return new Date(
    prevYear,
    prevMonth - 1,
    clampDayToMonth(payDate, prevYear, prevMonth),
  );
}

export function nextFutureSession(payDate: number, today: Date): Date {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const clampedThisMonth = clampDayToMonth(payDate, year, month);

  if (today.getDate() < clampedThisMonth) {
    return new Date(year, month - 1, clampedThisMonth);
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return new Date(
    nextYear,
    nextMonth - 1,
    clampDayToMonth(payDate, nextYear, nextMonth),
  );
}

export function targetDueDateForSession(
  dueDayOfMonth: number,
  sessionDate: Date,
): string {
  const year = sessionDate.getFullYear();
  const month = sessionDate.getMonth() + 1;
  const sessionDay = sessionDate.getDate();

  const clampedFirst = clampDayToMonth(dueDayOfMonth, year, month);
  if (clampedFirst >= sessionDay) {
    return `${year}-${String(month).padStart(2, '0')}-${String(clampedFirst).padStart(2, '0')}`;
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const clampedNext = clampDayToMonth(dueDayOfMonth, nextYear, nextMonth);
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(clampedNext).padStart(2, '0')}`;
}

export function isScheduleSessionComplete(
  bills: Pick<Bill, 'id' | 'dueDayOfMonth'>[],
  sessionDate: Date,
  instancesByBillId: Map<string, BillInstance[]>,
): boolean {
  for (const bill of bills) {
    const target = targetDueDateForSession(bill.dueDayOfMonth, sessionDate);
    const instances = instancesByBillId.get(bill.id) ?? [];
    if (!instances.some(i => i.dueDate === target)) return false;
  }
  return true;
}

export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function selectActiveSchedule(
  schedules: PaySchedule[],
  bills: Pick<Bill, 'id' | 'dueDayOfMonth' | 'payScheduleId'>[],
  instancesByBillId: Map<string, BillInstance[]>,
  today: Date,
): PaySchedule | null {
  const active = schedules.filter(s => s.isActive);
  if (active.length === 0) return null;

  let bestSchedule: PaySchedule | null = null;
  let bestSession: Date | null = null;

  for (const schedule of active) {
    const scheduleBills = bills.filter(b => b.payScheduleId === schedule.id);
    const past = mostRecentPastSession(schedule.payDate, today);
    const currentSession = isScheduleSessionComplete(
      scheduleBills,
      past,
      instancesByBillId,
    )
      ? nextFutureSession(schedule.payDate, today)
      : past;

    if (bestSchedule === null) {
      bestSchedule = schedule;
      bestSession = currentSession;
      continue;
    }

    const diff = currentSession.getTime() - bestSession!.getTime();
    if (diff < 0) {
      bestSchedule = schedule;
      bestSession = currentSession;
    } else if (diff === 0) {
      if (
        schedule.payDate < bestSchedule.payDate ||
        (schedule.payDate === bestSchedule.payDate &&
          schedule.name < bestSchedule.name)
      ) {
        bestSchedule = schedule;
        bestSession = currentSession;
      }
    }
  }

  return bestSchedule;
}
