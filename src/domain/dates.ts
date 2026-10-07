import type { LocalDate } from './types';

/**
 * Local calendar dates as `YYYY-MM-DD` strings.
 * Arithmetic runs in UTC so daylight saving changes can never shift a day.
 */

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function parse(date: LocalDate): DateParts {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function format({ year, month, day }: DateParts): LocalDate {
  const pad = (n: number, width: number) => String(n).padStart(width, '0');
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const { year, month, day } = parse(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return format({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

export function addMonthsClamped(date: LocalDate, months: number): LocalDate {
  const { year, month, day } = parse(date);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  return format({
    year: targetYear,
    month: targetMonth,
    day: Math.min(day, daysInMonth(targetYear, targetMonth)),
  });
}

export function monthStart(date: LocalDate): LocalDate {
  return format({ ...parse(date), day: 1 });
}

export function monthEnd(date: LocalDate): LocalDate {
  const { year, month } = parse(date);
  return format({ year, month, day: daysInMonth(year, month) });
}

export function dayOfMonth(date: LocalDate): number {
  return parse(date).day;
}

/** Inclusive on both ends; `YYYY-MM-DD` strings compare correctly as text. */
export function isWithin(date: LocalDate, from: LocalDate, to: LocalDate): boolean {
  return date >= from && date <= to;
}

/** Day 1 to the same day of the previous month, stopping at that month's last day. */
export function samePeriodPreviousMonth(today: LocalDate): { from: LocalDate; to: LocalDate } {
  const previous = addMonthsClamped(today, -1);
  return { from: monthStart(previous), to: previous };
}
