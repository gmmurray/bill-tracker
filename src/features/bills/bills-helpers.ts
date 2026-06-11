import type {
  Bill,
  BillInstance,
  BillState,
} from '#/features/bills/bills-model';

export function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

import type { PaySchedule } from '#/features/pay-schedules/pay-schedules-model';

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
