import type { Period } from '@/domain/analysis';
import { addDays } from '@/domain/dates';
import type { LocalDate } from '@/domain/types';
import { it as strings } from '@/i18n/it';

const DEFAULT_LOCALE = 'it-IT';

/** Local dates are formatted at noon UTC so no time zone can move them to another day. */
function toDate(date: LocalDate): Date {
  return new Date(`${date}T12:00:00Z`);
}

const cache = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let cached = cache.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
    cache.set(key, cached);
  }
  return cached;
}

export function monthName(date: LocalDate, locale = DEFAULT_LOCALE): string {
  return formatter(locale, { month: 'long' }).format(toDate(date));
}

/** `22 ott` */
export function shortDate(date: LocalDate, locale = DEFAULT_LOCALE): string {
  return formatter(locale, { day: 'numeric', month: 'short' }).format(toDate(date)).replace('.', '');
}

/** `Oggi`, `Ieri`, or `Martedì 20 ottobre`. */
export function dayLabel(date: LocalDate, today: LocalDate, locale = DEFAULT_LOCALE): string {
  if (date === today) return strings.dates.today;
  if (date === addDays(today, -1)) return strings.dates.yesterday;
  const text = formatter(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(toDate(date));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The twelve month names, January first, for search ("settembre"). */
export function monthNames(locale = DEFAULT_LOCALE): string[] {
  return Array.from({ length: 12 }, (_, i) => monthName(`2026-${String(i + 1).padStart(2, '0')}-15`, locale));
}

/** `Martedì 20 ottobre 2026` */
export function fullDate(date: LocalDate, locale = DEFAULT_LOCALE): string {
  const text = formatter(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(date));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `Ottobre 2026` */
export function monthYear(date: LocalDate, locale = DEFAULT_LOCALE): string {
  const text = formatter(locale, { month: 'long', year: 'numeric' }).format(toDate(date));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `ott`: for chart labels. */
export function shortMonth(date: LocalDate, locale = DEFAULT_LOCALE): string {
  return formatter(locale, { month: 'short' }).format(toDate(date)).replace('.', '');
}

/** `lunedì` for 0 … `domenica` for 6. */
export function weekdayName(index: number, locale = DEFAULT_LOCALE): string {
  // 2026-10-19 is a Monday.
  return formatter(locale, { weekday: 'long' }).format(toDate(addDays('2026-10-19', index)));
}

/** `19–25 ottobre`, `28 settembre – 4 ottobre`, `Ottobre 2026`, `2026`. */
export function periodLabel(period: Period, locale = DEFAULT_LOCALE): string {
  if (period.unit === 'year') return period.from.slice(0, 4);
  if (period.unit === 'month') return monthYear(period.from, locale);
  const day = (date: LocalDate) => Number(date.slice(8));
  if (period.from.slice(0, 7) === period.to.slice(0, 7)) return `${day(period.from)}–${day(period.to)} ${monthName(period.to, locale)}`;
  if (period.from.slice(0, 4) === period.to.slice(0, 4)) {
    return `${day(period.from)} ${monthName(period.from, locale)} – ${day(period.to)} ${monthName(period.to, locale)}`;
  }
  const withYear = (date: LocalDate) => `${day(date)} ${monthName(date, locale)} ${date.slice(0, 4)}`;
  return `${withYear(period.from)} – ${withYear(period.to)}`;
}
