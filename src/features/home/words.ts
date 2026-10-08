import { it } from '@/i18n/it';
import { formatMultiple, formatPercent } from '@/services/format/numbers';

/** Below this change the month reads as the same as last month. */
const SAME = 0.005;
/** From double upwards a percentage stops meaning much: the words say how many times. */
const TIMES_FROM = 1;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The Home's comparison with the same day of last month, in words. */
export function comparisonLine(change: number | null, month: string): string {
  if (change === null) return it.home.comparison.none;
  if (Math.abs(change) < SAME) return it.home.comparison.same(month);
  if (change >= TIMES_FROM) return capitalize(it.home.comparison.times(formatMultiple(1 + change), month));
  return change < 0 ? it.home.comparison.less(formatPercent(change), month) : it.home.comparison.more(formatPercent(change), month);
}
