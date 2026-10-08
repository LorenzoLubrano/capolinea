import { addDays, addMonthsClamped, daysBetween, isWithin, monthEnd, monthStart, weekdayMondayFirst } from './dates';
import { normalizeText } from './search';
import { spendingImpact, spendingBetween, type SpendingOptions } from './spending';
import type { Id, LocalDate, Transaction } from './types';

/** How the analysis slices time. */
export type PeriodUnit = 'week' | 'month' | 'year';
/** How a chart slices a range. */
export type BucketUnit = 'day' | 'week' | 'month';

export interface Period {
  unit: PeriodUnit;
  from: LocalDate;
  to: LocalDate;
}

type Options = Omit<SpendingOptions, 'categoryId'>;

function weekStart(date: LocalDate): LocalDate {
  return addDays(date, -weekdayMondayFirst(date));
}

/** The week (Monday to Sunday), month or year containing `date`, moved by `offset` periods. */
export function periodAt(unit: PeriodUnit, date: LocalDate, offset = 0): Period {
  if (unit === 'week') {
    const from = addDays(weekStart(date), offset * 7);
    return { unit, from, to: addDays(from, 6) };
  }
  if (unit === 'month') {
    const from = addMonthsClamped(monthStart(date), offset);
    return { unit, from, to: monthEnd(from) };
  }
  const year = Number(date.slice(0, 4)) + offset;
  return { unit, from: `${year}-01-01`, to: `${year}-12-31` };
}

/** Recurring and subscription charges are fixed: habits and big purchases are about everything else. */
export function isVariable(tx: Transaction): boolean {
  return !tx.isRecurring && !tx.subscriptionId;
}

export interface Bucket {
  from: LocalDate;
  to: LocalDate;
  /** Spending up to today. */
  spentMinor: number;
  /** The bucket ended before today. */
  complete: boolean;
  /** The bucket starts after today. */
  future: boolean;
}

function bucketEnd(start: LocalDate, unit: BucketUnit): LocalDate {
  if (unit === 'day') return start;
  if (unit === 'week') return addDays(weekStart(start), 6);
  return monthEnd(start);
}

/**
 * Spending in consecutive buckets that tile the range: aligned to the unit (weeks start on Monday)
 * and clipped to the range. Only movements up to today count.
 */
export function spendingSeries(
  txs: Transaction[],
  range: { from: LocalDate; to: LocalDate },
  unit: BucketUnit,
  today: LocalDate,
  options: Options,
): Bucket[] {
  const daily = new Map<LocalDate, number>();
  const last = range.to < today ? range.to : today;
  for (const tx of txs) {
    if (tx.currency !== options.currency || !isWithin(tx.date, range.from, last)) continue;
    const impact = spendingImpact(tx, options.meId);
    if (impact !== 0) daily.set(tx.date, (daily.get(tx.date) ?? 0) + impact);
  }

  const buckets: Bucket[] = [];
  for (let from = range.from; from <= range.to; ) {
    const end = bucketEnd(from, unit);
    const to = end < range.to ? end : range.to;
    let spentMinor = 0;
    for (let day = from; day <= to && day <= today; day = addDays(day, 1)) spentMinor += daily.get(day) ?? 0;
    buckets.push({ from, to, spentMinor, complete: to < today, future: from > today });
    from = addDays(to, 1);
  }
  return buckets;
}

export function firstMovementDate(txs: Transaction[]): LocalDate | null {
  return txs.reduce<LocalDate | null>((first, tx) => (!tx.deletedAt && (first === null || tx.date < first) ? tx.date : first), null);
}

/** The middle value; with an even count, the mean of the two middle ones. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * What the user usually spends by this point of a period: the median of the previous `count`
 * periods over the same number of days (whole periods once the period is over). The median keeps a
 * single heavy period (the week with the rent) from setting "the usual". Periods before the first
 * movement do not count; null when there is nothing to compare with.
 */
export function typicalSpending(
  txs: Transaction[],
  period: Period,
  today: LocalDate,
  count: number,
  options: SpendingOptions,
): number | null {
  const first = firstMovementDate(txs);
  if (!first) return null;
  const over = period.to < today;
  const elapsed = daysBetween(period.from, today);
  const totals: number[] = [];
  for (let i = 1; i <= count; i++) {
    const previous = periodAt(period.unit, period.from, -i);
    if (previous.to < first) break;
    const sameDay = addDays(previous.from, elapsed);
    const to = over || sameDay > previous.to ? previous.to : sameDay;
    totals.push(spendingBetween(txs, previous.from, to, options));
  }
  return totals.length ? Math.round(median(totals)) : null;
}

/** The usual line of a chart: the median of the complete buckets since the first movement. */
export function usualLevel(buckets: Bucket[], firstMovement: LocalDate | null): number | null {
  const counted = buckets.filter((b) => b.complete && firstMovement !== null && b.to >= firstMovement);
  return counted.length ? Math.round(median(counted.map((b) => b.spentMinor))) : null;
}

export interface DayHabits {
  /** Average spending per weekday, Monday first; null for a weekday with no past day yet. */
  weekdayAverages: (number | null)[];
  /** Past days without spending. */
  zeroDays: number;
  /** Past days counted, from the first movement up to today. */
  pastDays: number;
}

/** Weekday habits over day buckets; days after today or before the first movement are left out. */
export function dayHabits(days: Bucket[], firstMovement: LocalDate | null): DayHabits {
  const totals = Array.from({ length: 7 }, () => 0);
  const counts = Array.from({ length: 7 }, () => 0);
  let zeroDays = 0;
  let pastDays = 0;
  for (const day of days) {
    if (day.future || firstMovement === null || day.from < firstMovement) continue;
    const weekday = weekdayMondayFirst(day.from);
    totals[weekday] += day.spentMinor;
    counts[weekday] += 1;
    pastDays += 1;
    if (day.spentMinor <= 0) zeroDays += 1;
  }
  return {
    weekdayAverages: totals.map((total, i) => (counts[i] ? Math.round(total / counts[i]) : null)),
    zeroDays,
    pastDays,
  };
}

/** The step of a fixed ramp an amount falls on: 0 for nothing, then one step per threshold passed. */
export function magnitudeLevel(minor: number, thresholds: number[]): number {
  if (minor <= 0) return 0;
  return 1 + thresholds.filter((threshold) => minor >= threshold).length;
}

/** Merchants are free text: "Caffè Nero" and "caffe nero " are the same place. */
export function merchantKey(name: string): string {
  return normalizeText(name.trim());
}

export interface MerchantSpending {
  key: string;
  /** The spelling of the latest purchase. */
  name: string;
  spentMinor: number;
  /** Purchases; refunds lower the total but are not purchases. */
  count: number;
  /** Category of the latest purchase. */
  categoryId?: Id;
  lastDate: LocalDate;
}

/** Spending per merchant in the range, largest first. Merchants that net to zero or less are dropped. */
export function spendingByMerchant(txs: Transaction[], from: LocalDate, to: LocalDate, options: Options): MerchantSpending[] {
  const merchants = new Map<string, MerchantSpending>();
  for (const tx of txs) {
    if (!tx.merchant?.trim() || tx.currency !== options.currency || !isWithin(tx.date, from, to)) continue;
    const impact = spendingImpact(tx, options.meId);
    if (impact === 0) continue;
    const key = merchantKey(tx.merchant);
    const entry = merchants.get(key) ?? { key, name: tx.merchant.trim(), spentMinor: 0, count: 0, lastDate: '' };
    entry.spentMinor += impact;
    if (tx.type === 'expense') {
      entry.count += 1;
      if (tx.date >= entry.lastDate) {
        entry.name = tx.merchant.trim();
        entry.categoryId = tx.categoryId;
        entry.lastDate = tx.date;
      }
    }
    merchants.set(key, entry);
  }
  return [...merchants.values()]
    .filter((m) => m.spentMinor > 0 && m.count > 0)
    .sort((a, b) => b.spentMinor - a.spentMinor || a.name.localeCompare(b.name));
}

/** The biggest expenses of the range by the user's share. */
export function largestExpenses(
  txs: Transaction[],
  from: LocalDate,
  to: LocalDate,
  options: Options,
  limit: number,
): { tx: Transaction; amountMinor: number }[] {
  return txs
    .filter((tx) => tx.type === 'expense' && tx.currency === options.currency && isWithin(tx.date, from, to))
    .map((tx) => ({ tx, amountMinor: spendingImpact(tx, options.meId) }))
    .filter((entry) => entry.amountMinor > 0)
    .sort((a, b) => b.amountMinor - a.amountMinor || b.tx.date.localeCompare(a.tx.date))
    .slice(0, limit);
}
