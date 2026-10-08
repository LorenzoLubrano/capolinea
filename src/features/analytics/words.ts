import type { Bucket, PeriodUnit } from '@/domain/analysis';
import { it } from '@/i18n/it';
import { monthName, periodLabel, shortMonth } from '@/services/format/dates';
import { formatShare } from '@/services/format/numbers';

import type { Comparison } from './analysis';

/** Below this change the period reads as "in line with the usual". */
const IN_LINE = 0.05;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The comparison with the usual in words, which way it goes, and what the usual was. While the
 * period runs, the usual is "by this point": the same days of the previous periods.
 */
export function comparisonWords(
  comparison: Comparison | null,
  current: boolean,
  unit: PeriodUnit,
  money: (minor: number) => string,
): { text: string; usual: string; direction: 'up' | 'down' | 'flat' } | null {
  if (!comparison) return null;
  const { change, usualMinor } = comparison;
  const usual = current ? it.analytics.usual.usualSoFar(it.analytics.pointOf[unit], money(usualMinor)) : it.analytics.usual.usualWas(money(usualMinor));
  if (Math.abs(change) < IN_LINE) return { text: it.analytics.usual.inLine, usual, direction: 'flat' };
  const share = formatShare(Math.abs(change));
  return change > 0
    ? { text: capitalize(it.analytics.usual.more(share)), usual, direction: 'up' }
    : { text: capitalize(it.analytics.usual.less(share)), usual, direction: 'down' };
}

/** Under a trend bar: `ott` for months, `12 ott` for weeks, `O` for the months of a year. */
export function barLabel(bucket: Bucket, unit: PeriodUnit): string {
  if (unit === 'year') return monthName(bucket.from).charAt(0).toUpperCase();
  if (unit === 'month') return shortMonth(bucket.from);
  return `${Number(bucket.from.slice(8))} ${shortMonth(bucket.from)}`;
}

/** A trend bar in words: `Settembre` or `14–20 settembre`. */
export function barTitle(bucket: Bucket, unit: PeriodUnit): string {
  if (unit === 'week') return periodLabel({ unit: 'week', from: bucket.from, to: bucket.to });
  return capitalize(monthName(bucket.from));
}
