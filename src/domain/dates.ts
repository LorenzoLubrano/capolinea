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

/** The calendar day of a moment, on the phone's clock. */
export function toLocalDate(moment: Date): LocalDate {
  return format({ year: moment.getFullYear(), month: moment.getMonth() + 1, day: moment.getDate() });
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

/** Calendar days from `from` to `to`: 0 for the same day, negative when `to` comes first. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  const a = parse(from);
  const b = parse(to);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86400000);
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

/** 0 for Monday … 6 for Sunday. */
export function weekdayMondayFirst(date: LocalDate): number {
  const { year, month, day } = parse(date);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

/** The month as weeks of seven days, Monday first; days outside the month are `null`. */
export function monthGrid(firstOfMonth: LocalDate): (LocalDate | null)[][] {
  const { year, month } = parse(firstOfMonth);
  const cells: (LocalDate | null)[] = Array.from({ length: weekdayMondayFirst(format({ year, month, day: 1 })) }, () => null);
  for (let day = 1; day <= daysInMonth(year, month); day++) cells.push(format({ year, month, day }));
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}
