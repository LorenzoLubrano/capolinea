import type { CurrencyCode } from '@/domain/types';
import { it } from '@/i18n/it';

export interface MoneyFormatOptions {
  /** `expense` prefixes a true minus, `income` a plus. */
  sign?: 'none' | 'expense' | 'income';
  /** Round to whole units, for compact figures such as budget totals. */
  wholeUnits?: boolean;
  /** Privacy mode: hide the digits, keep the currency. */
  masked?: boolean;
  locale?: string;
}

const DEFAULT_LOCALE = 'it-IT';
const MINUS = '−';
const MASK = '••••';

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: string, currency: CurrencyCode, wholeUnits: boolean, display: 'symbol' | 'name') {
  const key = `${locale}|${currency}|${wholeUnits}|${display}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: display,
      ...(wholeUnits ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
    });
    formatters.set(key, cached);
  }
  return cached;
}

/**
 * Italian CLDR data leaves 4-digit numbers ungrouped (`1284,62`), while banking apps write `1.284,62`.
 * Digits are regrouped here with the locale's own separator, which also works where the engine
 * ignores `useGrouping: 'always'`.
 */
function groupedParts(nf: Intl.NumberFormat, value: number): string {
  const groupSeparator =
    nf.formatToParts(1_000_000).find((part) => part.type === 'group')?.value ?? '.';
  const parts = nf.formatToParts(value);
  const integer = parts
    .filter((part) => part.type === 'integer')
    .map((part) => part.value)
    .join('');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  let integerWritten = false;
  return parts
    .map((part) => {
      if (part.type === 'group') return '';
      if (part.type !== 'integer') return part.value;
      if (integerWritten) return '';
      integerWritten = true;
      return grouped;
    })
    .join('');
}

/** Formats integer minor units, e.g. 128462 EUR as `1.284,62 €`. */
export function formatMoney(minor: number, currency: CurrencyCode, options: MoneyFormatOptions = {}): string {
  const { sign = 'none', wholeUnits = false, masked = false, locale = DEFAULT_LOCALE } = options;
  const nf = formatter(locale, currency, wholeUnits, 'symbol');

  if (masked) {
    let maskWritten = false;
    return nf
      .formatToParts(0)
      .map((part) => {
        if (part.type === 'currency' || part.type === 'literal') return part.value;
        if (part.type === 'integer' && !maskWritten) {
          maskWritten = true;
          return MASK;
        }
        return '';
      })
      .join('');
  }

  const text = groupedParts(nf, Math.abs(minor) / 100);
  if (sign === 'expense' || (sign === 'none' && minor < 0)) return MINUS + text;
  if (sign === 'income') return `+${text}`;
  return text;
}

/** Which way a movement went, said before its amount. */
export type MoneyKind = 'expense' | 'income' | 'refund' | 'transfer';

/**
 * Text for screen readers: the currency is spelled out, hidden amounts are announced as hidden.
 * With `kind`, the direction comes first («uscita di 17,99 euro»), since a sign is not read.
 */
export function accessibleMoney(
  minor: number,
  currency: CurrencyCode,
  options: Pick<MoneyFormatOptions, 'masked' | 'locale'> & { kind?: MoneyKind } = {},
): string {
  const { masked = false, locale = DEFAULT_LOCALE, kind } = options;
  const amount = masked ? it.money.hidden : groupedParts(formatter(locale, currency, false, 'name'), Math.abs(minor) / 100);
  if (kind) return it.money.spoken[kind](amount);
  return minor < 0 && !masked ? `${MINUS}${amount}` : amount;
}

const HIDDEN_AMOUNT = new RegExp(String.raw`[${MINUS}+]?${MASK}(?:[\s\u00a0\u202f]*[^\s\d.,;:]{1,3})?`, 'g');

/** A visible text as a screen reader should say it: hidden amounts become «importo nascosto». */
export function speakable(text: string): string {
  return text.includes(MASK) ? text.replace(HIDDEN_AMOUNT, it.money.hidden) : text;
}
