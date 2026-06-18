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
): string {
  const paidDates = new Set(existingInstances.map(i => i.dueDate));
  let year = today.getFullYear();
  let month = today.getMonth() + 1;

  for (;;) {
    const day = clampDayToMonth(dueDayOfMonth, year, month);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!paidDates.has(dateStr)) {
      return dateStr;
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

export function deriveBillState(
  bill: Pick<Bill, 'dueDayOfMonth' | 'payScheduleId'>,
  schedule: Pick<PaySchedule, 'anchorDay'> | null,
  instances: BillInstance[],
  today: Date,
): BillState {
  const nearestUnpaid = computeNearestUnpaidDueDate(
    bill.dueDayOfMonth,
    instances,
    today,
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
    const clampedAnchorDay = clampDayToMonth(
      schedule.anchorDay,
      todayYear,
      todayMonth,
    );
    if (todayDay > clampedAnchorDay) {
      return 'MISSED_SCHEDULE';
    }
  }

  return 'UPCOMING';
}

export function mostRecentPastSession(anchorDay: number, today: Date): Date {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const clampedThisMonth = clampDayToMonth(anchorDay, year, month);

  if (today.getDate() >= clampedThisMonth) {
    return new Date(year, month - 1, clampedThisMonth);
  }

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return new Date(
    prevYear,
    prevMonth - 1,
    clampDayToMonth(anchorDay, prevYear, prevMonth),
  );
}

export function nextFutureSession(anchorDay: number, today: Date): Date {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const clampedThisMonth = clampDayToMonth(anchorDay, year, month);

  if (today.getDate() < clampedThisMonth) {
    return new Date(year, month - 1, clampedThisMonth);
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return new Date(
    nextYear,
    nextMonth - 1,
    clampDayToMonth(anchorDay, nextYear, nextMonth),
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
    const past = mostRecentPastSession(schedule.anchorDay, today);
    const currentSession = isScheduleSessionComplete(
      scheduleBills,
      past,
      instancesByBillId,
    )
      ? nextFutureSession(schedule.anchorDay, today)
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
        schedule.anchorDay < bestSchedule.anchorDay ||
        (schedule.anchorDay === bestSchedule.anchorDay &&
          schedule.name < bestSchedule.name)
      ) {
        bestSchedule = schedule;
        bestSession = currentSession;
      }
    }
  }

  return bestSchedule;
}
