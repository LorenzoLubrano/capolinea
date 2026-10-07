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
