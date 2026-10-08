import { it as strings } from '@/i18n/it';

const cache = new Map<string, Intl.NumberFormat>();

/** Absolute ratio as a percentage with one decimal: -0.124 becomes `12,4%`. The sign is said in words elsewhere. */
export function formatPercent(ratio: number, locale = 'it-IT'): string {
  let nf = cache.get(locale);
  if (!nf) {
    nf = new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
    cache.set(locale, nf);
  }
  return nf.format(Math.abs(ratio));
}

const multipleCache = new Map<string, Intl.NumberFormat>();
const MULTIPLE_CAP = 10;

/** How many times, for changes too large for a percentage: `2,3`, and from ten on `oltre 10`. */
export function formatMultiple(ratio: number, locale = 'it-IT'): string {
  if (ratio >= MULTIPLE_CAP) return strings.numbers.overTen;
  let nf = multipleCache.get(locale);
  if (!nf) {
    nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    multipleCache.set(locale, nf);
  }
  return nf.format(ratio);
}

const shareCache = new Map<string, Intl.NumberFormat>();

/** A share as a whole percentage: 0.234 becomes `23%`. A real share below 1% never reads as zero. */
export function formatShare(ratio: number, locale = 'it-IT'): string {
  if (ratio > 0 && ratio < 0.005) return strings.numbers.belowOnePercent;
  let nf = shareCache.get(locale);
  if (!nf) {
    nf = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
    shareCache.set(locale, nf);
  }
  return nf.format(ratio);
}
