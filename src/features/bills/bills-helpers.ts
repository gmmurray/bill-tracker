import type { BillInstance } from '#/features/bills/bills-model';
import { ValidationError } from '#/lib/errors';

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

/**
 * Guards that a client-supplied `dueDate` names a real cycle of this bill.
 *
 * Every `dueDate` in the ledger must equal `clampDayToMonth(dueDayOfMonth, y, m)`
 * for some month — instances on any other date are invisible to state derivation
 * and show up as orphaned ledger rows. Cycles predating the bill are rejected for
 * the same reason the derivation walk skips them: the bill wasn't owed yet.
 */
export function assertCanonicalCycle(
  dueDate: string,
  dueDayOfMonth: number,
  createdAt: string,
): void {
  const [year, month, day] = dueDate.split('-').map(Number);
  if (!year || !month || !day) {
    throw new ValidationError('Invalid billing cycle date');
  }
  if (clampDayToMonth(dueDayOfMonth, year, month) !== day) {
    throw new ValidationError('That date is not a billing cycle for this bill');
  }

  const created = new Date(createdAt);
  const createdKey = isoDate(
    created.getFullYear(),
    created.getMonth() + 1,
    created.getDate(),
  );
  if (dueDate < createdKey) {
    throw new ValidationError('That cycle predates the bill');
  }
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
export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}
